# Diagnóstico do PaleoMonte

A página **Diagnóstico** substitui **Configurações** no painel. Está disponível para Administradores e Operadores. Administradores também podem confirmar as referências de limite e as leituras da hospedagem.

## Ativação em produção

1. No projeto correto do Supabase, execute no SQL Editor o conteúdo de [`supabase/migrations/202610220001_application_diagnostics.sql`](supabase/migrations/202610220001_application_diagnostics.sql), depois das migrations existentes. O script cria somente as estruturas e funções do diagnóstico, sem alterar os registros ou as políticas do acervo. A aplicação informa quando essa coleta ainda não está ativa.
2. Publique a versão atual de [`supabase/functions/admin-users/index.ts`](supabase/functions/admin-users/index.ts) pelo editor de Edge Functions ou pela CLI: `supabase functions deploy admin-users`. A nova ação `health` verifica a resposta do serviço para um Administrador, sem enviar convites ou listar usuários no navegador.
3. Publique a versão do site na Vercel. A função `api/diagnostics.js` usa as mesmas variáveis do tradutor: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (ou o fallback `VITE_SUPABASE_ANON_KEY`) e `DEEPL_API_KEY`. A chave do DeepL deve continuar somente no ambiente do servidor, sem prefixo `VITE_`. Nenhuma nova credencial privada é necessária.
4. Entre como Administrador e abra **Diagnóstico → Limites de referência e leitura da hospedagem**. Informe a capacidade do banco e dos arquivos conforme o plano e o escopo deste projeto. Esses limites começam vazios: o sistema não adivinha qual plano está contratado. Um limite não confirmado aparece como pendente.
5. Se desejar um aviso de volume de público, defina o **Alerta de acessos por mês**. Ele é uma referência interna, não uma cota contratual, não representa pessoas únicas e não bloqueia visitas.
6. Na Vercel, abra **Usage**, confira consumo e limite no mesmo escopo e período e registre as requisições e a transferência nesta página. Os campos de transferência usam GB decimais; o campo do banco usa MB decimais. Deixe em branco o que ainda não foi confirmado. Salvar com consumos preenchidos confirma a leitura naquele momento. A hospedagem não tem integração automática nesta versão: leituras com mais de 24 horas ou fora do período ficam sinalizadas como desatualizadas.
7. Clique em **Verificar agora**. Confira as datas de leitura, os testes e a ausência de avisos de ativação. Faça a conferência com os dois níveis de acesso.

## O que é medido

| Quadro | Origem | Observação |
| --- | --- | --- |
| Banco de dados | `pg_database_size(current_database())` | Dados e índices do banco atual; não equivale ao disco total ou à soma da organização. |
| Arquivos | Soma dos metadados `size` em `storage.objects` | Todos os buckets do projeto, incluindo arquivos sem vínculo no catálogo; não altera arquivos. Se faltar tamanho, o quadro informa leitura incompleta. |
| Acessos no mês | `site_access_daily` | Mês calendário no fuso de São Paulo; não é o número de requisições da CDN. |
| Tradução | DeepL `GET /v2/usage` | Compara as cotas da conta e da chave, apresentando a mais próxima do esgotamento. Respostas que indicam ausência de teto não são tratadas como cota confirmada. Pode haver atraso de alguns minutos no provedor. |
| Requisições e transferência | Leitura manual na Vercel | Informa origem, data e período; exige atualização pela administração. |
| Catálogo | Leitura de um registro publicado, se houver | Confirma a resposta da consulta; não percorre todas as páginas. |
| Imagens | Listagem do armazenamento para a equipe | Não testa upload nem a disponibilidade de cada imagem para visitantes. |
| Usuários | Ação `health` da função administrativa | Restrita a Administradores; não confirma a entrega de e-mails. |

Os quadros de capacidade avisam a partir de **80%** e ficam críticos a partir de **95%**. Limite ou leitura ausente nunca vira zero nem estado saudável. As referências não contratam capacidade, não alteram planos e não bloqueiam o site.

## Avisos e privacidade

- A camada de consulta do Supabase e as chamadas de tradução capturam falhas de HTTP e de conexão. Erros de renderização, recursos que não carregam e promessas não tratadas também geram avisos. Uma falha de renderização apresenta uma tela de recuperação com acesso ao diagnóstico.
- São registrados apenas serviço, código predefinido, status HTTP quando houver, datas e contagem de registros agrupados. Não são enviados texto livre de exceções, dados de formulários, senhas, e-mails, URLs assinadas ou tokens.
- A coleta local tem até 40 combinações, com agrupamento de repetições rápidas. Sem sessão editorial, os avisos ficam apenas naquele navegador. Com sessão válida, o aplicativo tenta compartilhar até cinco pendências por minuto. Isso não é telemetria de todos os visitantes.
- O banco guarda no máximo uma linha por combinação de serviço e código (atualmente 72 combinações) e atualiza uma combinação no máximo uma vez por minuto. As contagens representam registros agrupados, não o total exato de requisições com erro.
- As funções de diagnóstico verificam os papéis da sessão. Visitantes não têm acesso aos dados; Operadores consultam e marcam avisos como lidos; somente Administradores alteram referências. As tabelas não aceitam acesso direto dos clientes.
- Marcar como lido é um reconhecimento, não uma correção. Uma ocorrência posterior pode reabrir o aviso. Erros da própria gravação de avisos não geram uma sequência recursiva de novos eventos.
- O diagnóstico atualiza durante o uso do painel e pausa consultas periódicas em abas ocultas. Não substitui monitoramento externo para interrupções totais, erros com o aplicativo fechado ou consumo de outros projetos e serviços da conta.

## Verificação técnica

- `npm test`: testes sem rede para limiares, leituras ausentes ou vencidas, datas em São Paulo, autorização, cotas do DeepL, cache protegido e erros de tradução.
- `npm run build`: compilação de produção.
- A migration foi executada em PostgreSQL temporário com fixtures de autenticação, armazenamento e acessos para validar sintaxe, agregados, permissões, limites e confirmação de leitura de avisos. Isso não aplica alterações ao banco real.
- A interface foi verificada em navegador com dados simulados: os dois níveis de acesso, nove quadros, busca de estado após erro de API, avisos locais/compartilhados, configurações, falta de conexão, migration ausente, celular e tema escuro.

## Fontes dos provedores

- [DeepL: consulta de uso e limites](https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits)
- [DeepL: tratamento de erros e limites de solicitações](https://developers.deepl.com/docs/best-practices/error-handling)
- [Supabase: tamanho do banco e do disco](https://supabase.com/docs/guides/platform/database-size)
- [Supabase: consumo de armazenamento por metadados](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)
- [Vercel: consulta de uso](https://vercel.com/docs/cli/usage)
