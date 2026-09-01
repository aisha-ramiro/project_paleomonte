// Supabase Edge Function: gestão segura de usuários administrativos.
// Esta função usa uma chave secreta exclusivamente no servidor Supabase.
// Nunca leve o conteúdo deste arquivo para o bundle React.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getDefaultKey(name: string, fallbackName: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      return JSON.parse(raw).default as string;
    } catch {
      return raw;
    }
  }
  return Deno.env.get(fallbackName);
}

const projectUrl = Deno.env.get('SUPABASE_URL')!;
const publishableKey = getDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')!;
const secretKey = getDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')!;
const allowedRoles = ['admin', 'operator'] as const;

function isAllowedRole(role: unknown): role is (typeof allowedRoles)[number] {
  return typeof role === 'string' && allowedRoles.includes(role as (typeof allowedRoles)[number]);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('Sessão ausente.');

    const userClient = createClient(projectUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Sessão inválida.');

    const { data: adminRole, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleError || !adminRole) return json({ error: 'Apenas administradores podem gerir acessos.' }, 403);

    const adminClient = createClient(projectUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const body = await request.json();

    if (body.action === 'list') {
      const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const ids = authData.users.map((item) => item.id);
      const { data: roles, error: rolesError } = ids.length
        ? await adminClient.from('user_roles').select('user_id, role').in('user_id', ids)
        : { data: [], error: null };
      if (rolesError) throw rolesError;
      const groupedRoles = new Map<string, string[]>();
      (roles ?? []).forEach((item) => groupedRoles.set(item.user_id, [...(groupedRoles.get(item.user_id) ?? []), item.role]));
      return json({ users: authData.users.map((item) => ({ id: item.id, email: item.email, created_at: item.created_at, roles: groupedRoles.get(item.id) ?? [] })) });
    }

    if (body.action === 'invite_user') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);
      if (!isAllowedRole(body.role)) return json({ error: 'Selecione Administrador ou Operador.' }, 400);
      const origin = request.headers.get('origin');
      const redirectTo = origin ? new URL('/definir-senha', origin).toString() : undefined;

      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { requires_password_setup: true },
      });
      if (inviteError) return json({ error: `Convite não enviado: ${inviteError.message}` }, 400);
      if (!invited.user) throw new Error('O Supabase não retornou o usuário convidado.');
      const invitedId = invited.user.id;
      const { error: grantError } = await adminClient
        .from('user_roles')
        .upsert({ user_id: invitedId, role: body.role, granted_by: user.id }, { onConflict: 'user_id' });
      if (grantError) return json({ error: `A conta foi criada, mas o nível não pôde ser atribuído: ${grantError.message}. Confirme a execução da migration 202608310003_user_levels.sql antes de tentar novamente.` }, 500);

      return json({ user: { id: invitedId, email: invited.user.email }, message: `Convite de ${body.role === 'admin' ? 'administrador' : 'operador'} enviado.` }, 201);
    }

    const targetUserId = String(body.user_id ?? '');
    if (body.action === 'change_role') {
      if (!targetUserId) return json({ error: 'Usuário não informado.' }, 400);
      if (!isAllowedRole(body.role)) return json({ error: 'Selecione Administrador ou Operador.' }, 400);
      if (targetUserId === user.id) return json({ error: 'Por segurança, não é possível alterar o seu próprio nível.' }, 400);

      const { data: targetRole, error: targetRoleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (targetRoleError) throw targetRoleError;
      if (targetRole?.role === 'admin' && body.role !== 'admin') {
        const { count, error: countError } = await adminClient
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');
        if (countError) throw countError;
        if ((count ?? 0) <= 1) return json({ error: 'Mantenha ao menos um administrador no painel.' }, 400);
      }

      const { error: changeError } = await adminClient
        .from('user_roles')
        .upsert({ user_id: targetUserId, role: body.role, granted_by: user.id, granted_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (changeError) throw changeError;
      return json({ message: 'Nível de acesso atualizado.' });
    }

    if (body.action === 'delete_user') {
      if (!targetUserId) return json({ error: 'Usuário não informado.' }, 400);
      if (targetUserId === user.id) return json({ error: 'Por segurança, não é possível excluir a própria conta.' }, 400);

      const { data: targetRole, error: targetRoleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (targetRoleError) throw targetRoleError;
      if (targetRole?.role === 'admin') {
        const { count, error: countError } = await adminClient
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');
        if (countError) throw countError;
        if ((count ?? 0) <= 1) return json({ error: 'Mantenha ao menos um administrador no painel.' }, 400);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteError) throw deleteError;
      return json({ message: 'Usuário excluído.' });
    }

    return json({ error: 'Ação não reconhecida.' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado.' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
