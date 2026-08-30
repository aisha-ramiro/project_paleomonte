# Banco de dados e Supabase

Esta pasta contém a infraestrutura de dados do PaleoMonte. A migration inicial cria o modelo relacional, regras de acesso (RLS), bucket privado de mídias e auditoria.

## Aplicar a primeira migration

1. Crie um projeto em [Supabase](https://supabase.com/dashboard).
2. No projeto, abra **SQL Editor**.
3. Copie e execute o conteúdo de `migrations/202608300001_initial_schema.sql`.
4. No Supabase Auth, crie ou convide o primeiro usuário administrativo.
5. Copie o UUID desse usuário e atribua o papel de administrador:

```sql
insert into public.user_roles (user_id, role)
values ('UUID_DO_USUARIO', 'admin');
```

6. Em **Project Settings → API**, copie a URL do projeto e a chave pública/anônima.
7. Renomeie `.env.example` para `.env.local` e preencha as duas variáveis.

Nunca use nem exponha a chave `service_role` no front-end.

## Papéis de acesso

| Papel | Finalidade |
| --- | --- |
| `admin` | Administra usuários, permissões e todo o conteúdo. |
| `curator` | Valida, publica, arquiva e administra conteúdo do acervo. |
| `editor` | Cria e edita conteúdo, mas não publica espécies ou mídias aprovadas. |
| `contributor` | Envia rascunhos e mídias pendentes próprias para revisão. |
| `viewer` | Visitante autenticado sem permissão editorial. |

Um usuário pode ter mais de um papel. As permissões são avaliadas pelo papel mais permissivo.

## Modelo de dados

```text
auth.users ── 1:1 ── profiles ── N:N ── user_roles

specimens ── N:N ── categories
specimens ── N:N ── bibliographic_references
specimens ── N:N ── media ── Supabase Storage (museum-media)
specimens ── 1:1 ── qr_codes

audit_log registra alterações administrativas relevantes.
```

## Cuidados com mídias

- O bucket `museum-media` é privado.
- Uma mídia só pode ser lida pelo público quando estiver aprovada e vinculada a um espécime publicado.
- Imagens aprovadas exigem texto alternativo (`alt_text`).
- Áudios aprovados exigem transcrição (`transcript`).
- URLs assinadas devem ser geradas em tempo de execução; não devem ser armazenadas no banco de dados.
