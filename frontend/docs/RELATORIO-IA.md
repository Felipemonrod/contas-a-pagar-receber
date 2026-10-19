# Uso de IA no front-end

Registro dos prompts, das decisões e do que foi ajustado depois. Serve de
base para a seção 4 do relatório final e para a arguição: cada decisão aqui
tem o porquê, para que o grupo consiga defender o código.

Ferramenta: Claude (Claude Code), em 17/10/2026.

---

## 1. Prompt inicial

O prompt de abertura definiu o papel (responsável apenas pelo front-end,
`backend/` somente leitura), o contexto acadêmico, a ordem de leitura
(`CONTRATO-API.md`, depois `frontend/src/`), as exigências do enunciado
(React + TypeScript + CSS puro, sem `any`, pelo menos uma funcionalidade
integrada à API) e o diagnóstico já feito: zero chamadas HTTP, código denso
demais e divergência de nomes entre as telas e a API.

Pediu explicitamente o padrão **Adapter** e um plano antes de qualquer código.

### O que a IA respondeu antes de escrever código

Um diagnóstico medido do estado atual e uma lista de divergências separadas
em duas categorias: as que o adapter resolve sozinho (renomear campos) e as
que não resolve (diferenças de significado). Essa separação orientou todo o
trabalho seguinte.

---

## 2. Decisões de arquitetura

### 2.1 Por que o padrão Adapter

As telas foram desenhadas a partir do livro e usam "Registro", "Cliente",
"CGC". A API usa `id`, `nome`, `documento`. Sem uma camada no meio, só haveria
duas saídas: reescrever as telas (perdendo o protótipo do Figma) ou poluir os
componentes com conversões espalhadas.

O adapter concentra a tradução em funções puras, fáceis de testar sem rede e
fáceis de explicar:

```
Tela (nomes do livro)       Adapter                API
{ Registro: "1",       pessoaParaRegistro()    { id: 1,
  Cliente: "Greensoft" } registroParaPessoa()    nome: "Greensoft" }
```

### 2.2 Organização das pastas

| Pasta | Responsabilidade |
|---|---|
| `src/api/` | Tipos do contrato, cliente HTTP, tratamento de erro |
| `src/adapters/` | Tradução entre o formato da tela e o da API |
| `src/hooks/` | Estado de carregando / erro / dados |
| `src/ui/` | Componentes dos três estados |
| `src/screens/` | Telas integradas |

Nenhuma tela chama `fetch` diretamente: tudo passa por `src/api/http.ts`.

### 2.3 Endereço da API num `const`, e não em variável de ambiente

O plano previa `VITE_API_URL`. Na implementação virou uma constante exportada
em `src/api/http.ts`. Motivo: `import.meta.env` é tipado pelo Vite com um
índice `[key: string]: any`, e ler dali reintroduziria `any`, que o enunciado
proíbe. Uma constante tem tipo `string`, não precisa de configuração e é mais
simples de explicar.

### 2.4 Por que não há `any` em lugar nenhum

O corpo de uma resposta HTTP vem de fora do programa, então chega como
`unknown`. A função `pareceCorpoDeErro` em `src/api/http.ts` é o ponto onde
esse valor passa a ter tipo conhecido, checando os campos antes de usá-los.
É a alternativa correta ao `any`: o compilador continua cobrando a checagem.

---

## 3. Desafios encontrados

Pontos em que a API não bateu com a tela e foi preciso decidir alguma coisa.
Todos foram descobertos lendo o código do back-end ou testando no navegador.

### 3.1 Cliente e fornecedor são a mesma entidade

A API não tem `/api/clientes` nem `/api/fornecedores`: tem `/api/pessoas`, e
"cliente" e "fornecedor" são **papéis**. Uma pessoa pode ser os dois.

Por isso as duas telas são o mesmo componente (`PessoasScreen`), mudando só o
papel.

### 3.2 Gravar pela tela de Clientes apagava o papel de Fornecedor

O `PUT` substitui a lista de papéis inteira. A primeira versão do adapter
mandava sempre `papeis: ["CLIENTE"]`. Resultado: editar a Greensoft (que é
CLIENTE **e** FORNECEDOR) pela tela de Clientes tirava dela o papel de
fornecedor, em silêncio.

Correção: `registroParaPessoa` recebe a pessoa como ela está hoje na API e
une os papéis em vez de substituí-los. Há teste para isso.

### 3.3 Gravar apagava o segundo telefone

Mesma raiz: o `PUT` troca a lista de telefones inteira, mas o formulário do
livro mostra **um** telefone só. A Greensoft tem dois (comercial e fax), e
gravar pela tela fazia o fax desaparecer.

Detectado testando no navegador contra o banco real, não nos testes.
Correção: o adapter devolve junto tudo o que a tela não mostra — os outros
telefones, os outros endereços, o bairro e o complemento.

### 3.4 A ordem dos telefones não é confiável

Ao corrigir o item anterior, o adapter passou a editar `telefones[0]`.
Conferindo o back-end, `Pessoa.telefones` é um `Set` sem `@OrderBy`: a ordem
não é a de inserção e não é garantida. Numa leitura real o **fax** veio
primeiro. Editar pela posição teria sobrescrito o fax em vez do comercial.

Correção: o telefone exibido é escolhido pelo **tipo** (`COMERCIAL`, senão o
primeiro), por uma função usada tanto na leitura quanto na gravação, para que
a tela sempre grave exatamente o item que mostrou.

### 3.5 Os filtros `nome` e `papel` se excluem no back-end

Em `PessoaService.listar`, quando `nome` vem preenchido o `papel` é
**ignorado**. Então `GET /api/pessoas?papel=CLIENTE&nome=Fornecedor` devolve
fornecedores. Sem tratamento, buscar na tela de Clientes listaria fornecedores.

Verificado na API em execução:

```
GET /api/pessoas?papel=CLIENTE&nome=Fornecedor
-> [("Fornecedor Puro Ltda", ["FORNECEDOR"])]
```

Correção no front-end: havendo busca por nome, `listarPessoas` confere o papel
também. O ideal seria corrigir no back-end — está anotado como pedido.

### 3.6 Diferenças que o adapter resolve sozinho

- `Endereço` é um campo só na tela e dois na API (`logradouro` + `numero`).
  O adapter junta na leitura e separa na gravação, só tratando o trecho final
  como número quando ele realmente parece um número.
- Campos vazios da tela viram `undefined`, e não texto vazio.
- `ramal` é cortado em 6 caracteres, limite da coluna no banco.
- Telefone e endereço incompletos não são enviados, porque a API responderia
  400 (`logradouro`, `cidade` e `uf` são obrigatórios).

---

## 4. O que foi alterado manualmente depois da IA

- **`src/RecordForm.tsx`**: ganhou duas propriedades novas (`mensagemErro` e
  `salvando`) em vez de ser reescrito, para não quebrar as telas que ainda
  usam `localStorage`. Também passou a limitar o campo Ramal em 6 caracteres.
- **`src/App.tsx`**: o seletor de ordenação específico de clientes saiu de lá,
  porque passou a morar na tela integrada.
- **Testes**: os três testes que quebraram com a integração não foram
  apagados. Foram reescritos contra uma API falsa
  (`src/test-utils/apiFalsa.ts`) que responde como a de verdade, inclusive
  repetindo o comportamento do item 3.5. Assim continuam valendo como prova
  do contrato.
- **Dados de teste**: o registro "Papelaria Morrinhos Ltda" foi criado pela
  tela durante a validação e ficou no banco de desenvolvimento.

---

## 5. Como a integração foi validada

Com `docker compose up -d` e `mvnw.cmd spring-boot:run` no `backend/`, e
`npm run dev` no `frontend/`, pelo navegador:

| Verificação | Resultado |
|---|---|
| Listar clientes | `GET /api/pessoas?papel=CLIENTE` traz os registros do MySQL |
| Cadastrar | `POST` grava; conferido com `GET /api/pessoas/4` |
| Separar endereço | "Rua das Acacias, 275" virou `logradouro` + `numero` |
| Editar | `PUT` altera só o campo mexido; papéis e fax preservados |
| Erro 422 | Documento repetido mostra a mensagem da API no formulário |
| Erro de rede | API fora do ar mostra o estado de erro com "Tentar novamente" |
| Vazio | Busca sem resultado mostra o aviso, não uma tabela vazia |
| Papel na busca | Buscar "Fornecedor" em Clientes não lista fornecedores |

Testes automatizados: `npm test`.

---

## 6. Pedidos para o back-end

Não alteramos `backend/`. Estes pontos precisam ser repassados:

1. **`PessoaService.listar`**: combinar `nome` e `papel` em vez de tratá-los
   como alternativas. Hoje o `nome` anula o `papel`.
2. **`Pessoa.telefones` e `Pessoa.enderecos`**: incluir `@OrderBy("id")`, para
   que a ordem seja estável entre leituras.
3. **Campos de fornecedor sem lugar na API**: `Pagamento (dias)`, `Desconto`,
   `Entrega` e `Vendedor` existem na tela, vindos do livro, e não existem em
   `Pessoa`. Ou entram na API, ou saem da tela.
4. **`ContaPagarService.alterar` e `ContaReceberService.alterar` não atualizam
   `numeroTitulo` nem a pessoa.** Os dois chegam no corpo e são ignorados, e a
   API responde 200 como se tivesse gravado. Enquanto isso, os campos ficam
   somente-leitura na edição pelo front-end.
5. **Não é possível alterar um título que tenha rateio.** O método faz
   `conta.getRateios().clear()` e reinsere na mesma transação, mas a tabela tem
   `UNIQUE (conta_pagar_id, plano_conta_id)`: o Hibernate emite o INSERT antes
   do DELETE e o banco recusa com 409 "Operacao viola uma restricao do banco de
   dados". Reproduzido reenviando exatamente o mesmo rateio. Sugestão: dar
   `flush()` depois do `clear()`, ou atualizar as linhas existentes em vez de
   apagar e recriar. Até lá o front-end recusa editar título com rateio.

---

## 8. Segunda etapa: Fornecedores e Contas a Pagar

### 8.1 Fornecedores saiu quase de graça

Como cliente e fornecedor são a mesma entidade na API (item 3.1), ligar a tela
de Fornecedores foi **uma linha** em `App.tsx`: o mesmo `PessoasScreen`, com
`papel="FORNECEDOR"`. Foi o retorno concreto de ter feito o adapter genérico
por papel em vez de duplicar a tela.

### 8.2 Quatro campos de fornecedor foram retirados

`Pagamento (dias)`, `Desconto`, `Entrega` e `Vendedor` existiam no formulário
do livro e não têm campo correspondente em `Pessoa`. Ficariam no formulário
sem nunca serem gravados, o que é pior do que não existirem. Foram retirados
do `form-layouts.json`, e a coluna `Vendedor` da tabela — que ficaria sempre
vazia — deu lugar ao documento, que vem da API.

**Observação para o grupo:** `Vendedor` é o único dos quatro que teria um
destino plausível: o campo `contato` de `Pessoa`, que é justamente "a pessoa
de contato". Se o grupo preferir, é uma linha no adapter. Ficou de fora porque
muda o significado do campo, e essa é uma decisão de projeto, não técnica.

### 8.3 Um campo que a tela não mostra não pode ser apagado

O formulário de Fornecedor não tem o campo "Contato", mas a pessoa pode ter um
contato gravado. Como `registroParaPessoa` lia `valores['Contato']` e achava
vazio, o `PUT` apagaria o contato de qualquer fornecedor editado.

A correção distingue dois casos que pareciam iguais:

- o campo **existe** no formulário e está vazio → o usuário apagou de
  propósito, e o valor é removido na API;
- o campo **não existe** naquele formulário → mantém o que já está gravado.

É a mesma família dos problemas 3.2 e 3.3: o `PUT` substitui tudo, e a tela
só conhece uma parte.

### 8.4 Lançar e quitar viraram duas ações

No livro, "Data de Pagamento" é um campo do formulário de lançamento. Na API
são dois endpoints: `POST /contas-pagar` cria o título em aberto, e
`POST /contas-pagar/{id}/pagamento` registra a quitação. Além disso, a regra
RN11 recusa alterar um título que já tem pagamento.

Por isso a tela mudou: o formulário de lançamento não tem mais "Data de
Pagamento", e existe uma ação **Quitar** com janela própria. Na tabela, a
coluna "Pagamento" passou a mostrar a data do último pagamento registrado, e
foi acrescentada a coluna "Saldo".

### 8.5 A prévia antes de confirmar

A janela de quitação consulta `GET /contas-pagar/{id}/simulacao?data=`, que
**não grava nada**, e mostra valor original, desconto, acréscimo e valor
devido. A consulta é refeita a cada mudança de data.

Isso tornou visível a diferença do item 8.6. Conferido na tela, com um título
de R$ 1.500,00, desconto de R$ 50,00 válido até 10/11 e acréscimo de R$ 1,50
por dia:

| Data do pagamento | Desconto | Acréscimo | Valor devido |
|---|---|---|---|
| 05/11/2026 (na validade) | R$ 50,00 | R$ 0,00 | R$ 1.450,00 |
| 25/11/2026 (10 dias de atraso) | R$ 0,00 | R$ 15,00 | R$ 1.515,00 |

### 8.6 "Valor do Acréscimo" não era um valor total

O campo do livro sugeria um acréscimo único. Na API, `acrescimoDia` é
cobrado **por dia** de atraso. Adaptar pelo nome teria gravado um valor com
significado errado, sem erro nenhum aparecendo. O rótulo da tela passou a ser
**"Acréscimo por Dia"**. A tabela acima é a confirmação: 10 dias × R$ 1,50
deram exatamente R$ 15,00.

### 8.7 "Tipo" oferecia opções que a API recusa

A tela listava Duplicata, Boleto, Nota Fiscal, Recibo e Outros. A API aceita
apenas `DUPLICATA`, `NOTA_PROMISSORIA` e `OUTROS`. Escolher "Boleto" daria
erro na gravação. A lista agora sai do próprio adapter (`TIPOS_DE_TITULO`),
que também faz a tradução rótulo ↔ código nos dois sentidos.

### 8.8 Nome na tela, id na API

O formulário mostra "Nome do Fornecedor"; a API quer `pessoaId`. A tela carrega
os fornecedores de `/api/pessoas?papel=FORNECEDOR` e os entrega ao formulário
já no formato dele — reaproveitando `pessoaParaRegistro` —, de modo que o
`RecordForm` não precisou ser alterado. Na gravação, `acharFornecedorPorNome`
resolve o id; sem correspondência, a tela avisa em vez de mandar id inválido.

### 8.9 Erro antigo continuava na tela

Na validação pelo navegador, a mensagem de erro da API permanecia visível
mesmo depois de o usuário corrigir a data. Agora qualquer alteração nos campos
da janela de quitação limpa o erro anterior.

### 8.10 Validação no navegador, contra o banco real

| Verificação | Resultado |
|---|---|
| Listar fornecedores | `GET /api/pessoas?papel=FORNECEDOR` traz os dois do banco |
| Editar fornecedor | Só a Inscrição Estadual mudou; `contato`, papéis, os dois telefones e o bairro ficaram intactos |
| Listar títulos | `GET /api/contas-pagar` com valores e datas em formato pt-BR |
| Lançar título | `POST` gravou com `pessoaId: 3` e `tipoTitulo: DUPLICATA`, resolvidos pelo adapter |
| Prévia da quitação | Desconto e acréscimo mudam conforme a data escolhida |
| Quitação parcial | R$ 100,00 em título de R$ 187,45 → situação `PARCIAL`, saldo R$ 87,45 |
| Erro 422 (data) | Pagamento antes da emissão: mensagem da API na janela |
| Erro 422 (RN11) | Alterar título com pagamento: "Titulo com pagamento registrado nao pode ser alterado." |

### 8.11 Dados deixados no banco de desenvolvimento

Além da "Papelaria Morrinhos Ltda" da etapa anterior, a validação deixou o
título `TESTE-FRONT-01` (R$ 1.500,00, em aberto) e uma quitação parcial de
R$ 100,00 no título `ENEL-778899`. Para zerar:
`docker compose down -v && docker compose up -d` em `backend/`.

---

## 10. Terceira etapa: as quatro telas restantes

Com esta etapa, **todas as telas que têm endpoint estão integradas**.

### 10.1 Recebimentos saiu de uma generalização, não de código novo

Contas a pagar e contas a receber são o mesmo título visto dos dois lados do
caixa, e a API trata assim: os endpoints são espelhados e só mudam de nome
(`totalPago` × `totalRecebido`, `pagamentos` × `recebimentos`, PAGA ×
RECEBIDA).

Em vez de escrever uma segunda tela quase igual, as duas respostas passaram
a ser convertidas numa forma comum, `Titulo`, em `adapters/titulos.ts`. A
`ContasPagarScreen` virou `TitulosScreen`, que recebe:

- `lado`: qual papel exigir, como chamar a pessoa, qual é a situação final;
- `operacoes`: as funções de API daquele lado, em `operacoes-de-titulo.ts`.

A tela não importa nenhum módulo de API diretamente. É a mesma ideia que já
tinha funcionado em Clientes/Fornecedores, levada um passo adiante.

### 10.2 Plano de Contas: a árvore virou recursão

Era o item mais divergente do diagnóstico inicial. A árvore antiga tinha os
galhos **escritos à mão** no código, com a estrutura do livro:

```
1 ATIVO > 11 ATIVO CIRCULANTE > 111 DISPONÍVEL / 112 REALIZÁVEL
2 PASSIVO > 21 FORNECEDORES / 22 CONTAS A PAGAR
```

A do back-end é outra, e vem com as subcontas aninhadas:

```
1 ATIVO > 11 ATIVO CIRCULANTE > 11.01 Caixa, 11.02 Bancos, 11.03 Clientes
2 PASSIVO > 21 PASSIVO CIRCULANTE > 21.01 … 21.07
```

Nenhum adapter resolveria isso: os códigos são outros e a profundidade é
livre. A função `desenharConta` agora chama a si mesma para cada subconta,
então funciona com qualquer estrutura que a API devolver.

O formulário também mudou de fonte: "Conta Superior" oferecia uma lista fixa
(`111`, `112`, `21`, `22`) e agora oferece os códigos que existem de verdade.

**Defeito encontrado na validação:** nos galhos, o código e a descrição
apareciam grudados ("1ATIVO"). O espaço estava no fim de uma linha do JSX, e
o JSX apaga espaço em fim de linha. A correção foi montar o texto numa
expressão só.

### 10.3 Despesas: o campo "Lançamento" não era um número

Na tela do livro, "Lançamento" era um número solto (125, 156). Na API, o que
prende a despesa a alguma coisa é `planoContaId` — a categoria do plano de
contas. O campo virou uma escolha de categoria, que é o que ele significa.

A lista vem de `/plano-contas/analiticas`, e não de `/plano-contas`: só
contas analíticas aceitam lançamento (regra RN01). Categorias consolidadas
nem aparecem, em vez de serem oferecidas e recusadas depois pela API.

Esta tela ganhou a ação que dá sentido ao cadastro: **Gerar Título**. A
despesa é uma previsão; quando a fatura chega, a conversão pede o valor real
e o número do título (regra RN03) e cria o título em contas a pagar.

Verificado ponta a ponta: previsão de R$ 95,00 para "Conta de Água — janeiro"
virou o título `SANEAGO-4421` de **R$ 112,37**, o valor real da fatura, e a
despesa passou a `REALIZADA`.

### 10.4 Relatórios: a tela foi refeita, não adaptada

Esta foi a maior mudança em relação ao protótipo, e a mais justificada.

A tela antiga escolhia um cadastro e listava as linhas dele, filtrando por
data **no navegador**. Os endpoints de relatório da API não devolvem linhas:
devolvem números já somados pelo back-end. Não há adapter que ligue uma
coisa na outra, e refazer as somas no front-end seria duplicar a regra, com
risco de divergir do servidor.

A tela passou a mostrar os três relatórios que a API realmente oferece:

| Endpoint | O que virou na tela |
|---|---|
| `/resumo` | dois painéis de posição (a pagar / a receber) e os dois saldos |
| `/por-categoria` | tabela de totais por categoria do plano de contas |
| `/inadimplencia` | tabela de títulos vencidos, com dias de atraso |

Conferido contra a API no mesmo período:

```
A PAGAR   titulos=3 total=2687.45 quitado=1050.00 aberto=1587.45
A RECEBER titulos=2 total=3200.00 quitado=1760.00 aberto=1400.00
saldoProjetado=512.55  saldoRealizado=710.00
```

Os mesmos números aparecem na tela.

### 10.5 Código morto removido

Integrar o Plano de Contas tornou `AccountTree.tsx` inalcançável: a rota
passa a usar a tela nova antes de chegar nele. O arquivo foi apagado, em vez
de ficar no repositório como algo que o grupo não saberia explicar.

### 10.6 Validação no navegador, contra o banco real

| Verificação | Resultado |
|---|---|
| Plano de contas | Árvore de três níveis vinda de `/api/plano-contas` |
| Cadastrar categoria | `21.08 Manutencao Predial` criada; a árvore recarregou |
| Despesas | Lista com a categoria e a situação (PREVISTA / REALIZADA) |
| Cadastrar despesa | Só categorias analíticas são oferecidas (RN01) |
| Gerar título | Previsão de R$ 95,00 virou título de R$ 112,37, valor real |
| Recebimentos | Só pessoas com papel CLIENTE são oferecidas (RN04) |
| Receber parcial | R$ 1.000,00 em título de R$ 2.400,00 → saldo R$ 1.400,00 |
| Rótulos espelhados | "Recebimento de Título", "Valor Recebido", "Cliente" |
| Relatórios | Totais na tela iguais aos da API, conferidos número a número |

### 10.7 Dados deixados no banco de desenvolvimento

A validação deixou: a categoria `21.08`, a despesa "Conta de Água — janeiro"
já convertida, o título `SANEAGO-4421` e o título a receber `NF-2026-900`
com recebimento parcial. Para zerar: `docker compose down -v && docker
compose up -d` em `backend/`.

---

## 11. Situação final das telas

| Tela | Estado |
|---|---|
| Clientes | Integrada — `/api/pessoas?papel=CLIENTE` |
| Fornecedores | Integrada — `/api/pessoas?papel=FORNECEDOR` |
| Pagamentos | Integrada — `/api/contas-pagar`, com lançamento e quitação |
| Recebimentos | Integrada — `/api/contas-receber`, mesma tela de Pagamentos |
| Plano de Contas | Integrada — `/api/plano-contas`, árvore recursiva |
| Despesas | Integrada — `/api/despesas`, com geração de título |
| Relatórios | Integrada — `/api/relatorios`, três relatórios consolidados |
| Bancos, Cartórios, Lançamentos, Cheque Pré-Datado, Remessa | Seguem em `localStorage`: a API não tem endpoint para esses assuntos (seção 9 do contrato) |

**Todas as sete telas com endpoint estão integradas.** As cinco restantes
ficam no navegador por decisão de escopo documentada, e não por falta de
tempo: os conceitos que elas tratam não existem na API.

---

## 12. "CGC" virou "CPF / CNPJ"

O protótipo trazia o campo do documento com o rótulo **CGC**, herdado do
livro. CGC era o Cadastro Geral de Contribuintes, que foi **substituído pelo
CNPJ em 1998** — justamente o ano do livro de referência. O termo não existe
mais, e ninguém que usar o sistema hoje reconheceria a sigla.

O campo não foi removido em nenhum momento: continuou nos formulários de
Cliente e de Fornecedor e na tabela de Fornecedores, sempre mapeado para
`documento` na API. O que mudou foi só o rótulo, de CGC para
**CPF / CNPJ**, em todas as telas, nos testes e no adapter.

É o único lugar em que deliberadamente **não** mantivemos o vocabulário do
livro. A razão é que nos outros casos ("Registro" em vez de "id", "Cliente"
em vez de "nome") o termo antigo continua correto, só é mais antiquado; aqui
ele está errado, porque se refere a um cadastro que foi extinto.

**Por que os dois nomes juntos.** Na API não existe um campo para CPF e
outro para CNPJ: existe `documento`, um só, e a validação do back-end diz
"O documento (CNPJ ou CPF) e obrigatorio". Rotular apenas "CNPJ" seria mais
estreito do que o campo comporta — um cliente pessoa física informa CPF no
mesmo lugar. Por isso o rótulo é **CPF / CNPJ**: um campo na tela, um campo
na API, e fica claro para o usuário que os dois servem.

Vale para a arguição: este é um caso em que a tela foi ajustada para contar
a verdade sobre a API, em vez de a API ser contornada para caber na tela.

---

## 13. Revisão antes da entrega

Uma revisão do `frontend/src` apontou cinco problemas, todos confirmados
executando o código, não só lendo. Os cinco foram corrigidos.

### 13.1 "Localizar" levava para outra tela

Em Pagamentos e Recebimentos, o botão "Localizar" navegava para
`#/relatorios` em vez de procurar. Era resto de uma cópia da tela antiga.
Agora abre uma janela de busca que filtra por número do título ou nome da
pessoa, sem acento e sem maiúscula.

A busca é feita sobre a lista já carregada, e não na API — diferente de
Clientes, onde o filtro é do servidor. O motivo é que `/api/contas-pagar`
só aceita `situacao`, `de` e `ate`: não existe filtro por nome nem por
número para títulos.

### 13.2 Editar um título apagava o rateio

O corpo do PUT não levava `rateios`, e o back-end limpa a lista antes de
reaplicar o que vier. Resultado: alterar qualquer campo de um título com
rateio apagava o rateio, com resposta 200 e sem aviso. É a mesma armadilha
que o adapter de Pessoa já tratava para telefones e endereços; aqui tinha
passado.

Ao corrigir — passando a devolver os rateios atuais — apareceu um problema
mais fundo, descrito no item 5 da seção 6: **a API não aceita receber os
mesmos rateios de volta**, porque a tabela tem `UNIQUE (conta_pagar_id,
plano_conta_id)` e a reinserção colide com a linha que ainda não foi
apagada. Ou seja, hoje não existe edição correta possível para um título
com rateio: omitir apaga, reenviar dá 409.

Decisão: a tela **recusa** abrir a edição de um título com rateio e explica
o motivo, em vez de escolher entre perder o dado e mostrar um erro de banco
que não diz nada. O adapter já devolve os rateios e está coberto por teste,
então assim que o back-end corrigir basta remover a guarda.

### 13.3 Número do título e fornecedor: editáveis, mas ignorados

`alterar` não atribui esses dois campos. O usuário trocava, gravava, via
"Título atualizado." e o valor antigo voltava. Agora os dois ficam
somente-leitura na edição, com `readOnly` no texto e `disabled` na lista.

### 13.4 Falha ao carregar fornecedores ficava invisível

Em Despesas, se `/api/pessoas?papel=FORNECEDOR` falhasse, "Gerar Título"
abria com a lista vazia e sem explicação. Agora o erro aparece na tela, com
a opção de tentar de novo — como já acontecia com as categorias.

### 13.5 Período dos relatórios fixo em 2026

Abrir a tela em 2027 mostraria zeros. O padrão passou a ser o ano corrente,
calculado da data de hoje.

### 13.6 O que os testes passaram a garantir

Subiram de 61 para 77. Os novos cobrem o adapter de títulos (13 casos) e,
nas telas: que "Localizar" filtra sem sair da página, que editar um título
com rateio é recusado sem nenhum PUT sair, e que os dois campos ignorados
pela API chegam travados ao formulário.

Para conferir que o teste do rateio pega mesmo a regressão, reintroduzi o
defeito de propósito e o teste falhou; depois restaurei a correção.

---

## 14. Quarta etapa: as cinco telas que faltavam

O back-end implementou os capítulos 9, 10, 12, 16 e 17 do livro, e com isso
as cinco telas que estavam em `localStorage` por falta de endpoint puderam
ser integradas. **Nenhuma tela de cadastro depende mais do navegador.**

Na mesma leva, o back-end corrigiu os cinco pontos que o front-end tinha
relatado (seção 13) e acrescentou a `Pessoa` os quatro dados comerciais do
fornecedor. Os contornos saíram: a edição de título com rateio voltou a
funcionar, os campos travados foram reabertos e o filtro de papel deixou de
ser conferido duas vezes.

### 14.1 Cheque Pré-Datado: três campos viraram um

A tela do livro tem Banco, Agência e Conta Corrente separados. Na API isso é
**uma** conta corrente, identificada por id, e a resposta já traz o texto
pronto (`"341 / 1234 / 56789-0"`). Os três campos viraram um, alimentado por
`/contas-correntes/ativas`.

O cheque tem ciclo, não só cadastro: `EM_CARTEIRA` → `DEPOSITADO` →
`COMPENSADO` ou `DEVOLVIDO`. Como mover é um endpoint próprio, virou uma
ação própria. A janela oferece **apenas os destinos válidos** a partir de
onde o cheque está — cheque compensado nem mostra o botão de confirmar, em
vez de deixar o usuário tentar e receber 422.

O campo `vencido` que a API devolve virou um aviso no topo da lista, para o
cheque com depósito atrasado não passar despercebido.

### 14.2 Remessa: a tela não deixa montar o que a API recusaria

A regra RN09 só permite protestar título **vencido e não quitado**. Em vez
de aceitar qualquer título e deixar a API recusar, o formulário oferece
apenas os elegíveis, de `/contas-receber/inadimplentes`, e a tela diz de
antemão quantos existem.

Validado nos dois caminhos: enviar um título já protocolado em outro
cartório mostra a mensagem da API no formulário; o ciclo completo
`ENVIADA → PROTESTADA → BAIXADA` foi percorrido contra o banco real.

### 14.3 Bancos: uma requisição, três níveis

`GET /api/bancos` devolve as agências e contas aninhadas, então uma
requisição desenha a árvore inteira. Cada nível tem a sua inclusão, porque
cada um é um endpoint diferente e precisa saber a que pai pertence — e o pai
é o nó onde o usuário clicou.

Esta é a única tela que **não** usa o `RecordForm`: os campos mudam conforme
o nível, então ela monta o próprio formulário. Por isso foi excluída do
teste que percorre os formulários de `form-layouts.json`.

Desativar conta corrente não exclui: cheques já cadastrados dependem dela.

### 14.4 Lançamento: a validação que vale a pena fazer antes

Partida dobrada exige duas contas **diferentes** e ambas **analíticas**. As
duas condições são verificáveis sem o servidor, então a tela barra antes de
chamar a API — o usuário recebe a resposta na hora.

Excluir **estorna**: a API devolve 200 com `status: ESTORNADO` e o
lançamento continua na lista. A janela de confirmação diz isso com todas as
letras, porque "excluir" sugeriria o contrário.

### 14.5 Um defeito encontrado na validação

Os combos de conta do lançamento ofereciam `"Fornecedores"` e
`"Duplicatas a Pagar"` sem código — nomes fixos herdados da versão em
`localStorage`. Não correspondiam a conta nenhuma: escolhê-los daria erro na
gravação. Foram removidos; as opções agora saem só de
`/plano-contas/analiticas`.

### 14.6 Situação final

**As doze telas de cadastro consomem a API.** Dos 17 capítulos de referência
do livro, os que têm endpoint estão todos cobertos.

Testes: 116. Typecheck limpo, build OK, nenhum `any`.
