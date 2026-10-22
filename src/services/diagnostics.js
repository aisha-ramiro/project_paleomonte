import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { flushDiagnosticEvents, readLocalDiagnosticEvents, subscribeDiagnosticEvents, acknowledgeLocalDiagnosticEvent } from './diagnosticEvents';
import { buildDiagnosticCards, mergeDiagnosticEvents } from './diagnosticModel';

const timeout = () => AbortSignal.timeout(10000);
async function bounded(task) {
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(task), new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error('timeout')), 22000); })]);
  } finally { window.clearTimeout(timer); }
}

export function useDiagnostics(roles) {
  const isAdmin = roles.includes('admin');
  const [snapshot, setSnapshot] = useState(null);
  const [provider, setProvider] = useState(null);
  const [checks, setChecks] = useState({});
  const [localEvents, setLocalEvents] = useState(readLocalDiagnosticEvents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [checkedAt, setCheckedAt] = useState(null);
  const busy = useRef(false);
  const alive = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    if (!navigator.onLine) { setLoading(false); setError('Sem conexão. Reconecte para atualizar as verificações.'); return; }
    busy.current = true;
    setLoading(true);
    const tasks = [
      () => supabase.rpc('get_application_diagnostics').abortSignal(timeout()),
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('unauthorized');
        const response = await fetch('/api/diagnostics', { headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error('provider-unavailable');
        const data = await response.json();
        if (!data?.translation) throw new Error('invalid-response');
        return data;
      },
      () => supabase.from('specimens').select('id').eq('status', 'published').limit(1).abortSignal(timeout()),
      () => supabase.storage.from('museum-media').list('', { limit: 1 }),
      () => isAdmin ? supabase.functions.invoke('admin-users', { body: { action: 'health' }, timeout: 10000 }) : Promise.resolve({ restricted: true }),
    ];
    // Cada serviço conclui separadamente; uma falha não apaga os outros resultados.
    const results = await Promise.allSettled(tasks.map(bounded));
    if (alive.current) {
      const snapshotResult = results[0];
      const snapshotData = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null;
      if (snapshotData?.data && !snapshotData.error) {
        setSnapshot(snapshotData.data); setError('');
      } else {
        setSnapshot(null);
        setError(['PGRST202', '42883', '42P01'].includes(snapshotData?.error?.code)
          ? 'O diagnóstico do banco ainda precisa ser ativado pela equipe responsável. As outras verificações continuam disponíveis.'
          : 'Não foi possível atualizar os dados do banco. Confira a conexão e tente novamente.');
      }
      setProvider(results[1].status === 'fulfilled' ? results[1].value : { translation: { state: 'unknown', message: 'A consulta de cota não respondeu. Solicite a verificação do serviço de diagnóstico no servidor.' } });
      const nextChecks = {};
      for (const [index, name] of [[2, 'catalog'], [3, 'storage'], [4, 'users']]) {
        const result = results[index];
        const value = result.status === 'fulfilled' ? result.value : null;
        if (value?.restricted) nextChecks[name] = { state: 'info', message: 'A verificação deste serviço está disponível para administradores.' };
        else if (result.status === 'rejected' || value?.error || (name === 'users' && value?.data?.ok !== true)) nextChecks[name] = { state: 'warning', message: name === 'users' ? 'Não foi possível confirmar o serviço. A função de usuários pode precisar de atualização; nenhum convite foi enviado.' : 'O serviço não concluiu o teste de leitura. Confira sua conexão e tente novamente.' };
        else nextChecks[name] = { state: 'ok', message: name === 'catalog' ? 'A leitura dos registros publicados respondeu. O teste não verifica todas as páginas e imagens.' : name === 'storage' ? 'O armazenamento respondeu à consulta da equipe. O teste não envia arquivos nem verifica todas as fotos públicas.' : 'O serviço de usuários respondeu. Este teste não confirma a entrega de e-mails.' };
      }
      setChecks(Object.fromEntries(Object.entries(nextChecks).map(([key, value]) => [key, { ...value, checkedAt: new Date().toISOString() }])));
      setCheckedAt(new Date().toISOString());
      setLoading(false);
    }
    busy.current = false;
    void flushDiagnosticEvents();
  }, [isAdmin]);

  useEffect(() => {
    alive.current = true;
    const updateConnection = () => { setOnline(navigator.onLine); if (navigator.onLine) void refresh(); };
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const unsubscribe = subscribeDiagnosticEvents(() => setLocalEvents(readLocalDiagnosticEvents()));
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    document.addEventListener('visibilitychange', onVisible);
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => {
      alive.current = false; unsubscribe(); window.clearInterval(timer);
      window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const acknowledge = async (event) => {
    if (event.origin === 'shared') {
      const { data, error: updateError } = await supabase.rpc('acknowledge_diagnostic_event', { p_source: event.source, p_code: event.code, p_last_seen: event.last_seen }).abortSignal(timeout());
      if (updateError || !data) throw new Error('Não foi possível marcar o aviso. Atualize o diagnóstico e tente novamente.');
      setSnapshot((current) => current ? { ...current, events: current.events.map((item) => item.source === event.source && item.code === event.code && item.last_seen === event.last_seen ? { ...item, acknowledged_at: new Date().toISOString() } : item) } : current);
    }
    acknowledgeLocalDiagnosticEvent(event.source, event.code, event.last_seen);
  };

  const cards = buildDiagnosticCards(snapshot, provider, checks);
  const events = mergeDiagnosticEvents(snapshot?.events, localEvents);
  const alerts = cards.filter((card) => card.state === 'warning' || card.state === 'critical');
  const unread = events.filter((event) => !event.acknowledged_at);
  return { snapshot, provider, cards, events, alerts, unread, loading, error, online, checkedAt, refresh, acknowledge, isAdmin };
}
