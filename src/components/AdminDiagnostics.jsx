import { useState } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, CircleHelp, Bell } from 'lucide-react';
import { diagnosticCodes, diagnosticSources, formatDiagnosticNumber } from '../services/diagnosticModel';
import './admin-diagnostics.css';

const stateLabels = { ok: 'Em dia', warning: 'Atenção', critical: 'Crítico', unknown: 'Verificação pendente', info: 'Acesso restrito', neutral: 'Informativo' };
const formatDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : 'Ainda sem leitura';

function ResourceCard({ card }) {
  const hasUsage = card.used != null;
  const percent = hasUsage && card.limit > 0 ? Number(card.used) / Number(card.limit) * 100 : null;
  return <article className={`diagnostic-card state-${card.state}`}>
    <div className="diagnostic-card-head"><h3>{card.title}</h3><span className={`diagnostic-status state-${card.state}`}>{stateLabels[card.state] ?? stateLabels.unknown}</span></div>
    {hasUsage ? <><p className="diagnostic-value">{formatDiagnosticNumber(card.used, card.unit)}{card.suffix && <small>{card.suffix}</small>}</p><p className="diagnostic-limit">{card.limit == null ? (card.limitDescription ?? 'Limite de referência não informado') : `de ${formatDiagnosticNumber(card.limit, card.unit)}${card.suffix ? ` ${card.suffix}` : ''}`}{percent != null && <b>{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percent)}%</b>}</p>{percent != null && <div className="diagnostic-progress" role="progressbar" aria-label={`Uso de ${card.title}`} aria-valuenow={Math.min(100, Math.max(0, percent))} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${Math.round(percent)}% do limite informado`}><span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/></div>}</> : <p className="diagnostic-value diagnostic-value-text">{card.state === 'ok' ? 'Respondeu ao teste' : card.state === 'info' ? 'Somente administrador' : 'Sem medição confirmada'}</p>}
    <p className="diagnostic-card-detail">{card.detail}</p>
    {(card.state === 'warning' || card.state === 'critical') && <div className="diagnostic-action"><b>O que fazer</b><p>{card.action}</p></div>}
    <footer><span>{card.source}</span>{card.checkedAt && <span>Leitura: {formatDate(card.checkedAt)}</span>}</footer>
  </article>;
}

export default function AdminDiagnostics({ diagnostics }) {
  const { cards, events, alerts, unread, loading, error, online, checkedAt, refresh, acknowledge } = diagnostics;
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
    <aside className="diagnostic-about"><Activity size={22} aria-hidden="true"/><div><h2>O que este diagnóstico acompanha</h2><p>Os testes verificam consultas e serviços sem cadastrar, excluir, enviar convites ou consumir traduções. As leituras do banco são atuais; o DeepL pode levar alguns minutos para atualizar a cota.</p><p>O acompanhamento funciona durante o uso do painel. Para falhas com o site fechado, interrupções totais ou consumo de outros projetos da conta, consulte também os painéis dos provedores. Chaves de API e dados pessoais não são exibidos nos avisos.</p></div></aside>
  </section>;
}
