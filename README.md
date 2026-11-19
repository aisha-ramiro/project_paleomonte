# project_paleomonte

Repositório para a construção e desenvolvimento do projeto PaleoMonte, ligado às disciplinas de Gerenciamento de Projetos e Engenharia de Software III, em colaboração com o Museu de Paleontologia de Monte Alto.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

## Testes

Os testes de regras e serviços usam o runner nativo do Node:

```bash
npm test
```

A suíte Cypress reproduz os cenários registrados na documentação consolidada: quatro testes E2E para preferências de acessibilidade, limites de escala, indisponibilidade do painel sem Supabase e entrada de busca semelhante a XSS; e dois testes de componente para busca sem acentos e orientação de permissões na Central de Ajuda.

Para executar os testes E2E, inicie o modo de teste em um terminal:

```bash
npm run dev:cypress
```

Em outro terminal, execute:

```bash
npm run cy:e2e
```

Os testes de componente iniciam o servidor Vite de teste pelo Cypress:

```bash
npm run cy:ct
```

Para abrir o Cypress em modo interativo, use `npm run cy:open`. A suíte atual não usa contas, chaves ou dados do Supabase. O arquivo `.env.cypress` mantém as variáveis do navegador vazias; `cypress.env.json`, destinado a configurações locais futuras, está no `.gitignore`.

Consulte [Documentacao_Tecnica.md](Documentacao_Tecnica.md) para a configuração completa, os escopos e as limitações dos testes.
