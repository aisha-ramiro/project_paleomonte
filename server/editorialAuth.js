export async function authorizeEditorial(request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization');
  if (!url || !key) return { status: 503, error: 'A conexão do servidor ainda não foi configurada.', code: 'not_configured' };
  if (!authorization?.startsWith('Bearer ')) return { status: 401, error: 'Entre novamente no painel.' };
  try {
    const headers = { apikey: key, Authorization: authorization };
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers, signal: AbortSignal.timeout(6000) });
    if (userResponse.status === 429) return { status: 429, code: 'rate_limit', error: 'O serviço recebeu muitas solicitações. Aguarde alguns minutos.' };
    if (!userResponse.ok) return { status: userResponse.status >= 500 ? 503 : 401, error: 'Não foi possível confirmar o acesso.' };
    const user = await userResponse.json();
    const rolesResponse = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`, { headers, signal: AbortSignal.timeout(6000) });
    if (rolesResponse.status === 429) return { status: 429, code: 'rate_limit', error: 'O serviço recebeu muitas solicitações. Aguarde alguns minutos.' };
    if (!rolesResponse.ok) return { status: 503, error: 'Não foi possível consultar as permissões.' };
    const roles = await rolesResponse.json();
    if (!Array.isArray(roles) || !roles.some(({ role }) => role === 'admin' || role === 'operator')) return { status: 403, error: 'Sem permissão para esta consulta.' };
    return { status: 200 };
  } catch { return { status: 503, error: 'O serviço de acesso não respondeu. Tente novamente.' }; }
}

export function privateJson(response, status = 200) {
  return new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
}
