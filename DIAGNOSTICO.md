# Diagnóstico do PaleoMonte

A página **Diagnóstico** substitui **Configurações** no painel. Está disponível para Administradores e Operadores. As referências de limite são mantidas exclusivamente no código; não há formulário de edição no painel.

## Ativação em produção

1. No projeto correto do Supabase, execute, em ordem, [`202610220001_application_diagnostics.sql`](supabase/migrations/202610220001_application_diagnostics.sql) e [`202610220002_readonly_diagnostics.sql`](supabase/migrations/202610220002_readonly_diagnostics.sql), depois das migrations existentes. Se a primeira já foi aplicada, execute somente a segunda. A nova migration mantém os dados existentes, desativa a antiga função de edição e corrige a medição de tamanho do banco.
2. Publique a versão atual de [`supabase/functions/admin-users/index.ts`](supabase/functions/admin-users/index.ts) pelo editor de Edge Functions ou pela CLI: `supabase functions deploy admin-users`. A nova ação `health` verifica a resposta do serviço para um Administrador, sem enviar convites ou listar usuários no navegador.
3. Publique a versão do site na Vercel. A função `api/diagnostics.js` usa as mesmas variáveis do tradutor: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (ou o fallback `VITE_SUPABASE_ANON_KEY`) e `DEEPL_API_KEY`. A chave do DeepL deve continuar somente no ambiente do servidor, sem prefixo `VITE_`. Nenhuma nova credencial privada é necessária.
4. As referências ficam em [`src/config/diagnostics.js`](src/config/diagnostics.js): 500.000.000 bytes para o banco e 1.000.000.000 bytes para arquivos, conforme o plano Free confirmado no projeto em 22/10/2026. Para alterar essas referências, edite o código e publique uma nova versão. Valores da tabela antiga de configurações não substituem o arquivo.
5. A contagem de acessos mensais é informativa, sem cota contratual. Um eventual teto interno só pode ser definido em `monthlyAccesses`, no mesmo arquivo, seguido de nova publicação. A cota do DeepL continua sendo consultada no servidor.
6. Requisições e transferência da hospedagem devem ser acompanhadas diretamente na Vercel; esses quadros e seus formulários foram removidos do Diagnóstico.
7. Clique em **Verificar agora** e confira as leituras e os testes com os dois níveis de acesso.

## O que é medido

| Quadro | Origem | Observação |
| --- | --- | --- |
| Banco de dados | Soma de `pg_database_size(datname)` em `pg_database` | Total das bases do projeto, incluindo as internas. O quadro também informa a parcela da aplicação e a das bases internas. Não equivale ao disco total ou à soma da organização. |
| Arquivos | Soma dos metadados `size` em `storage.objects` | Todos os buckets do projeto, incluindo arquivos sem vínculo no catálogo; não altera arquivos. Se faltar tamanho, o quadro informa leitura incompleta. |
| Acessos no mês | `site_access_daily` | Mês calendário no fuso de São Paulo; não é o número de requisições da CDN. |
| Tradução | DeepL `GET /v2/usage` | Compara as cotas da conta e da chave, apresentando a mais próxima do esgotamento. Respostas que indicam ausência de teto não são tratadas como cota confirmada. Pode haver atraso de alguns minutos no provedor. |
| Catálogo | Leitura de um registro publicado, se houver | Confirma a resposta da consulta; não percorre todas as páginas. |
| Imagens | Listagem do armazenamento para a equipe | Não testa upload nem a disponibilidade de cada imagem para visitantes. |
| Usuários | Ação `health` da função administrativa | Restrita a Administradores; não confirma a entrega de e-mails. |

Os quadros de capacidade avisam a partir de **80%** e ficam críticos a partir de **95%**. Leitura ausente nunca vira zero nem estado saudável. Acessos sem teto configurado são apresentados como informativos. As referências não contratam capacidade, não alteram planos e não bloqueiam o site.

Na conferência em produção de 22/10/2026, o banco da aplicação tinha cerca de 12,8 MB e as bases internas cerca de 15,3 MB, totalizando 28,1 MB. O valor anterior usava somente o banco atual. A soma segue a consulta recomendada na documentação do Supabase; os relatórios do provedor podem ter atraso de atualização. MB e GB são exibidos em unidades decimais.

## Avisos e privacidade

- A camada de consulta do Supabase e as chamadas de tradução capturam falhas de HTTP e de conexão. Erros de renderização, recursos que não carregam e promessas não tratadas também geram avisos. Uma falha de renderização apresenta uma tela de recuperação com acesso ao diagnóstico.
- São registrados apenas serviço, código predefinido, status HTTP quando houver, datas e contagem de registros agrupados. Não são enviados texto livre de exceções, dados de formulários, senhas, e-mails, URLs assinadas ou tokens.
- A coleta local tem até 40 combinações, com agrupamento de repetições rápidas. Sem sessão editorial, os avisos ficam apenas naquele navegador. Com sessão válida, o aplicativo tenta compartilhar até cinco pendências por minuto. Isso não é telemetria de todos os visitantes.
- O banco guarda no máximo uma linha por combinação de serviço e código (atualmente 72 combinações) e atualiza uma combinação no máximo uma vez por minuto. As contagens representam registros agrupados, não o total exato de requisições com erro.
- As funções de diagnóstico verificam os papéis da sessão. Visitantes não têm acesso aos dados; a equipe consulta e marca avisos como lidos. A edição de referências foi desativada também na função antiga `save_diagnostic_settings`: nem Administradores podem executá-la. As tabelas não aceitam acesso direto dos clientes.
- Marcar como lido é um reconhecimento, não uma correção. Uma ocorrência posterior pode reabrir o aviso. Erros da própria gravação de avisos não geram uma sequência recursiva de novos eventos.
- O diagnóstico atualiza durante o uso do painel e pausa consultas periódicas em abas ocultas. Não substitui monitoramento externo para interrupções totais, erros com o aplicativo fechado ou consumo de outros projetos e serviços da conta.

## Verificação técnica

- `npm test`: testes sem rede para limiares, leituras ausentes, sete quadros, referências exclusivas do código, composição do banco, autorização, cotas do DeepL, cache protegido e erros de tradução.
- `npm run build`: compilação de produção.
- As duas migrations foram verificadas em PostgreSQL temporário com fixtures para agregados, permissões, desativação da escrita e confirmação de leitura de avisos, incluindo os privilégios padrão de funções do Supabase.
- A interface deve apresentar sete quadros e nenhum controle para editar limites, inclusive para Administradores.

## Fontes dos provedores

- [DeepL: consulta de uso e limites](https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits)
- [DeepL: tratamento de erros e limites de solicitações](https://developers.deepl.com/docs/best-practices/error-handling)
- [Supabase: tamanho do banco e do disco](https://supabase.com/docs/guides/platform/database-size)
- [Supabase: consumo de armazenamento por metadados](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)
- [Vercel: consulta de uso](https://vercel.com/docs/cli/usage)
