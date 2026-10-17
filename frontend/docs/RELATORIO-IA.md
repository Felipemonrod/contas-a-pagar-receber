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
