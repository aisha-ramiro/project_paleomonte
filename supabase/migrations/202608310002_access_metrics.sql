-- Contadores diários agregados de acessos públicos.
-- Não armazena IP, identificadores de visitante, navegador, sessão nem horário individual.

create table public.site_access_daily (
  access_date date primary key,
  access_count bigint not null default 0 check (access_count >= 0)
);

create table public.specimen_access_daily (
  access_date date not null,
  specimen_id uuid not null references public.specimens(id) on delete cascade,
  access_count bigint not null default 0 check (access_count >= 0),
  primary key (access_date, specimen_id)
);

create index specimen_access_daily_specimen_access_date_idx
  on public.specimen_access_daily (specimen_id, access_date desc);

alter table public.site_access_daily enable row level security;
alter table public.specimen_access_daily enable row level security;

create policy "content authors can read site access totals"
  on public.site_access_daily for select
  using (public.is_content_author());

create policy "content authors can read specimen access totals"
  on public.specimen_access_daily for select
  using (public.is_content_author());

create or replace function public.record_public_access(p_specimen_slug text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_access_date date := timezone('America/Sao_Paulo', now())::date;
  target_specimen_id uuid;
begin
  insert into public.site_access_daily (access_date, access_count)
  values (current_access_date, 1)
  on conflict (access_date) do update
    set access_count = public.site_access_daily.access_count + 1;

  if nullif(trim(p_specimen_slug), '') is not null then
    select id
      into target_specimen_id
      from public.specimens
      where slug = trim(p_specimen_slug)
        and status = 'published'
      limit 1;

    if target_specimen_id is not null then
      insert into public.specimen_access_daily (access_date, specimen_id, access_count)
      values (current_access_date, target_specimen_id, 1)
      on conflict (access_date, specimen_id) do update
        set access_count = public.specimen_access_daily.access_count + 1;
    end if;
  end if;
end;
$$;

revoke all on function public.record_public_access(text) from public;
grant execute on function public.record_public_access(text) to anon, authenticated;
