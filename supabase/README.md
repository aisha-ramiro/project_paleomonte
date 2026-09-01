# Banco de dados e Supabase

Esta pasta contém a infraestrutura de dados do PaleoMonte. A migration inicial cria o modelo relacional, regras de acesso (RLS), bucket privado de mídias e auditoria.

## Aplicar a primeira migration

1. Crie um projeto em [Supabase](https://supabase.com/dashboard).
2. No projeto, abra **SQL Editor**.
3. Copie e execute o conteúdo de `migrations/202608300001_initial_schema.sql`.
   Para projetos que já executaram essa primeira migration, execute também cada migration posterior pelo SQL Editor, em ordem numérica. A migration `202608310002_access_metrics.sql` ativa os contadores diários de acessos exibidos no painel; `202608310003_user_levels.sql` reduz os acessos a Administrador e Operador.
4. No Supabase Auth, crie ou convide o primeiro usuário administrativo.
5. Copie o UUID desse usuário e atribua o papel de administrador:

```sql
insert into public.user_roles (user_id, role)
values ('UUID_DO_USUARIO', 'admin');
```

6. Em **Settings → API Keys**, copie a URL do projeto e a chave **Publishable**. Em projetos legados, use a chave `anon`.
7. Renomeie `.env.example` para `.env.local` e preencha as duas variáveis.

Nunca use nem exponha chaves `sb_secret_...`, `service_role`, a senha do banco ou a string de conexão do PostgreSQL no front-end.

## Papéis de acesso

| Papel | Finalidade |
| --- | --- |
| `admin` | Administra usuários, seus níveis e todo o conteúdo. |
| `operator` | Cadastra, edita, publica e exclui todo o conteúdo do acervo, incluindo espécies, categorias, mídias e QR Codes. Não gerencia usuários. |

Cada usuário possui apenas um nível. Somente Administradores podem convidar, alterar o nível ou excluir outros usuários.

## Modelo de dados

```text
auth.users ── 1:1 ── profiles ── N:N ── user_roles

specimens ── N:N ── categories
specimens ── N:N ── bibliographic_references
specimens ── N:N ── media ── Supabase Storage (museum-media)
specimens ── 1:1 ── qr_codes

audit_log registra alterações administrativas relevantes.

site_access_daily registra somente o total de acessos por dia.
specimen_access_daily registra somente o total diário de acessos por espécie.
```

## Métricas de acesso

A coleta de acesso é agregada no próprio PostgreSQL: cada navegação pública incrementa o contador do dia, e uma página de espécie publicada também incrementa o contador daquela espécie.

- Não são armazenados IP, identificador de visitante, navegador, dispositivo, sessão ou horário individual.
- O fuso usado para definir o dia é `America/Sao_Paulo`.
- As tabelas são lidas apenas pela equipe editorial no painel; visitantes não conseguem consultar os totais.
- A contagem começa depois da execução da migration e não recupera acessos antigos.

## Cuidados com mídias

- O bucket `museum-media` é privado.
- Uma mídia só pode ser lida pelo público quando estiver aprovada e vinculada a um espécime publicado.
- Imagens aprovadas exigem texto alternativo (`alt_text`).
- Áudios aprovados exigem transcrição (`transcript`).
- URLs assinadas devem ser geradas em tempo de execução; não devem ser armazenadas no banco de dados.

## Gerenciar usuários

O painel administrativo possui uma tela exclusiva de Administradores para convidar usuários como **Administrador** ou **Operador**, trocar seu nível e removê-los. Essas operações precisam rodar em uma **Edge Function**: criar e excluir usuários no Supabase Auth requer uma chave secreta, que jamais pode ser exposta no React.

O código está versionado em `functions/admin-users/index.ts`. Para publicá-lo, instale e autentique a Supabase CLI, vincule o projeto e execute:

```bash
supabase functions deploy admin-users
```

Como alternativa para um protótipo, no Dashboard do Supabase abra **Edge Functions → Deploy a new function → Via Editor**, crie uma função chamada `admin-users`, copie o conteúdo do arquivo citado e clique em **Deploy**.

Antes de enviar convites, abra **Authentication → URL Configuration** no Supabase e inclua estas URLs em **Redirect URLs** durante o uso local:

```text
http://127.0.0.1:5173/definir-senha
http://localhost:5173/definir-senha
```

Quando houver hospedagem, inclua também a URL definitiva equivalente, por exemplo `https://dominio-do-museu.org/definir-senha`. A URL deve corresponder exatamente ao endereço público da aplicação.

A função:

- valida a sessão do solicitante;
- exige o papel `admin`;
- lista os usuários cadastrados;
- envia convite por e-mail com o nível escolhido;
- atribui ou atualiza o nível `admin` ou `operator`;
- exclui usuários por solicitação de um Administrador;
- bloqueia a exclusão ou a mudança de nível da própria conta e impede a remoção do último Administrador.

Ao abrir o convite, a pessoa é direcionada à tela **Defina sua senha**. Mesmo que ela abra o painel antes disso, a aplicação exige a criação de senha antes de liberar o conteúdo administrativo. Após salvar a senha, ela entra no painel com o nível escolhido. A tela de login também possui a opção **Primeiro acesso ou esqueceu a senha?**, que envia um link seguro para a mesma tela.

Convites criados antes da publicação desta versão não apontam para a tela de senha. Após publicar a função atualizada, envie um novo link pelo acesso de recuperação ou gere um novo convite.

As chaves secretas usadas pela função ficam no ambiente do Supabase. Não adicione nenhuma chave secreta ao `.env.local` do React.
