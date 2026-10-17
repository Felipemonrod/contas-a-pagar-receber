# Contas a Pagar e a Receber

Implementação do Figma em **React + TypeScript + CSS**, com Vite. Mantém a barra lateral em pastas, as faixas `#000080`, as abas azuis e o relevo dos controles no estilo Delphi.

## Executar

Requer Node.js 22.12 ou superior.

```sh
npm install
npm run dev
```

Abra o endereço informado no terminal. O menu inicial fica em `/#/inicio`; o cadastro de clientes, em `/#/clientes`.

```sh
npm test        # testes dos fluxos e formulários
npm run build  # compilação TypeScript e versão de produção em dist/
npm run preview
node scripts/verify-assets.mjs
```

## O que está implementado

- Menu principal e 12 telas acessíveis pela barra lateral.
- Pastas principais marrons com etiquetas azuis de uma única inclinação, usando os vetores originais do Figma.
- Estados normal, hover, pressionado e foco por teclado. O pressionado inverte o relevo e desloca o texto em 2 px.
- Inclusão e edição nos 11 formulários correspondentes; confirmação de exclusão nos controles previstos.
- Campos agrupados, separadores pretos, relações com os cadastros, busca sem distinção de acentos e ordenação de clientes.
- Plano de contas recolhível; duplo clique numa conta permite editá-la. Inclusão contínua mantém o formulário aberto.
- Relatórios com seleção de origem, filtro de período para registros com data e impressão.
- Modais com foco inicial, contenção do teclado pelo diálogo nativo, Escape e retorno do foco ao botão de origem.
- Layout adaptado a telas menores, menu lateral recolhido e rolagem interna nas tabelas.

## Dados

Os registros iniciais são exemplos do Figma. As alterações ficam no `localStorage` do navegador, na chave `contas-financeiro-v1`. Não há API, autenticação, conciliação ou integração bancária. Os valores e ações são de demonstração; não executam pagamentos nem enviam títulos a cartórios.

A ligação com um servidor pode ser feita substituindo a leitura/gravação em `src/data.ts` e `src/App.tsx` por uma camada de API. A persistência atual pertence apenas ao navegador usado, não é compartilhada entre usuários e pode ser apagada ao limpar seus dados.

## Arquivos

- `src/App.tsx`: navegação, telas, ações e relatórios.
- `src/components.tsx`: barra lateral, botões, tabelas e diálogo.
- `src/RecordForm.tsx`: campos e validações dos formulários.
- `src/form-layouts.json`: agrupamento dos campos extraído do Figma.
- `src/data.ts`: configuração das telas, exemplos e persistência.
- `src/styles.css`: tema, efeitos de clique e layout adaptável.
- `src/assets.json` e `public/assets/`: vetores locais e suas dimensões originais.
- `src/App.test.tsx`: testes de navegação, cadastro, busca, exclusão, vínculos e relatórios.

Os arquivos em `sources/` são referências sincronizadas e foram preservados.
