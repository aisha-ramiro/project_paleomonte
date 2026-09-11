const allowedFields = [
  'commonName', 'category', 'summary', 'description', 'period', 'era',
  'location', 'discoveredBy', 'type', 'diet', 'additionalInfo',
];

function json(response, status = 200) {
  return new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json' } });
}

async function isEditorialUser(authorization) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !authorization) return false;
  const headers = { apikey: key, Authorization: authorization };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userResponse.ok) return false;
  const user = await userResponse.json();
  const rolesResponse = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, { headers });
  if (!rolesResponse.ok) return false;
  const roles = await rolesResponse.json();
  return roles.some(({ role }) => role === 'admin' || role === 'operator');
}

export async function POST(request) {
  if (!(await isEditorialUser(request.headers.get('authorization')))) return json({ error: 'Sem permissão para gerar traduções.' }, 403);
  if (!process.env.DEEPL_API_KEY) return json({ error: 'O tradutor ainda não foi configurado.' }, 503);

  const body = await request.json().catch(() => ({}));
  const record = body?.record ?? {};
  const fields = allowedFields.filter((field) => typeof record[field] === 'string' && record[field].trim());
  if (!fields.length) return json({ translation: {} });

  const key = process.env.DEEPL_API_KEY.trim();
  const endpoint = key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${key}` },
    body: JSON.stringify({ text: fields.map((field) => record[field]), source_lang: 'PT', target_lang: 'EN-US', formality: 'default' }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.translations)) return json({ error: 'O tradutor não respondeu como esperado.' }, 502);
  return json({ translation: Object.fromEntries(fields.map((field, index) => [field, payload.translations[index]?.text ?? record[field]])) });
}
