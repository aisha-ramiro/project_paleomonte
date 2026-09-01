-- PaleoMonte — dois níveis de acesso: Administrador e Operador
-- Execute esta migration depois de 202608310002_access_metrics.sql.

-- Reaproveita o valor existente "editor" como "operator" para não introduzir
-- um novo valor de enum que não poderia ser usado na mesma transação.
alter type public.app_role rename value 'editor' to 'operator';

-- Todos os antigos papéis editoriais passam a Operador. Administradores
-- permanecem Administradores e cada usuário passa a ter somente um nível.
insert into public.user_roles (user_id, role, granted_by, granted_at)
select user_id, 'operator', granted_by, granted_at
from public.user_roles
where role in ('curator', 'contributor', 'viewer')
on conflict (user_id, role) do nothing;

delete from public.user_roles
where role in ('curator', 'contributor', 'viewer');

delete from public.user_roles as operator_role
using public.user_roles as admin_role
where operator_role.user_id = admin_role.user_id
  and operator_role.role = 'operator'
  and admin_role.role = 'admin';

alter table public.user_roles alter column role drop default;
alter table public.user_roles
  add constraint user_roles_supported_levels check (role in ('admin', 'operator'));
create unique index user_roles_one_level_per_user on public.user_roles (user_id);

comment on table public.user_roles is 'Níveis de acesso: admin ou operator. Cada usuário possui apenas um nível.';

-- Convites recebem seu nível pela Edge Function. Novas contas criadas fora do
-- painel não recebem acesso automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'display_name'
  );

  return new;
end;
$$;

create or replace function public.is_content_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'operator']::public.app_role[]);
$$;

create or replace function public.can_publish_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'operator']::public.app_role[]);
$$;

create or replace function public.is_content_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'operator']::public.app_role[]);
$$;

-- As três políticas abaixo mencionavam diretamente os antigos níveis.
drop policy "curators and admins can delete specimens" on public.specimens;
create policy "administrators and operators can delete specimens"
  on public.specimens for delete
  using (public.has_any_role(array['admin', 'operator']::public.app_role[]));

drop policy "curators and admins can delete media" on public.media;
create policy "administrators and operators can delete media"
  on public.media for delete
  using (public.has_any_role(array['admin', 'operator']::public.app_role[]));

drop policy "admins and curators view audit logs" on public.audit_log;
create policy "administrators and operators view audit logs"
  on public.audit_log for select
  using (public.has_any_role(array['admin', 'operator']::public.app_role[]));

drop policy "curators and admins can delete museum media files" on storage.objects;
create policy "administrators and operators can delete museum media files"
  on storage.objects for delete
  using (bucket_id = 'museum-media' and public.has_any_role(array['admin', 'operator']::public.app_role[]));
