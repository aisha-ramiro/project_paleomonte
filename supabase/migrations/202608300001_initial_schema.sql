-- PaleoMonte — esquema inicial para Supabase/PostgreSQL
-- Execute esta migration pelo Supabase CLI ou pelo SQL Editor do projeto Supabase.
-- Não inclua informações científicas não validadas neste arquivo.

create extension if not exists pgcrypto;

-- ========= Tipos de domínio =========

create type public.app_role as enum (
  'admin',
  'curator',
  'editor',
  'contributor',
  'viewer'
);

create type public.content_status as enum (
  'draft',
  'in_review',
  'published',
  'archived'
);

create type public.media_type as enum (
  'image',
  'audio',
  'document',
  'video'
);

create type public.media_status as enum (
  'pending',
  'approved',
  'archived'
);

create type public.media_purpose as enum (
  'cover',
  'gallery',
  'audio_description',
  'document',
  'other'
);

create type public.qr_code_status as enum (
  'active',
  'revoked',
  'archived'
);

-- ========= Usuários e permissões =========

-- auth.users é gerenciada pelo Supabase Auth. Esta tabela armazena somente
-- informações públicas/de aplicação, sem credenciais ou senhas.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um usuário pode ter mais de um papel. O papel mais permissivo prevalece
-- nas políticas de acesso.
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'viewer',
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is 'Níveis de acesso: admin, curator, editor, contributor e viewer.';

-- ========= Catálogo =========

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  color text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, name)
);

create table public.specimens (
  id uuid primary key default gen_random_uuid(),
  museum_code text unique,
  scientific_name text not null,
  common_name text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  description text,
  geological_period text,
  geological_era text,
  geological_age text,
  geological_formation text,
  discovery_location text,
  discovery_year integer check (discovery_year between 0 and 2100),
  discovered_by text,
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  specimen_type text,
  diet text,
  length_meters numeric(8, 2) check (length_meters >= 0),
  additional_info text,
  attributes jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector(
      'portuguese',
      coalesce(scientific_name, '') || ' ' ||
      coalesce(common_name, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(geological_period, '')
    )
  ) stored,
  constraint published_specimen_requires_date check (
    status <> 'published' or published_at is not null
  )
);

create table public.specimen_categories (
  specimen_id uuid not null references public.specimens(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (specimen_id, category_id)
);

create unique index specimen_one_primary_category
  on public.specimen_categories (specimen_id)
  where is_primary;

-- Referências são reutilizáveis entre espécimes.
create table public.bibliographic_references (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text,
  publication text,
  publication_year integer check (publication_year between 1000 and 2100),
  url text check (url is null or url ~ '^https?://'),
  citation text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.specimen_references (
  specimen_id uuid not null references public.specimens(id) on delete cascade,
  reference_id uuid not null references public.bibliographic_references(id) on delete restrict,
  notes text,
  primary key (specimen_id, reference_id)
);

-- ========= Mídias =========

-- O arquivo fica no Supabase Storage; aqui ficam metadados, licenças e
-- informações de acessibilidade. Nenhuma URL assinada é persistida no banco.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'museum-media',
  storage_path text not null unique,
  type public.media_type not null,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  title text,
  alt_text text,
  transcript text,
  credit text,
  license text,
  status public.media_status not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_image_requires_alt_text check (
    type <> 'image' or status <> 'approved' or nullif(trim(alt_text), '') is not null
  ),
  constraint approved_audio_requires_transcript check (
    type <> 'audio' or status <> 'approved' or nullif(trim(transcript), '') is not null
  )
);

create table public.specimen_media (
  specimen_id uuid not null references public.specimens(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete restrict,
  purpose public.media_purpose not null default 'gallery',
  caption text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  primary key (specimen_id, media_id)
);

create unique index specimen_one_cover_media
  on public.specimen_media (specimen_id)
  where purpose = 'cover';

create index specimen_media_order_index
  on public.specimen_media (specimen_id, purpose, display_order);

-- ========= QR Codes =========

-- O QR físico deve apontar para a URL pública estável do espécime. O token
-- opcional permite rastreamento futuro por Edge Function sem expor edição.
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  specimen_id uuid not null unique references public.specimens(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  public_path text not null unique check (public_path ~ '^/fosseis/[a-z0-9]+(?:-[a-z0-9]+)*$'),
  image_path text,
  status public.qr_code_status not null default 'active',
  version integer not null default 1 check (version > 0),
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  last_scanned_at timestamptz,
  scan_count bigint not null default 0 check (scan_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========= Auditoria =========

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index specimens_search_document_index on public.specimens using gin (search_document);
create index specimens_status_index on public.specimens (status, is_featured);
create index specimens_created_by_index on public.specimens (created_by);
create index media_status_index on public.media (status, type);
create index audit_log_entity_index on public.audit_log (entity_table, entity_id, created_at desc);

-- ========= Funções e automações =========

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

  insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.has_any_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

create or replace function public.is_content_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'curator', 'editor']::public.app_role[]);
$$;

create or replace function public.can_publish_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'curator']::public.app_role[]);
$$;

create or replace function public.is_content_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'curator', 'editor', 'contributor']::public.app_role[]);
$$;

create or replace function public.set_specimen_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by = auth.uid();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.status = 'archived' and (tg_op = 'INSERT' or old.status is distinct from 'archived') then
    new.archived_at = coalesce(new.archived_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity_table, entity_id, old_data, new_data)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger specimens_set_updated_at before update on public.specimens for each row execute procedure public.set_updated_at();
create trigger media_set_updated_at before update on public.media for each row execute procedure public.set_updated_at();
create trigger references_set_updated_at before update on public.bibliographic_references for each row execute procedure public.set_updated_at();
create trigger qr_codes_set_updated_at before update on public.qr_codes for each row execute procedure public.set_updated_at();
create trigger specimens_set_status_timestamps before insert or update on public.specimens for each row execute procedure public.set_specimen_status_timestamps();

create trigger specimens_audit after insert or update or delete on public.specimens for each row execute procedure public.write_audit_log();
create trigger categories_audit after insert or update or delete on public.categories for each row execute procedure public.write_audit_log();
create trigger media_audit after insert or update or delete on public.media for each row execute procedure public.write_audit_log();
create trigger qr_codes_audit after insert or update or delete on public.qr_codes for each row execute procedure public.write_audit_log();

-- ========= Segurança: RLS =========

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.specimens enable row level security;
alter table public.specimen_categories enable row level security;
alter table public.bibliographic_references enable row level security;
alter table public.specimen_references enable row level security;
alter table public.media enable row level security;
alter table public.specimen_media enable row level security;
alter table public.qr_codes enable row level security;
alter table public.audit_log enable row level security;

-- Perfis e papéis
create policy "users can view their own profile or admins can view all"
  on public.profiles for select
  using (id = auth.uid() or public.has_any_role(array['admin']::public.app_role[]));

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "users can view their own roles or admins can view all"
  on public.user_roles for select
  using (user_id = auth.uid() or public.has_any_role(array['admin']::public.app_role[]));

create policy "admins manage roles"
  on public.user_roles for all
  using (public.has_any_role(array['admin']::public.app_role[]))
  with check (public.has_any_role(array['admin']::public.app_role[]));

-- Categorias e referências: leitura pública; gestão pela equipe editorial.
create policy "public can view active categories"
  on public.categories for select using (is_active or public.is_content_author());
create policy "content managers manage categories"
  on public.categories for all
  using (public.is_content_manager()) with check (public.is_content_manager());

create policy "public can view references linked by application"
  on public.bibliographic_references for select using (true);
create policy "content managers manage references"
  on public.bibliographic_references for all
  using (public.is_content_manager()) with check (public.is_content_manager());

-- Espécimes publicados são públicos. Contribuidores podem criar e alterar
-- somente os seus próprios rascunhos; editores não podem publicar conteúdo.
create policy "public can view published specimens"
  on public.specimens for select
  using (status = 'published' or public.is_content_author());

create policy "authors can create draft specimens"
  on public.specimens for insert
  with check (
    (public.is_content_manager() and (status <> 'published' or public.can_publish_content()))
    or (public.has_any_role(array['contributor']::public.app_role[]) and created_by = auth.uid() and status = 'draft')
  );

create policy "managers or draft owners can update specimens"
  on public.specimens for update
  using (
    public.is_content_manager()
    or (created_by = auth.uid() and status = 'draft' and public.has_any_role(array['contributor']::public.app_role[]))
  )
  with check (
    (public.is_content_manager() and (status <> 'published' or public.can_publish_content()))
    or (created_by = auth.uid() and status = 'draft' and public.has_any_role(array['contributor']::public.app_role[]))
  );

create policy "curators and admins can delete specimens"
  on public.specimens for delete
  using (public.has_any_role(array['admin', 'curator']::public.app_role[]));

create policy "public can view categories of published content"
  on public.specimen_categories for select
  using (
    exists (select 1 from public.specimens s where s.id = specimen_id and (s.status = 'published' or public.is_content_author()))
  );
create policy "content managers manage specimen categories"
  on public.specimen_categories for all
  using (public.is_content_manager()) with check (public.is_content_manager());

create policy "public can view references of published content"
  on public.specimen_references for select
  using (
    exists (select 1 from public.specimens s where s.id = specimen_id and (s.status = 'published' or public.is_content_author()))
  );
create policy "content managers manage specimen references"
  on public.specimen_references for all
  using (public.is_content_manager()) with check (public.is_content_manager());

-- Mídias aprovadas só aparecem se estiverem vinculadas a um espécime publicado.
create policy "public can view approved media of published specimens"
  on public.media for select
  using (
    (status = 'approved' and exists (
      select 1
      from public.specimen_media sm
      join public.specimens s on s.id = sm.specimen_id
      where sm.media_id = media.id and s.status = 'published'
    )) or public.is_content_author()
  );
create policy "authors can upload pending media"
  on public.media for insert
  with check (
    (public.is_content_manager() and (status <> 'approved' or public.can_publish_content()))
    or (public.has_any_role(array['contributor']::public.app_role[]) and created_by = auth.uid() and status = 'pending')
  );
create policy "managers or pending media owners can update media"
  on public.media for update
  using (
    public.is_content_manager()
    or (created_by = auth.uid() and status = 'pending' and public.has_any_role(array['contributor']::public.app_role[]))
  )
  with check (
    (public.is_content_manager() and (status <> 'approved' or public.can_publish_content()))
    or (created_by = auth.uid() and status = 'pending' and public.has_any_role(array['contributor']::public.app_role[]))
  );
create policy "curators and admins can delete media"
  on public.media for delete
  using (public.has_any_role(array['admin', 'curator']::public.app_role[]));

create policy "public can view published specimen media links"
  on public.specimen_media for select
  using (
    exists (select 1 from public.specimens s where s.id = specimen_id and (s.status = 'published' or public.is_content_author()))
  );
create policy "content managers manage specimen media links"
  on public.specimen_media for all
  using (public.is_content_manager()) with check (public.is_content_manager());

-- QR Codes e auditoria são administrativos. O QR físico aponta diretamente
-- para a rota pública da espécie; não é preciso expor esta tabela ao visitante.
create policy "content managers manage qr codes"
  on public.qr_codes for all
  using (public.is_content_manager()) with check (public.is_content_manager());
create policy "admins and curators view audit logs"
  on public.audit_log for select
  using (public.has_any_role(array['admin', 'curator']::public.app_role[]));

-- ========= Supabase Storage =========

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'museum-media',
  'museum-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "public can read approved published media files"
  on storage.objects for select
  using (
    bucket_id = 'museum-media' and exists (
      select 1
      from public.media m
      join public.specimen_media sm on sm.media_id = m.id
      join public.specimens s on s.id = sm.specimen_id
      where m.storage_bucket = storage.objects.bucket_id
        and m.storage_path = storage.objects.name
        and m.status = 'approved'
        and s.status = 'published'
    )
  );

create policy "content managers can read museum media files"
  on storage.objects for select
  using (bucket_id = 'museum-media' and public.is_content_manager());

create policy "content authors can upload museum media files"
  on storage.objects for insert
  with check (bucket_id = 'museum-media' and public.is_content_author());

create policy "content managers can update museum media files"
  on storage.objects for update
  using (bucket_id = 'museum-media' and public.is_content_manager())
  with check (bucket_id = 'museum-media' and public.is_content_manager());

create policy "curators and admins can delete museum media files"
  on storage.objects for delete
  using (bucket_id = 'museum-media' and public.has_any_role(array['admin', 'curator']::public.app_role[]));

-- Ao criar o primeiro usuário administrador, atribua o papel pelo SQL Editor:
-- insert into public.user_roles (user_id, role) values ('UUID_DO_USUARIO', 'admin');
