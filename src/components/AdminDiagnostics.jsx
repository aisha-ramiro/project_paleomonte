import { useState } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, CircleHelp, ExternalLink, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diagnosticCodes, diagnosticSources, formatDiagnosticNumber } from '../services/diagnosticModel';
import './admin-diagnostics.css';

const stateLabels = { ok: 'Em dia', warning: 'Atenção', critical: 'Crítico', unknown: 'Verificação pendente', info: 'Acesso restrito' };
const formatDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : 'Ainda sem leitura';

function ResourceCard({ card }) {
  const hasUsage = card.used != null;
  const percent = hasUsage && card.limit > 0 ? Number(card.used) / Number(card.limit) * 100 : null;
  return <article className={`diagnostic-card state-${card.state}`}>
    <div className="diagnostic-card-head"><h3>{card.title}</h3><span className={`diagnostic-status state-${card.state}`}>{stateLabels[card.state] ?? stateLabels.unknown}</span></div>
    {hasUsage ? <><p className="diagnostic-value">{formatDiagnosticNumber(card.used, card.unit)}{card.suffix && <small>{card.suffix}</small>}</p><p className="diagnostic-limit">{card.limit == null ? 'Limite de referência não informado' : `de ${formatDiagnosticNumber(card.limit, card.unit)}${card.suffix ? ` ${card.suffix}` : ''}`}{percent != null && <b>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percent)}%</b>}</p>{percent != null && <div className="diagnostic-progress" role="progressbar" aria-label={`Uso de ${card.title}`} aria-valuenow={Math.min(100, Math.max(0, percent))} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${Math.round(percent)}% do limite informado`}><span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/></div>}</> : <p className="diagnostic-value diagnostic-value-text">{card.state === 'ok' ? 'Respondeu ao teste' : card.state === 'info' ? 'Somente administrador' : 'Sem medição confirmada'}</p>}
    <p className="diagnostic-card-detail">{card.detail}</p>
    {(card.state === 'warning' || card.state === 'critical') && <div className="diagnostic-action"><b>O que fazer</b><p>{card.action}</p></div>}
    <footer><span>{card.source}</span>{card.checkedAt && <span>Leitura: {formatDate(card.checkedAt)}</span>}{card.href && <a href={card.href} target="_blank" rel="noopener noreferrer">Conferir no provedor <ExternalLink size={13} aria-hidden="true"/><span className="sr-only"> (abre em nova aba)</span></a>}</footer>
  </article>;
}

const numericFields = [
  ['database_limit_bytes', 'Limite do banco (MB)', 1e6], ['storage_limit_bytes', 'Limite de arquivos (GB)', 1e9],
  ['access_monthly_limit', 'Alerta de acessos por mês', 1], ['hosting_request_limit', 'Limite de requisições na hospedagem', 1],
  ['hosting_request_used', 'Requisições consumidas no período', 1], ['hosting_transfer_limit_bytes', 'Limite de transferência (GB)', 1e9],
  ['hosting_transfer_used_bytes', 'Transferência consumida no período (GB)', 1e9],
];

function DiagnosticSettings({ settings, onSaved }) {
  const [values, setValues] = useState(() => ({
    ...Object.fromEntries(numericFields.map(([key, , divisor]) => [key, settings[key] == null ? '' : String(settings[key] / divisor)])),
    hosting_period_start: settings.hosting_period_start ?? '', hosting_period_end: settings.hosting_period_end ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const update = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setMessage(''); };
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    const payload = { hosting_period_start: values.hosting_period_start || null, hosting_period_end: values.hosting_period_end || null };
    for (const [key, , divisor] of numericFields) {
      const amount = values[key] === '' ? null : Number(values[key]);
      const converted = amount == null ? null : Math.round(amount * divisor);
      if (converted != null && (!Number.isSafeInteger(converted) || (key.includes('_used') ? converted < 0 : converted <= 0))) { setError('Confira os valores. Informe limites maiores que zero e consumos iguais ou maiores que zero.'); return; }
      payload[key] = converted;
    }
    const hasUsage = payload.hosting_request_used != null || payload.hosting_transfer_used_bytes != null;
    if (hasUsage && (!payload.hosting_period_start || !payload.hosting_period_end || payload.hosting_period_start > payload.hosting_period_end)) { setError('Informe o início e o fim do período mostrado no provedor para registrar o consumo da hospedagem.'); return; }
    setSaving(true);
    try {
      const { error: saveError } = await supabase.rpc('save_diagnostic_settings', { p_settings: payload }).abortSignal(AbortSignal.timeout(10000));
      if (saveError) throw saveError;
      setMessage('Referências salvas. Os quadros serão atualizados.');
      await onSaved();
    } catch { setError('Não foi possível salvar. Confirme que o diagnóstico foi ativado e que sua conta é de administrador.'); }
    finally { setSaving(false); }
  };
  return <details className="diagnostic-settings"><summary>Limites de referência e leitura da hospedagem</summary><form className="admin-form" onSubmit={submit}>
    <p className="diagnostic-explanation">Copie os limites do plano atual nos provedores. Deixe em branco o que ainda não foi confirmado. Esses valores orientam os alertas; não alteram planos nem bloqueiam acessos. O alerta de acessos é uma referência interna da equipe.</p>
    <div className="diagnostic-settings-grid">{numericFields.map(([key, label, divisor]) => <label key={key}>{label}<input type="number" min={key.includes('_used') ? '0' : divisor === 1 ? '1' : '0.001'} step={divisor === 1 ? '1' : 'any'} value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder="Não informado"/></label>)}</div>
    <fieldset><legend>Período do consumo da hospedagem</legend><p className="diagnostic-explanation">Na Vercel, abra Usage e copie consumo e limites do mesmo período e escopo. A leitura abaixo precisa ser atualizada manualmente; após 24 horas ou fora do período, os quadros pedem nova conferência. Alterar qualquer referência com os consumos preenchidos confirma novamente essa leitura.</p><div className="diagnostic-settings-grid"><label>Início do período<input type="date" value={values.hosting_period_start} max={values.hosting_period_end || undefined} onChange={(event) => update('hosting_period_start', event.target.value)}/></label><label>Fim do período<input type="date" value={values.hosting_period_end} min={values.hosting_period_start || undefined} onChange={(event) => update('hosting_period_end', event.target.value)}/></label></div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button type="submit" className="button green" disabled={saving}>{saving ? 'Salvando…' : 'Salvar referências e confirmar leitura'}</button>
  </form></details>;
}

export default function AdminDiagnostics({ diagnostics }) {
  const { cards, events, alerts, unread, loading, error, online, checkedAt, refresh, acknowledge, isAdmin, snapshot } = diagnostics;
  const [showRead, setShowRead] = useState(false);
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const pending = cards.filter((card) => card.state === 'unknown').length;
  const critical = alerts.some((card) => card.state === 'critical') || !online;
  const summaryState = critical ? 'critical' : alerts.length || unread.length ? 'warning' : pending ? 'unknown' : 'ok';
  const visibleEvents = (showRead ? events : unread).slice(0, 30);
  const markRead = async (event) => {
    setBusyKey(`${event.source}:${event.code}`); setNotice('');
    try { await acknowledge(event); } catch (ackError) { setNotice(ackError.message); }
    finally { setBusyKey(''); }
  };
  return <section className="admin-diagnostics" aria-label="Diagnóstico da aplicação">
    <div className="diagnostic-intro"><div><p className="eyebrow">Saúde da aplicação</p><h2>Saiba como o PaleoMonte está</h2><p>Confira a capacidade disponível, os serviços e os avisos que precisam de atenção.</p></div><button type="button" className="button green" onClick={refresh} disabled={loading || !online}><RefreshCw size={16} aria-hidden="true"/>{loading ? 'Verificando…' : 'Verificar agora'}</button></div>
    <div className={`diagnostic-overview state-${summaryState}`} role="status">{summaryState === 'ok' ? <CheckCircle2 aria-hidden="true"/> : summaryState === 'unknown' ? <CircleHelp aria-hidden="true"/> : <AlertTriangle aria-hidden="true"/>}<div><h2>{!online ? 'Você está sem conexão' : loading && !checkedAt ? 'Verificando os serviços…' : critical ? 'Há um serviço ou limite em situação crítica' : alerts.length || unread.length ? 'Há avisos para conferir' : pending ? 'Algumas verificações precisam ser completadas' : 'As verificações disponíveis estão em dia'}</h2><p>{!online ? 'Os dados abaixo podem estar desatualizados. Reconecte para obter uma nova leitura.' : `${alerts.length} ${alerts.length === 1 ? 'quadro em atenção' : 'quadros em atenção'} · ${unread.length} ${unread.length === 1 ? 'aviso não lido' : 'avisos não lidos'} · ${pending} ${pending === 1 ? 'verificação pendente' : 'verificações pendentes'}`}</p></div></div>
    <p className="diagnostic-update">Última verificação: {formatDate(checkedAt)} · Atualização a cada minuto enquanto o painel estiver visível. Atenção a partir de 80%; crítico a partir de 95%.</p>
    {error && <div className="diagnostic-setup-note" role="alert"><b>Não foi possível completar a coleta</b><p>{error}</p></div>}
    <div className="diagnostic-section-heading"><h2>Capacidade e serviços</h2><span>Confira a origem e a data em cada quadro</span></div>
    <div className="diagnostic-grid">{cards.map((card) => <ResourceCard key={card.id} card={card}/>)}</div>
    <section className="diagnostic-incidents" aria-labelledby="diagnostic-incidents-title"><div className="diagnostic-section-heading"><h2 id="diagnostic-incidents-title"><Bell size={19} aria-hidden="true"/> Avisos de falhas observadas</h2><label className="diagnostic-read-toggle"><input type="checkbox" checked={showRead} onChange={(event) => setShowRead(event.target.checked)}/> Mostrar lidos</label></div>
      <p className="diagnostic-explanation">Falhas de operações, traduções, arquivos, acessos e telas aparecem aqui. Avisos da equipe são compartilhados quando a coleta está ativa. Avisos locais pertencem a este navegador. Marcar como lido não corrige a falha; uma nova ocorrência pode gerar outro aviso.</p>
      {notice && <p className="form-error" role="alert">{notice}</p>}
      {visibleEvents.length === 0 ? <div className="diagnostic-no-events"><CheckCircle2 size={24} aria-hidden="true"/><div><h3>{showRead ? 'Nenhuma falha registrada nesta coleta' : 'Nenhum aviso não lido'}</h3><p>Isso não garante que todo o site esteja sem falhas. Confira também os testes e medições acima.</p></div></div> : <div className="diagnostic-event-list">{visibleEvents.map((event) => { const meta = diagnosticCodes[event.code]; if (!meta) return null; return <article key={`${event.source}:${event.code}`} className={event.acknowledged_at ? 'is-read' : ''}><div className="diagnostic-event-heading"><b>{diagnosticSources[event.source]} · {meta.title}</b><span>{event.origin === 'shared' ? 'Equipe' : 'Neste navegador'}{event.acknowledged_at ? ' · Lido' : ''}</span></div><p>{meta.action}</p><small>Último registro: {formatDate(event.last_seen)} · {formatDiagnosticNumber(event.occurrences)} registros agrupados{event.http_status ? ` · Código ${event.http_status}` : ''}</small>{!event.acknowledged_at && <button type="button" className="text-button" disabled={busyKey === `${event.source}:${event.code}`} onClick={() => markRead(event)}>{busyKey === `${event.source}:${event.code}` ? 'Salvando…' : 'Marcar como lido'}</button>}</article>; })}</div>}
    </section>
    {isAdmin && snapshot?.settings ? <DiagnosticSettings key={snapshot.settings.updated_at} settings={snapshot.settings} onSaved={refresh}/> : !isAdmin && <p className="diagnostic-explanation">A administração pode confirmar os limites do plano e atualizar a leitura da hospedagem nesta página.</p>}
    <aside className="diagnostic-about"><Activity size={22} aria-hidden="true"/><div><h2>O que este diagnóstico acompanha</h2><p>Os testes verificam consultas e serviços sem cadastrar, excluir, enviar convites ou consumir traduções. As leituras do banco são atuais; o DeepL pode levar alguns minutos para atualizar a cota. A hospedagem depende da leitura informada acima.</p><p>O acompanhamento funciona durante o uso do painel. Para falhas com o site fechado, interrupções totais ou consumo de outros projetos da conta, consulte também os painéis dos provedores. Chaves de API e dados pessoais não são exibidos nos avisos.</p></div></aside>
  </section>;
}
