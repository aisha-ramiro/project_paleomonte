-- Diagnóstico: somente dados agregados e códigos de falha predefinidos.
-- Aplicar após as migrations existentes. Não altera políticas do acervo.
begin;

create table public.diagnostic_settings (
  id integer primary key default 1 check (id = 1),
  database_limit_bytes bigint check (database_limit_bytes > 0),
  storage_limit_bytes bigint check (storage_limit_bytes > 0),
  access_monthly_limit bigint check (access_monthly_limit > 0),
  hosting_request_limit bigint check (hosting_request_limit > 0),
  hosting_request_used bigint check (hosting_request_used >= 0),
  hosting_transfer_limit_bytes bigint check (hosting_transfer_limit_bytes > 0),
  hosting_transfer_used_bytes bigint check (hosting_transfer_used_bytes >= 0),
  hosting_period_start date,
  hosting_period_end date,
  hosting_measured_at timestamptz,
  updated_at timestamptz not null default now(),
  check (hosting_period_end is null or hosting_period_start is null or hosting_period_end >= hosting_period_start),
  check ((hosting_request_used is null and hosting_transfer_used_bytes is null) or
    (hosting_period_start is not null and hosting_period_end is not null and hosting_measured_at is not null))
);
insert into public.diagnostic_settings (id) values (1);

create table public.diagnostic_events (
  source text not null check (source in ('database', 'storage', 'translation', 'users', 'access', 'catalog', 'auth', 'interface')),
  code text not null check (code in ('quota_exceeded', 'rate_limit', 'network', 'unauthorized', 'forbidden', 'not_configured', 'server_error', 'request_failed', 'runtime_error')),
  http_status integer check (http_status between 100 and 599),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  occurrences bigint not null default 1,
  acknowledged_at timestamptz,
  primary key (source, code)
);

alter table public.diagnostic_settings enable row level security;
alter table public.diagnostic_events enable row level security;
-- Acesso somente pelas funções abaixo, que conferem o nível da sessão.
revoke all on public.diagnostic_settings, public.diagnostic_events from anon, authenticated;

create or replace function public.record_diagnostic_event(p_source text, p_code text, p_http_status integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_content_author() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.diagnostic_events (source, code, http_status)
  values (p_source, p_code, p_http_status)
  on conflict (source, code) do update
    set last_seen = now(), occurrences = public.diagnostic_events.occurrences + 1,
        http_status = excluded.http_status, acknowledged_at = null
    -- Uma linha por tipo e atualização no máximo a cada minuto.
    where public.diagnostic_events.last_seen <= now() - interval '1 minute';
end;
$$;

create or replace function public.acknowledge_diagnostic_event(p_source text, p_code text, p_last_seen timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not public.is_content_author() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  update public.diagnostic_events set acknowledged_at = now()
    where source = p_source and code = p_code and last_seen = p_last_seen;
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

create or replace function public.save_diagnostic_settings(p_settings jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  start_date date := nullif(p_settings->>'hosting_period_start', '')::date;
  end_date date := nullif(p_settings->>'hosting_period_end', '')::date;
  current_day date := timezone('America/Sao_Paulo', now())::date;
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Somente administradores podem alterar os limites.' using errcode = '42501';
  end if;
  if start_date > end_date or start_date > current_day then
    raise exception 'Confira o período de leitura da hospedagem.' using errcode = '22007';
  end if;
  update public.diagnostic_settings set
    database_limit_bytes = nullif(p_settings->>'database_limit_bytes', '')::bigint,
    storage_limit_bytes = nullif(p_settings->>'storage_limit_bytes', '')::bigint,
    access_monthly_limit = nullif(p_settings->>'access_monthly_limit', '')::bigint,
    hosting_request_limit = nullif(p_settings->>'hosting_request_limit', '')::bigint,
    hosting_request_used = nullif(p_settings->>'hosting_request_used', '')::bigint,
    hosting_transfer_limit_bytes = nullif(p_settings->>'hosting_transfer_limit_bytes', '')::bigint,
    hosting_transfer_used_bytes = nullif(p_settings->>'hosting_transfer_used_bytes', '')::bigint,
    hosting_period_start = start_date,
    hosting_period_end = end_date,
    hosting_measured_at = case when nullif(p_settings->>'hosting_request_used', '') is not null or
      nullif(p_settings->>'hosting_transfer_used_bytes', '') is not null then now() else null end,
    updated_at = now()
  where id = 1;
end;
$$;

create or replace function public.get_application_diagnostics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_day date := timezone('America/Sao_Paulo', now())::date;
  month_start date := date_trunc('month', current_day)::date;
  snapshot jsonb;
begin
  if not public.is_content_author() then
    raise exception 'Sem permissão para consultar o diagnóstico.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'checked_at', now(),
    'database_bytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
    'storage_bytes', (select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric else 0 end), 0) from storage.objects),
    'storage_files', (select count(*) from storage.objects),
    'unknown_file_sizes', (select count(*) from storage.objects where metadata->>'size' is null or not (metadata->>'size' ~ '^[0-9]+$')),
    'bucket_exists', exists(select 1 from storage.buckets where id = 'museum-media'),
    'monthly_accesses', (select coalesce(sum(access_count), 0) from public.site_access_daily where access_date between month_start and current_day),
    'month_start', month_start,
    'month_end', (month_start + interval '1 month' - interval '1 day')::date,
    'settings', (select to_jsonb(s) - 'id' from public.diagnostic_settings s where id = 1),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.last_seen desc), '[]'::jsonb) from public.diagnostic_events e)
  ) into snapshot;
  return snapshot;
end;
$$;

revoke all on function public.record_diagnostic_event(text, text, integer) from public;
revoke all on function public.acknowledge_diagnostic_event(text, text, timestamptz) from public;
revoke all on function public.save_diagnostic_settings(jsonb) from public;
revoke all on function public.get_application_diagnostics() from public;
grant execute on function public.record_diagnostic_event(text, text, integer) to authenticated;
grant execute on function public.acknowledge_diagnostic_event(text, text, timestamptz) to authenticated;
grant execute on function public.save_diagnostic_settings(jsonb) to authenticated;
grant execute on function public.get_application_diagnostics() to authenticated;
commit;
