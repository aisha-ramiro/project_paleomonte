# Documentação Técnica — PaleoMonte

> Última atualização: 18 de agosto de 2026
>
> Status atual: protótipo estático navegável, sem integrações externas ou dados científicos definitivos.

## 1. Visão geral

**PaleoMonte** é uma proposta de catálogo digital para o Museu de Paleontologia Prof. Antonio Celso de Arruda Campos, em Monte Alto/SP. A aplicação pretende apoiar a visita ao museu, oferecendo páginas públicas para espécimes acessadas por navegação comum ou, futuramente, por QR Code.

O fluxo principal previsto é:

```text
QR Code → página do espécime → informações, imagens e acessibilidade
```

Nesta primeira entrega, foi desenvolvido somente o front-end demonstrativo. Não há conexão com API, banco de dados, autenticação, QR Codes funcionais ou conteúdo científico validado.

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

### Bibliotecas instaladas

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`

Não foram utilizadas bibliotecas de componentes, CSS, ícones, roteamento, backend ou banco de dados nesta etapa.

## 3. Páginas e rotas implementadas

| Página | Rota | Conteúdo atual |
| --- | --- | --- |
| Página inicial | `#/` | Apresentação do projeto, busca, atalhos de acessibilidade e espécies em destaque. |
| Catálogo | `#/catalogo` | Busca textual, filtros locais por categoria e período, e cards de espécimes. |
| Detalhe do espécime | `#/fosseis/:slug` | Informações demonstrativas, imagem principal, mini-galeria, atributos, áudio visual e abas de conteúdo. |
| Sobre o Museu | `#/sobre` | Contexto institucional e apresentação do PaleoMonte. |
| Acessibilidade | `#/acessibilidade` | Controles demonstrativos para tamanho de texto e alto contraste, além da apresentação dos recursos. |
| Painel administrativo | `#/admin` | Interface visual para futuras ferramentas de administração. Não possui autenticação nem persistência de dados. |

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
- Interface visual de galeria de imagens.
- Controle visual de reprodução de áudio.
- Controle demonstrativo de aumento de texto.
- Controle demonstrativo de alto contraste.
- Painel administrativo de demonstração com métricas e ações rápidas não persistentes.

## 5. Conteúdo demonstrativo

Os espécimes, descrições, atributos, métricas e datas utilizados no protótipo são dados de demonstração. Eles não devem ser interpretados como conteúdo científico, museológico ou institucional definitivo.

A imagem em `src/assets/museum-hero.png` é ilustrativa, gerada para apoiar a concepção visual. Antes de uma publicação institucional, ela deverá ser substituída por imagens autorizadas pelo museu e acompanhadas de textos alternativos adequados.

## 6. Estrutura atual do projeto

```text
PaleoMonte/
├── src/
│   ├── assets/
│   │   └── museum-hero.png          # Imagem ilustrativa temporária
│   ├── main.jsx                     # Componentes, páginas, dados demonstrativos e rotas
│   └── styles.css                   # Estilos visuais e regras responsivas
├── index.html                       # Documento HTML de entrada
├── package.json                     # Scripts e dependências do projeto
├── package-lock.json                # Versões exatas das dependências
├── .gitignore                       # Arquivos não versionados
└── Documentacao_Tecnica.md          # Este documento
```

### Organização atual do código

Neste protótipo inicial, os componentes e as páginas estão reunidos em `src/main.jsx` para permitir uma implementação rápida e simples. A evolução recomendada é separar a aplicação por responsabilidade, por exemplo:

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

- API pública de espécimes e categorias.
- Banco de dados e modelagem definitiva.
- Painel administrativo funcional.
- Autenticação de administradores.
- Upload e gestão de imagens.
- Dados científicos validados pelo museu.
- QR Codes apontando para URLs públicas estáveis.
- Áudio real ou integração com TTS.

### Evoluções de front-end

- Substituição do hash routing por rotas de produção convencionais.
- Separação do código em componentes e páginas individuais.
- Paginação ou carregamento progressivo no catálogo.
- Galeria de imagens funcional com ampliação.
- Leitor de áudio real, com controles de acessibilidade.
- Testes de acessibilidade e compatibilidade com leitores de tela.
- Tratamento de estados de carregamento, erro e ausência de resultados provenientes da API futura.

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

### Próxima atualização

Ao realizar uma nova melhoria, adicione uma subseção com:

```md
### AAAA-MM-DD — Título objetivo da mudança

- O que foi alterado.
- Tecnologias, integrações ou dependências adicionadas/removidas.
- Impacto em rotas, dados, acessibilidade ou execução local.
- Decisões relevantes e pendências, quando houver.
```
