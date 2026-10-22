import { diagnosticLimits } from '../config/diagnostics.js';

export const diagnosticSources = {
  database: 'Banco de dados', storage: 'Arquivos e imagens', translation: 'Tradução',
  users: 'Gestão de usuários', access: 'Contagem de acessos', catalog: 'Catálogo público',
  auth: 'Acesso ao painel', interface: 'Interface',
};

export const diagnosticCodes = {
  quota_exceeded: { title: 'Limite do serviço atingido', action: 'Confira a cota do serviço antes de repetir a operação. Reduza o uso ou peça à administração uma revisão do plano.', severity: 'critical' },
  rate_limit: { title: 'Muitas solicitações em pouco tempo', action: 'Aguarde alguns minutos e tente novamente. Evite repetir o botão de salvar ou traduzir.', severity: 'warning' },
  network: { title: 'Não foi possível alcançar o serviço', action: 'Confira sua conexão e tente novamente. Se persistir em outros dispositivos, acione a equipe responsável.', severity: 'warning' },
  unauthorized: { title: 'Acesso não confirmado', action: 'Entre novamente no painel. Se o erro persistir, solicite a conferência do seu acesso.', severity: 'warning' },
  forbidden: { title: 'Ação sem permissão', action: 'Confira seu nível de acesso. A administração pode verificar as permissões do serviço.', severity: 'warning' },
  not_configured: { title: 'Serviço ainda não configurado', action: 'Peça à equipe responsável a configuração do serviço antes de tentar novamente.', severity: 'warning' },
  server_error: { title: 'O serviço apresentou uma falha', action: 'Aguarde e tente novamente. Se continuar, informe à equipe o serviço e o horário deste aviso.', severity: 'critical' },
  request_failed: { title: 'Uma operação não foi concluída', action: 'Confira os campos e a mensagem da operação. Verifique se o registro já foi salvo antes de repeti-la.', severity: 'warning' },
  runtime_error: { title: 'Uma tela apresentou um erro', action: 'Atualize a página. Se voltar a acontecer, informe à equipe qual ação estava realizando e o horário deste aviso.', severity: 'critical' },
};

export function classifyFailure(status, code) {
  if (code === 'quota_exceeded' || Number(status) === 456 || Number(status) === 402) return 'quota_exceeded';
  if (code === 'not_configured') return 'not_configured';
  if (Number(status) === 429) return 'rate_limit';
  if (Number(status) === 401) return 'unauthorized';
  if (Number(status) === 403) return 'forbidden';
  if (Number(status) >= 500) return 'server_error';
  return 'request_failed';
}

export function capacityState(used, limit) {
  if (used == null || !Number.isFinite(Number(used)) || Number(used) < 0) return 'unknown';
  if (limit == null || !Number.isFinite(Number(limit)) || Number(limit) < 0) return 'unknown';
  if (Number(limit) === 0) return 'critical';
  const ratio = Number(used) / Number(limit);
  return ratio >= .95 ? 'critical' : ratio >= .8 ? 'warning' : 'ok';
}

export function formatDiagnosticNumber(value, unit = 'count') {
  if (value == null || !Number.isFinite(Number(value))) return 'Não disponível';
  if (unit === 'bytes') {
    const size = Number(value);
    const divisor = size >= 1e9 ? 1e9 : size >= 1e6 ? 1e6 : size >= 1e3 ? 1e3 : 1;
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(size / divisor)} ${divisor === 1e9 ? 'GB' : divisor === 1e6 ? 'MB' : divisor === 1e3 ? 'KB' : 'bytes'}`;
  }
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value));
}

export function mergeDiagnosticEvents(remote = [], local = []) {
  const merged = new Map(remote.map((event) => [`${event.source}:${event.code}`, { ...event, origin: 'shared' }]));
  for (const event of local) {
    const key = `${event.source}:${event.code}`;
    const existing = merged.get(key);
    if (!existing || new Date(event.last_seen) > new Date(existing.last_seen)) merged.set(key, { ...event, origin: 'local' });
  }
  return [...merged.values()].sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
}

export function buildDiagnosticCards(snapshot, provider, checks = {}) {
  const resources = [
    { id: 'database', title: 'Banco de dados', used: snapshot?.database_bytes, limit: diagnosticLimits.databaseBytes, unit: 'bytes', source: 'Supabase · soma das bases do projeto', detail: snapshot?.application_database_bytes != null ? `Aplicação: ${formatDiagnosticNumber(snapshot.application_database_bytes, 'bytes')}. Bases internas: ${formatDiagnosticNumber(snapshot.internal_database_bytes, 'bytes')}. O total soma as bases PostgreSQL do projeto, conforme a consulta recomendada pelo Supabase. A atualização do provedor pode ter atraso.` : 'Total das bases PostgreSQL deste projeto, incluindo bases internas. Não equivale ao disco total nem à soma de outros projetos.', action: 'Revise os dados com a equipe e confirme a capacidade do plano antes de novos cadastros.' },
    { id: 'storage', title: 'Armazenamento de arquivos', used: snapshot?.storage_bytes, limit: diagnosticLimits.storageBytes, unit: 'bytes', source: 'Metadados dos arquivos do projeto', detail: snapshot ? `${formatDiagnosticNumber(snapshot.storage_files)} arquivos em todos os espaços de armazenamento deste projeto. ${snapshot.unknown_file_sizes ? 'Há arquivos sem tamanho informado; o total pode estar incompleto.' : ''}` : 'Inclui fotos e QR Codes, inclusive arquivos que já não aparecem no catálogo.', action: 'Evite fotos duplicadas. Peça revisão dos arquivos sem uso e da capacidade do plano.' },
    { id: 'access', title: 'Acessos ao site neste mês', used: snapshot?.monthly_accesses, limit: diagnosticLimits.monthlyAccesses, unit: 'count', source: 'Contador do PaleoMonte · mês de São Paulo', limitDescription: diagnosticLimits.monthlyAccesses == null ? 'Contagem informativa, sem cota contratual' : undefined, detail: 'Acessos a páginas no mês. Uma pessoa pode gerar vários acessos; a contagem não representa requisições cobradas pela hospedagem.', action: 'Confira a evolução no Painel e verifique também o consumo na hospedagem.' },
  ].map((card) => ({ ...card, state: card.id === 'access' && card.limit == null && Number.isFinite(card.used) && card.used >= 0 ? 'neutral' : capacityState(card.used, card.limit), checkedAt: snapshot?.checked_at }));
  if (snapshot?.unknown_file_sizes && resources[1].state !== 'critical') resources[1].state = 'warning';
  const translation = provider?.translation;
  const quota = translation?.quota;
  resources.push({ id: 'translation', title: 'Tradução automática', used: quota?.used, limit: quota?.limit, unit: 'count', suffix: 'caracteres', state: translation?.state === 'ok' ? capacityState(quota?.used, quota?.limit) : (translation?.state ?? 'unknown'), source: quota?.scope === 'key' ? 'DeepL · cota da chave de tradução' : 'DeepL · cota da conta', checkedAt: provider?.checked_at, detail: translation?.message ?? 'Consumo no período de cobrança do tradutor. A leitura pode levar alguns minutos para refletir as últimas traduções.', action: 'Evite traduções repetidas. Revise a cota do DeepL ou mantenha as versões manuais enquanto o serviço estiver indisponível.' });
  resources.push(
    { id: 'catalog', title: 'Consulta ao catálogo', state: checks.catalog?.state ?? 'unknown', checkedAt: checks.catalog?.checkedAt, detail: checks.catalog?.message ?? 'Verificando a leitura dos registros publicados.', action: 'Confira a conexão e as permissões de leitura. Se persistir, informe a equipe responsável.', source: 'Teste de leitura · sem alterar dados' },
    { id: 'media', title: 'Serviço de imagens', state: checks.storage?.state ?? 'unknown', checkedAt: checks.storage?.checkedAt, detail: checks.storage?.message ?? 'Verificando o acesso ao armazenamento da equipe.', action: 'Confira a conexão, as permissões e o espaço disponível. O teste não envia arquivos.', source: 'Teste de listagem · sem enviar arquivos' },
    { id: 'users', title: 'Convites e usuários', state: checks.users?.state ?? 'unknown', checkedAt: checks.users?.checkedAt, detail: checks.users?.message ?? 'Verificação disponível para administradores.', action: 'Solicite a verificação do serviço de usuários e da configuração de e-mails. O teste não envia convites.', source: 'Teste do serviço · sem enviar e-mails' },
  );
  return resources;
}
