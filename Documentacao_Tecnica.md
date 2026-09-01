# Documentação Técnica — PaleoMonte

> Última atualização: 31 de agosto de 2026
>
> Status atual: aplicação navegável com Supabase conectado. O painel administra o acervo e o catálogo público exibe espécies com status publicado, sujeitas à validação institucional.

## 1. Visão geral

**PaleoMonte** é uma proposta de catálogo digital para o Museu de Paleontologia Prof. Antonio Celso de Arruda Campos, em Monte Alto/SP. A aplicação apoia a visita ao museu, oferecendo páginas públicas para espécimes acessadas por navegação comum ou por QR Code.

O fluxo principal previsto é:

```text
QR Code → página do espécime → informações, imagens e acessibilidade
```

A interface pública e o painel administrativo estão conectados ao Supabase. Os conteúdos publicados continuam dependendo da validação científica e institucional do museu.

## 2. Tecnologias utilizadas

| Categoria | Tecnologia | Uso atual |
| --- | --- | --- |
| Interface | React | Criação de componentes, páginas e estados locais da interface. |
| Ambiente de desenvolvimento | Vite | Servidor local e geração da versão de produção. |
| Linguagem | JavaScript com JSX | Lógica e marcação dos componentes React. |
| Estilização | CSS puro | Design visual, responsividade, menu móvel e painel administrativo. |
| Navegação | Hash routing nativo | Rotas internas via URLs com `#/`, sem biblioteca adicional de rotas. |
| Tipografia | Google Fonts — Manrope e DM Sans | Tipografia da interface, carregada no CSS. |
| Controle de versão | Git + GitHub | Histórico e sincronização do código. |
| Banco de dados e autenticação | PostgreSQL + Auth via Supabase | Dados do acervo, papéis de acesso, RLS e login administrativo. |
| Armazenamento | Supabase Storage | Bucket privado para imagens, áudios e arquivos de QR Code. |
| Métricas | PostgreSQL via Supabase | Contadores diários agregados de acessos do site e de espécies. |
| Leitura em voz alta | Web Speech API (`SpeechSynthesis`) | Leitura nativa da ficha pública em `pt-BR`, sem serviço externo ou arquivo de áudio. |

### Bibliotecas instaladas

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`
- `@supabase/supabase-js`
- `qrcode`
- `react-easy-crop`

Não foram utilizadas bibliotecas de componentes, CSS, ícones ou roteamento. O cliente oficial do Supabase é ativado apenas quando as variáveis de ambiente locais são preenchidas.

## 3. Páginas e rotas implementadas

| Página | Rota | Conteúdo atual |
| --- | --- | --- |
| Página inicial | `#/` | Apresentação do projeto, busca, atalhos de acessibilidade e espécies em destaque. |
| Catálogo | `#/catalogo` | Busca textual, filtros locais por categoria e período, e cards de espécimes. |
| Detalhe do espécime | `#/fosseis/:slug` | Informações da espécie publicada, galeria de imagens, atributos e leitura nativa em voz alta acionada pelo visitante. |
| Sobre o Museu | `#/sobre` | Contexto institucional e apresentação do PaleoMonte. |
| Acessibilidade | `#/acessibilidade` | Controles demonstrativos para tamanho de texto e alto contraste, além da apresentação dos recursos. |
| Painel administrativo | `#/admin` | Login Supabase e fluxo único para cadastrar espécie, categoria, mídias e QR Code. |

Exemplo de rota individual atualmente disponível:

```text
#/fosseis/pycnonemosaurus-nevesi
```

## 4. Funcionalidades disponíveis no protótipo

- Navegação interna entre as páginas.
- Layout responsivo para computadores e celulares.
- Menu móvel.
- Busca local no catálogo por nome, categoria e período.
- Filtros locais por categoria e período.
- Cards clicáveis que levam à página individual do espécime.
- Galeria funcional de imagens, com seleção da foto exibida na página da espécie.
- Leitura em voz alta nativa da ficha pública, acionada por play.
- Controle demonstrativo de aumento de texto.
- Controle demonstrativo de alto contraste.
- Dashboard administrativo com métricas do acervo e acompanhamento agregado de acessos por período.
- Filtro do dashboard por intervalo e por espécie, com atualização ao retornar ao painel.
- Login administrativo por e-mail e senha via Supabase Auth.
- Proteção do painel por sessão e papel de acesso.
- Cadastro e edição de espécies, com categoria, imagens e QR Code no mesmo formulário.
- Cadastro, edição e exclusão de categorias.
- Envio de mídias para o bucket privado, com vínculo automático à espécie e estado pendente/aprovado conforme o papel e o status.
- Geração e armazenamento do arquivo de QR Code durante o cadastro da espécie.
- Impressão de QR Code diretamente pela lista de espécies.
- Coleta diária agregada de acessos do site e das espécies, sem registrar IP, dispositivo, identificador de visitante ou horário individual.

## 5. Conteúdo demonstrativo

Qualquer espécime, descrição, imagem, áudio ou métrica publicada deve ser interpretado como conteúdo em validação até a aprovação científica, museológica e institucional do museu.

A imagem em `src/assets/museum-hero.png` é ilustrativa, gerada para apoiar a concepção visual. Antes de uma publicação institucional, ela deverá ser substituída por imagens autorizadas pelo museu e acompanhadas de textos alternativos adequados.

## 6. Estrutura atual do projeto

```text
PaleoMonte/
├── src/
│   ├── assets/
│   │   └── museum-hero.png          # Imagem ilustrativa temporária
│   ├── components/
│   │   └── AdminPanel.jsx            # Painel, cadastro e gestão administrativa
│   ├── lib/
│   │   └── supabase.js              # Cliente Supabase, ativado por variáveis de ambiente
│   ├── services/
│   │   ├── accessMetrics.js          # Coleta e consulta de contadores diários
│   │   └── publicCatalog.js          # Consulta do catálogo público
│   ├── main.jsx                     # Páginas públicas, rotas e composição da aplicação
│   └── styles.css                   # Estilos visuais e regras responsivas
├── supabase/
│   ├── functions/
│   │   └── admin-users/index.ts      # Edge Function para convites administrativos
│   ├── migrations/
│   │   ├── 202608300001_initial_schema.sql  # Banco, RLS, Storage e auditoria
│   │   ├── 202608310001_storage_manager_read.sql
│   │   └── 202608310002_access_metrics.sql  # Contadores diários de acessos
│   └── README.md                     # Instruções de implantação do Supabase
├── .env.example                      # Modelo seguro de variáveis de ambiente
├── index.html                       # Documento HTML de entrada
├── package.json                     # Scripts e dependências do projeto
├── package-lock.json                # Versões exatas das dependências
├── .gitignore                       # Arquivos não versionados
└── Documentacao_Tecnica.md          # Este documento
```

### Organização atual do código

As páginas públicas e a composição principal permanecem em `src/main.jsx`. O painel administrativo já está separado em `src/components/AdminPanel.jsx`, enquanto as consultas do catálogo e das métricas ficam em `src/services/`. A evolução recomendada é separar também as páginas públicas por responsabilidade, por exemplo:

```text
src/
├── components/
├── pages/
├── data/
├── services/
├── routes/
├── hooks/
└── assets/
```

## 7. Como executar localmente

### Pré-requisito

- Node.js instalado (o projeto foi validado com Node.js 22).

### Instalação

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local para abrir no navegador. Em geral, ele estará disponível em `http://localhost:5173/`.

### Gerar versão de produção

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`, que não é enviada ao GitHub.

## 8. Repositório remoto

- Repositório: [aisha-ramiro/project_paleomonte](https://github.com/aisha-ramiro/project_paleomonte)
- Branch principal: `main`
- Remoto configurado localmente: `origin`

## 9. Itens ainda não implementados

### Integrações e dados

- Publicação da Edge Function `admin-users` no Supabase para habilitar convites de administradores pelo painel.
- Dados científicos validados pelo museu.
- Hospedagem com domínio público estável antes da impressão definitiva dos QR Codes.
- Narração institucional produzida em áudio, caso futuramente seja desejada uma voz fixa e padronizada em todos os dispositivos.

### Evoluções de front-end

- Substituição do hash routing por rotas de produção convencionais.
- Separação do código em componentes e páginas individuais.
- Paginação ou carregamento progressivo no catálogo.
- Ampliação das imagens da galeria pública em tela cheia.
- Controles avançados para a leitura nativa, como seleção de voz e ajuste de velocidade, se forem necessários após os testes de uso.
- Testes de acessibilidade e compatibilidade com leitores de tela.
- Aprimoramento dos estados de carregamento, erro e ausência de resultados do Supabase e da leitura nativa.

## 10. Orientações de manutenção

1. Todo conteúdo científico, institucional e fotográfico deve ser aprovado pelo museu antes de ser publicado.
2. Dados de espécimes devem permanecer separados do código da interface.
3. URLs públicas dos espécimes deverão ser estáveis, pois serão usadas pelos QR Codes.
4. Qualquer melhoria deve preservar a responsividade e os recursos básicos de acessibilidade.
5. Dependências novas devem ser justificadas e registradas nesta documentação.
6. Mudanças de arquitetura, integrações, decisões técnicas e comandos relevantes devem ser incluídos no histórico abaixo.

## 11. Histórico de atualizações

### 2026-08-18 — Protótipo inicial

- Criado o projeto React com Vite.
- Implementadas as páginas públicas, catálogo, página de espécie, sobre, acessibilidade e painel administrativo visual.
- Implementados layout responsivo, busca e filtros locais.
- Criada a imagem ilustrativa temporária para composição visual.
- Configurado Git e conectado o repositório local ao GitHub.
- Publicado o primeiro conjunto de commits na branch `main`.

### 2026-08-30 — Infraestrutura Supabase/PostgreSQL preparada

- Adicionada a migration inicial em `supabase/migrations/202608300001_initial_schema.sql`.
- Modelados perfis, papéis de acesso, espécimes, categorias, referências, mídias, QR Codes e registros de auditoria.
- Implementadas políticas de segurança RLS; estes papéis foram posteriormente consolidados em Administrador e Operador.
- Configurado o bucket privado `museum-media`, com regras para exibir apenas mídias aprovadas ligadas a espécies publicadas.
- Incluídos requisitos de acessibilidade de mídia: texto alternativo em imagens e transcrição em áudios aprovados.
- Adicionada a biblioteca oficial `@supabase/supabase-js` e o cliente condicional em `src/lib/supabase.js`.
- Incluídos `.env.example` e instruções de implantação em `supabase/README.md`.
- A integração não foi ativada porque as credenciais de um projeto Supabase ainda não foram fornecidas.
- A configuração de ambiente prioriza a chave Publishable atual do Supabase, com compatibilidade para a chave `anon` de projetos legados.

### 2026-08-30 — Painel administrativo conectado

- Conectado o cliente local ao projeto Supabase com variáveis de ambiente não versionadas.
- Implementados login por e-mail e senha, persistência de sessão e bloqueio de acesso baseado em `user_roles`.
- Implementados os módulos administrativos iniciais para espécies, categorias, mídias e registros de QR Codes.
- Mantidos os dados demonstrativos no catálogo público; o banco começa vazio e será abastecido manualmente pelo painel após validação do museu.
- Mantida a regra de que arquivos enviados ficam pendentes até aprovação de curadoria e exigem os metadados de acessibilidade necessários.
- Validada a compilação de produção após a integração.

### 2026-08-30 — Catálogo público e gestão administrativa ampliados

- Removido o conjunto de espécies demonstrativas da interface pública.
- Conectadas home, catálogo e página individual às espécies com status `published` no Supabase.
- Mantida uma imagem visual temporária enquanto não houver mídias aprovadas para cada espécie.
- O registro de teste publicado no banco passa a ser a espécie exibida pela aplicação.
- Adicionadas edição e exclusão de categorias no painel.
- Adicionada a área de administradores, com convite por e-mail implementado em Edge Function segura e versionada.

### 2026-08-31 — Cadastro unificado de espécie

- Unificados os fluxos de espécie, categoria, mídia e QR Code na tela de cadastro/edição de espécies.
- Removidas do menu administrativo as páginas independentes de mídias e QR Codes.
- Adicionado seletor de categoria cadastrada, obrigatório para equipe editorial no cadastro de espécie.
- Adicionados campos para imagem de capa, texto alternativo, áudio de descrição e transcrição.
- Adicionada geração automática de QR Code e armazenamento de sua imagem privada no bucket `museum-media`.
- Criada migration complementar para permitir que a equipe editorial consulte arquivos privados do acervo.

### 2026-08-31 — Correções de catálogo, edição e impressão de QR Code

- Corrigida a atualização do catálogo público após criar, editar ou excluir uma espécie no mesmo acesso à aplicação; não é mais necessário recarregar a página para consultar o registro recém-publicado.
- A listagem administrativa passou a recuperar o registro completo antes de editar, preservando os campos já cadastrados.
- Ampliado o formulário de espécie com código do museu, dados geológicos, detalhes da descoberta, coordenadas, informações adicionais e destaque na página inicial.
- Adicionado o comando **Imprimir QR Code** ao lado de Editar e Excluir na listagem de espécies.
- A impressão abre uma visualização própria com o QR Code, o nome da espécie e o endereço de destino. Pela caixa de impressão do navegador também é possível salvar o QR Code como PDF para impressão posterior.
- Atualizado o cabeçalho da visualização de impressão para `Museu de Paleontologia de Monte Alto - SP`.
- A opção exige que a espécie já possua QR Code gerado e que a política de leitura do bucket privado `museum-media` esteja aplicada no Supabase.

### 2026-08-31 — Organização do painel e ficha pública

- Ajustada a estrutura do painel administrativo para manter o menu lateral fixo em telas maiores, enquanto somente a área de conteúdo pode rolar verticalmente.
- Centralizados os formulários administrativos e os conjuntos de gerenciamento para melhorar a leitura em telas largas.
- Removida da página pública individual a área de abas com informações complementares genéricas, pois ela ainda não é alimentada pelo formulário administrativo.

### 2026-08-31 — Galeria e enquadramento de imagens

- Adicionada a biblioteca `react-easy-crop` para preparar fotos no navegador antes do envio ao Supabase Storage.
- O cadastro de espécie agora aceita diversas imagens: uma delas pode ser definida como capa do catálogo e as demais ficam disponíveis na galeria pública.
- Cada imagem pode ser movida e ampliada dentro de uma moldura 4:3. O recorte preparado é enviado ao armazenamento, evitando cortes inesperados nas páginas públicas.
- A galeria na página da espécie permite alternar entre as fotos cadastradas.

### 2026-09-01 — Gestão das fotos já cadastradas

- O formulário de edição de espécie passou a carregar as fotos já vinculadas ao registro, com URL temporária segura para visualização no painel.
- Fotos existentes são identificadas como **Salvas** e podem ser selecionadas como capa ou removidas diretamente no formulário.
- Ao salvar uma remoção, o vínculo da foto com a espécie é excluído; o arquivo e seus metadados também são removidos quando não houver uso da mesma mídia em outra espécie.
- Fotos novas mantêm o fluxo de enquadramento 4:3; para reenquadrar uma foto já salva, ela deve ser substituída por uma nova versão.

### 2026-09-01 — Simplificação de mídia e acesso administrativo

- Removido do formulário de criação e edição de espécies o envio de áudio e sua transcrição, pois a página pública utiliza leitura nativa pela Web Speech API.
- Mantida a estrutura de mídia no banco para possível uso institucional futuro, sem exibir esse fluxo no painel atual.
- Removido o botão de acesso administrativo da navegação principal pública.
- Substituído o link textual do rodapé por um ícone vetorial preenchido de prancheta em branco, com identificação acessível de **Painel Administrativo** e posicionamento responsivo.

### 2026-09-01 — Preparação para hospedagem na Vercel

- Adicionado `vercel.json` com redirecionamento interno de `/definir-senha` para a aplicação React.
- Essa regra mantém funcional o retorno dos e-mails de convite e redefinição de senha do Supabase em um domínio público.
- A hospedagem usa a compilação padrão `npm run build` e o diretório de saída `dist/` do Vite.

### 2026-09-01 — Consulta protegida de acessos no painel

- Adicionada a migration `supabase/migrations/202609010001_access_metrics_dashboard_rpc.sql`.
- O painel passou a consultar os totais por meio da função protegida `get_access_metrics`, disponível apenas para Administradores e Operadores.
- A gravação pública continua exclusivamente na função `record_public_access`; visitantes não conseguem ler os contadores nem acessar dados individuais.

### 2026-08-31 — Estrutura visual do painel de acessos

- Substituído o bloco informativo “Banco preparado” pelo painel de acessos no dashboard administrativo.
- Adicionado filtro por intervalo de datas, cartões de acessos no período e no dia, além de gráfico de linha responsivo.
- Os valores iniciam em zero até que seja implantada a coleta agregada de acessos; nenhum dado individual de visitante é exibido ou simulado.

### 2026-08-31 — Coleta agregada de acessos

- Criada a migration `supabase/migrations/202608310002_access_metrics.sql` com as tabelas diárias `site_access_daily` e `specimen_access_daily`.
- Criada a função segura `record_public_access`, chamada a cada navegação pública. Ela incrementa o total do site e, nas páginas de espécie publicada, também o total daquela espécie.
- Não são armazenados eventos individuais, IPs, cookies de identificação, dispositivos, sessões ou horários de visitantes: somente a data e o total numérico diário.
- Conectado o dashboard administrativo às tabelas de acesso, incluindo total do período filtrado, total do dia e gráfico de linha diário.
- A migration foi aplicada no projeto Supabase e a coleta está ativa. A contagem começa a partir da ativação e não cria histórico retroativo.
- Adicionado ao filtro do dashboard o seletor de escopo: **Todos** mostra o site geral; ao selecionar uma espécie, os cartões e o gráfico passam a apresentar somente os acessos dela.
- O painel atualiza os números novamente ao recuperar o foco, exibindo acessos feitos em outra aba sem exigir a alteração manual do filtro.

### 2026-08-31 — Leitura nativa da ficha da espécie

- Substituído o controle visual de áudio pela Web Speech API nativa do navegador, sem envio de textos para uma IA, sem chave externa e sem criar arquivos de áudio.
- A leitura só é iniciada após o visitante apertar play e usa `pt-BR`, priorizando uma voz em português disponível no dispositivo.
- A narração segue a ordem visual da ficha: nome científico, nome popular, período geológico, local da descoberta, descrição, tipo, comprimento, dieta e era geológica.
- O botão permite pausar e continuar a leitura. Ao sair da página, a síntese é cancelada para evitar que a voz continue em outra espécie.

### 2026-08-31 — Níveis Administrador e Operador

- Consolidado o acesso do painel em dois níveis: **Administrador** e **Operador**.
- Ambos podem cadastrar, editar, publicar e excluir itens do acervo, incluindo espécies, categorias, mídias e QR Codes.
- Somente Administradores visualizam a área **Usuários** e podem convidar pessoas, escolher seu nível, alterá-lo posteriormente ou excluir contas.
- Criada a migration `supabase/migrations/202608310003_user_levels.sql`, que converte os papéis editoriais antigos para Operador, preserva Administradores e garante um único nível por usuário.
- Atualizada a Edge Function `supabase/functions/admin-users/index.ts` com convites por nível, edição e exclusão segura de usuários. Ela impede que uma pessoa altere ou exclua a própria conta e preserva pelo menos um Administrador.
- Para ativar em produção, é necessário executar a nova migration no SQL Editor e publicar novamente a Edge Function `admin-users`.

### 2026-08-31 — Convite e criação de senha

- Criada a rota de autenticação `/definir-senha`, dedicada ao primeiro acesso e à redefinição de senha.
- Os novos convites enviados pela Edge Function agora usam essa rota como retorno seguro, permitindo que a pessoa convidada defina a própria senha antes de entrar no painel.
- Adicionada a opção **Primeiro acesso ou esqueceu a senha?** à tela de login, com envio de link seguro pelo Supabase Auth.
- A rota de senha não utiliza hash routing, evitando conflito com os tokens recebidos nos links de autenticação do Supabase.
- Convites novos passam a marcar o primeiro acesso e o painel exige a definição da senha antes de liberar o conteúdo administrativo.
- Documentadas as URLs de redirecionamento necessárias em **Authentication → URL Configuration**. A Edge Function precisa ser publicada novamente para que os próximos convites usem este fluxo.
- Aprimorada a exibição de erros das Edge Functions no painel, para que falhas de envio, configuração de redirecionamento ou atribuição de nível sejam identificadas diretamente na interface.

### Próxima atualização

Ao realizar uma nova melhoria, adicione uma subseção com:

```md
### AAAA-MM-DD — Título objetivo da mudança

- O que foi alterado.
- Tecnologias, integrações ou dependências adicionadas/removidas.
- Impacto em rotas, dados, acessibilidade ou execução local.
- Decisões relevantes e pendências, quando houver.
```
