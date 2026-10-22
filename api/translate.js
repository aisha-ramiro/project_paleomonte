import { authorizeEditorial, privateJson as json } from '../server/editorialAuth.js';

const allowedFields = [
  'commonName', 'category', 'summary', 'description', 'period', 'era', 'geologicalAge', 'geologicalFormation',
  'location', 'discoveredBy', 'type', 'diet', 'additionalInfo',
];

export async function POST(request) {
  const auth = await authorizeEditorial(request);
  if (auth.status !== 200) return json({ error: auth.error, code: auth.code }, auth.status);
  if (!process.env.DEEPL_API_KEY?.trim()) return json({ error: 'O tradutor ainda não foi configurado.', code: 'not_configured' }, 503);

  const body = await request.json().catch(() => ({}));
  const record = body?.record ?? {};
  const targetLanguage = body?.targetLanguage;
  if (!['EN-US', 'ES'].includes(targetLanguage)) return json({ error: 'Idioma de tradução inválido.' }, 400);
  const fields = allowedFields.filter((field) => typeof record[field] === 'string' && record[field].trim());
  if (!fields.length) return json({ translation: {} });

  const key = process.env.DEEPL_API_KEY.trim();
  const endpoint = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${key}` },
      body: JSON.stringify({ text: fields.map((field) => record[field]), source_lang: 'PT', target_lang: targetLanguage, formality: 'default' }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 456) return json({ error: 'A cota de tradução foi atingida. Consulte Diagnóstico antes de tentar novamente.', code: 'quota_exceeded' }, 402);
    if (response.status === 429) return json({ error: 'O tradutor recebeu muitas solicitações. Aguarde alguns minutos antes de tentar novamente.', code: 'rate_limit' }, 429);
    if (!response.ok || !Array.isArray(payload.translations)) return json({ error: 'O tradutor não respondeu como esperado. Consulte Diagnóstico.', code: 'server_error' }, 502);
    return json({ translation: Object.fromEntries(fields.map((field, index) => [field, payload.translations[index]?.text ?? record[field]])) });
  } catch {
    return json({ error: 'Não foi possível alcançar o tradutor. Aguarde e tente novamente.', code: 'server_error' }, 503);
  }
}
