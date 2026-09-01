-- Consulta agregada para o painel de acessos.
-- A função evita depender diretamente das políticas RLS das tabelas diárias,
-- mas continua disponível somente para Administradores e Operadores.

create or replace function public.get_access_metrics(
  p_start_date date,
  p_end_date date,
  p_specimen_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_access_date date := timezone('America/Sao_Paulo', now())::date;
  daily_series jsonb;
  current_total bigint;
begin
  if not public.is_content_author() then
    raise exception 'Sem permissão para consultar os acessos.' using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Intervalo de datas inválido.' using errcode = '22007';
  end if;

  if p_specimen_id is null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'access_date', access_date,
      'access_count', access_count
    ) order by access_date), '[]'::jsonb)
      into daily_series
      from public.site_access_daily
      where access_date between p_start_date and p_end_date;

    select coalesce(access_count, 0)
      into current_total
      from public.site_access_daily
      where access_date = current_access_date;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'access_date', access_date,
      'access_count', access_count
    ) order by access_date), '[]'::jsonb)
      into daily_series
      from public.specimen_access_daily
      where specimen_id = p_specimen_id
        and access_date between p_start_date and p_end_date;

    select coalesce(access_count, 0)
      into current_total
      from public.specimen_access_daily
      where specimen_id = p_specimen_id
        and access_date = current_access_date;
  end if;

  return jsonb_build_object(
    'series', coalesce(daily_series, '[]'::jsonb),
    'today_total', coalesce(current_total, 0)
  );
end;
$$;

revoke all on function public.get_access_metrics(date, date, uuid) from public;
grant execute on function public.get_access_metrics(date, date, uuid) to authenticated;
