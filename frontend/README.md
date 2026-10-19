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
npm run relatorio  # gera docs/relatorio/RELATORIO.pdf
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

**Todas as telas que têm endpoint estão integradas à API**, com estados de
carregando, vazio e erro. Para usá-las, suba o back-end antes (veja abaixo).

| Tela | Endpoint | O que faz |
|---|---|---|
| Clientes | `/api/pessoas?papel=CLIENTE` | lista, busca, cadastra e edita |
| Fornecedores | `/api/pessoas?papel=FORNECEDOR` | lista, busca, cadastra e edita |
| Pagamentos | `/api/contas-pagar` | lança, quita e acompanha títulos |
| Recebimentos | `/api/contas-receber` | lança, recebe e acompanha títulos |
| Plano de Contas | `/api/plano-contas` | árvore de categorias, cadastro e edição |
| Despesas | `/api/despesas` | previsões de gasto e geração de título |
| Relatórios | `/api/relatorios` | posição do período, por categoria e inadimplência |
| Bancos | `/api/bancos` | cadeia banco > agência > conta corrente, em árvore |
| Cartórios | `/api/cartorios` | cadastro usado pela remessa a protesto |
| Lançamentos | `/api/lancamentos` | partida dobrada, com estorno |
| Cheque Pré-Datado | `/api/cheques` | cadastro e ciclo do cheque |
| Remessa p/ Cartório | `/api/remessas-cartorio` | envio a protesto, protesto e baixa |

Duas telas servem dois cadastros cada, porque na API são a mesma coisa:

- **Clientes e Fornecedores** são a mesma `Pessoa`; muda só o papel.
- **Pagamentos e Recebimentos** são o mesmo título visto dos dois lados do
  caixa; os endpoints são espelhados.

Em títulos, lançar e quitar são ações separadas, porque são dois endpoints.
A quitação tem janela própria e mostra antes a prévia do valor devido, vinda
de `/simulacao`, com desconto ou juros já aplicados na data escolhida.

Em Despesas, "Gerar Título" converte a previsão de gasto num título a pagar,
com o valor real da fatura.

**As doze telas de cadastro consomem a API.** Nenhuma depende mais do
`localStorage`: as cinco que faltavam foram integradas quando o back-end
implementou os capítulos 9, 10, 12, 16 e 17 do livro.

### Baixas: o que cada botão faz de verdade

Nos títulos, nas pessoas e nos lançamentos, o `DELETE` da API **não apaga o
registro** — ele muda a situação, porque o histórico depende de a linha
continuar existindo. Os botões dizem o que acontece:

| Botão | Tela | Efeito |
|---|---|---|
| Cancelar | Pagamentos, Recebimentos | situação vira `CANCELADA`, a linha fica na lista |
| Inativar | Clientes, Fornecedores | fica `ativo = false`, os títulos continuam válidos |
| Excluir | Lançamentos | vira `ESTORNADO`, o lançamento fica na lista |
| Exclusão | Plano de Contas | aí sim a categoria some, se não tiver subcontas |

Duas recusas vêm do servidor e aparecem como ele as escreve: cancelar título
que já tem pagamento (regra RN11) e excluir banco que ainda tem agência.

Não há autenticação, conciliação nem integração bancária; nenhuma ação
executa pagamento de verdade.

### Subir a API

Em dois terminais, dentro de `backend/`:

```sh
docker compose up -d
mvnw.cmd spring-boot:run
```

A API sobe em `http://localhost:8080`, endereço definido em `BASE_URL`, no
arquivo `src/api/http.ts`. O CORS já libera as portas 5173 e 3000. Com a API
fora do ar, a tela de Clientes mostra um aviso com a opção de tentar de novo.

### Como a integração está organizada

```
Tela (nomes do livro)  <->  Adapter  <->  Cliente HTTP  <->  API
```

As telas continuam usando os nomes do livro ("Registro", "Cliente") e não
sabem que a API usa `id` e `nome`. A tradução fica nos adapters.

Uma exceção: o campo do documento, que no livro se chama "CGC", aparece na
tela como **CPF / CNPJ**. O CGC foi substituído pelo CNPJ em 1998, e o livro
é dessa época; os dois nomes juntos porque na API é um campo único,
`documento`, que aceita tanto CPF quanto CNPJ.

Os detalhes e as decisões estão em `docs/RELATORIO-IA.md`.

## Arquivos

- `src/App.tsx`: navegação por hash, título da página e faixa de avisos.
- `src/components.tsx`: barra lateral, botões, tabelas e diálogo.
- `src/RecordForm.tsx`: campos e validações dos formulários.
- `src/form-layouts.json`: agrupamento dos campos extraído do Figma.
- `src/data.ts`: configuração das telas, colunas e ações da barra.
- `src/api/`: tipos do contrato, cliente HTTP e uma função por endpoint.
- `src/adapters/`: tradução entre o formato da tela e o da API.
- `src/hooks/useRecurso.ts`: estado de carregando, erro e dados de uma busca.
- `src/ui/estados.tsx`: avisos de carregando, vazio e erro.
- `src/screens/PessoasScreen.tsx`: tela de Clientes e Fornecedores.
- `src/screens/TitulosScreen.tsx`: tela de Pagamentos e Recebimentos.
- `src/screens/operacoes-de-titulo.ts`: liga cada lado do caixa à sua API.
- `src/screens/JanelaDeQuitacao.tsx`: quitação com prévia do valor devido.
- `src/screens/PlanoContasScreen.tsx`: árvore de categorias, por recursão.
- `src/screens/DespesasScreen.tsx` e `JanelaGerarTitulo.tsx`: despesas previstas.
- `src/screens/Reports.tsx`: relatórios consolidados da API.
- `src/screens/BancosScreen.tsx`: cadeia banco > agência > conta, em árvore.
- `src/screens/CartoriosScreen.tsx`: cadastro de cartórios.
- `src/screens/LancamentosScreen.tsx`: partida dobrada, com estorno.
- `src/screens/ChequesScreen.tsx` e `JanelaDeSituacao.tsx`: ciclo do cheque.
- `src/screens/RemessasScreen.tsx`: envio a protesto, protesto e baixa.
- `src/test-utils/apiFalsa.ts`: API em memória usada pelos testes.
- `docs/RELATORIO-IA.md`: prompts, decisões e desafios da integração.
- `docs/relatorio/relatorio.html`: relatório final (design, implementação,
  integração e uso de IA); `RELATORIO.pdf` é a versão para entrega.
- `src/styles.css`: tema, efeitos de clique e layout adaptável.
- `src/assets.json` e `public/assets/`: vetores locais e suas dimensões originais.
- `src/App.test.tsx`: testes de navegação, cadastro, busca, exclusão, vínculos e relatórios.

Os arquivos em `sources/` são referências sincronizadas e foram preservados.
