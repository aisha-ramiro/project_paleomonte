-- Diagnóstico somente de consulta: referências mantidas no código do site.
-- Não remove as tabelas antigas nem dados existentes.
begin;

create or replace function public.save_diagnostic_settings(p_settings jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'A edição de limites pelo painel foi desativada. As referências são mantidas no código.' using errcode = '42501';
end;
$$;
revoke execute on function public.save_diagnostic_settings(jsonb) from public, anon, authenticated;

create or replace function public.get_application_diagnostics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_day date := timezone('America/Sao_Paulo', now())::date;
  month_start date := date_trunc('month', current_day)::date;
  total_database_bytes bigint;
  app_database_bytes bigint;
  snapshot jsonb;
begin
  if not public.is_content_author() then
    raise exception 'Sem permissão para consultar o diagnóstico.' using errcode = '42501';
  end if;

  -- Consulta recomendada pelo Supabase para o tamanho do banco do projeto:
  -- https://supabase.com/docs/guides/platform/database-size
  select coalesce(sum(pg_catalog.pg_database_size(d.datname)), 0)::bigint
    into total_database_bytes from pg_catalog.pg_database d;
  app_database_bytes := pg_catalog.pg_database_size(pg_catalog.current_database());

  select jsonb_build_object(
    'checked_at', now(),
    'database_bytes', total_database_bytes,
    'application_database_bytes', app_database_bytes,
    'internal_database_bytes', greatest(0, total_database_bytes - app_database_bytes),
    'storage_bytes', (select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric else 0 end), 0) from storage.objects),
    'storage_files', (select count(*) from storage.objects),
    'unknown_file_sizes', (select count(*) from storage.objects where metadata->>'size' is null or not (metadata->>'size' ~ '^[0-9]+$')),
    'bucket_exists', exists(select 1 from storage.buckets where id = 'museum-media'),
    'monthly_accesses', (select coalesce(sum(access_count), 0) from public.site_access_daily where access_date between month_start and current_day),
    'month_start', month_start,
    'month_end', (month_start + interval '1 month' - interval '1 day')::date,
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.last_seen desc), '[]'::jsonb) from public.diagnostic_events e)
  ) into snapshot;
  return snapshot;
end;
$$;

-- Preserva a consulta da equipe e impede execução anônima.
revoke execute on function public.get_application_diagnostics() from public, anon;
grant execute on function public.get_application_diagnostics() to authenticated;
commit;
