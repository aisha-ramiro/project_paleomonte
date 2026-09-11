-- Traduções automáticas revisáveis das fichas do catálogo.
alter table public.specimens
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.specimens.translations is
  'Conteúdos traduzidos por idioma, gerados automaticamente e associados à espécie.';
