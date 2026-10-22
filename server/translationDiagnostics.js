// Consultas de cota não traduzem textos nem enviam conteúdo do acervo.
export async function getTranslationDiagnostics() {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) return { state: 'unknown', code: 'not_configured', message: 'O tradutor ainda não foi configurado no servidor.' };
  const endpoint = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  try {
    const response = await fetch(`${endpoint}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${key}` }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      if (response.status === 456) return { state: 'critical', code: 'quota_exceeded', message: 'O DeepL informou que a cota de tradução foi atingida.' };
      if (response.status === 429) return { state: 'warning', code: 'rate_limit', message: 'O tradutor pediu uma pausa nas consultas. Aguarde antes de tentar novamente.' };
      if ([401, 403].includes(response.status)) return { state: 'critical', code: 'forbidden', message: 'O tradutor não aceitou a credencial configurada. Solicite a revisão à equipe responsável.' };
      return { state: 'critical', code: 'server_error', message: 'Não foi possível consultar a cota do tradutor.' };
    }
    const data = await response.json();
    const isCount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    const quotas = [
      { scope: 'account', used: data.character_count, limit: data.character_limit },
      { scope: 'key', used: data.api_key_character_count, limit: data.api_key_character_limit },
    ].filter((quota) => isCount(quota.used) && isCount(quota.limit));
    if (!quotas.length) return { state: 'unknown', message: 'O tradutor respondeu, mas não informou uma cota válida.' };
    // O provedor usa 10^12 para indicar ausência de limite configurado.
    const limited = quotas.filter((quota) => quota.limit < 1e12);
    const quota = [...(limited.length ? limited : quotas)].sort((a, b) => (b.limit === 0 ? Infinity : b.used / b.limit) - (a.limit === 0 ? Infinity : a.used / a.limit))[0];
    return quota.limit >= 1e12
      ? { state: 'unknown', message: 'A conta respondeu, mas não há teto de consumo configurado no DeepL.', quota: { ...quota, limit: null } }
      : { state: 'ok', quota };
  } catch { return { state: 'warning', code: 'network', message: 'O tradutor não respondeu à consulta de cota. Confira novamente em alguns minutos.' }; }
}
