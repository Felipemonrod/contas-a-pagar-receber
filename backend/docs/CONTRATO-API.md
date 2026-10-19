# Contrato da API — Contas a Pagar e a Receber

Referência para quem consome esta API. Todos os exemplos são respostas reais capturadas da aplicação em execução.

**Base:** `http://localhost:8080/api`
**Formato:** JSON · datas em `yyyy-MM-dd` · valores decimais com ponto

---

## Convenções de resposta

| Situação | Status | Corpo |
|---|---|---|
| Consulta | 200 | recurso ou lista |
| Criação | 201 | recurso criado, header `Location` |
| Exclusão sem retorno | 204 | vazio |
| Dados inválidos | 400 | erro com lista de campos |
| Recurso inexistente | 404 | erro |
| Conflito de integridade | 409 | erro |
| Regra de negócio violada | 422 | erro |

**Formato de erro** (igual em todos os casos):

```json
{
  "timestamp": "2026-10-02T20:23:05.536-03:00",
  "status": 422,
  "erro": "REGRA_NEGOCIO",
  "mensagem": "A categoria 'PASSIVO CIRCULANTE' e consolidada e nao aceita lancamento.",
  "campos": []
}
```

Em erro 400, `campos` traz `[{ "campo": "valor", "mensagem": "O valor deve ser maior que zero" }]`.
Nos demais, `campos` é `[]` e a mensagem já é legível para o usuário final.

---

## 1. Pessoas — `/api/pessoas`

> **Atenção:** não existem endpoints separados de cliente e fornecedor. A API tem **uma** entidade `Pessoa`, e o papel é uma lista. Uma pessoa pode ser `CLIENTE`, `FORNECEDOR` ou ambos.

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/pessoas` | filtros `?nome=` e `?papel=CLIENTE\|FORNECEDOR` — **combináveis** |
| GET | `/api/pessoas/{id}` | |
| POST | `/api/pessoas` | 201 |
| PUT | `/api/pessoas/{id}` | substitui telefones e endereços |
| DELETE | `/api/pessoas/{id}` | **inativa**, não exclui; devolve 200 com o recurso |

**POST — corpo:**

```json
{
  "nome": "Greensoft Informatica Ltda",
  "documento": "33.537.659/0007-11",
  "papeis": ["FORNECEDOR", "CLIENTE"],
  "inscricaoEstadual": null,
  "email": "contato@greensoft.com.br",
  "contato": "Wilson",

  "condicaoPagamento": "30/60/90 dias",
  "descontoNegociado": "5% a vista",
  "prazoEntregaDias": 15,
  "vendedor": "Wilson Souza",

  "telefones": [
    { "numero": "(11) 5585-4975", "ramal": "201", "tipo": "COMERCIAL" },
    { "numero": "(11) 5584-2545", "tipo": "FAX" }
  ],
  "enderecos": [
    { "logradouro": "Av. Paulista", "numero": "1439", "complemento": null,
      "bairro": "Bela Vista", "cep": "01311-200",
      "cidade": "Sao Paulo", "uf": "SP", "principal": true }
  ]
}
```

Obrigatórios: `nome`, `documento` (único), `papeis` (não vazio). Em endereço: `logradouro`, `cidade`, `uf`. Em telefone: `numero`.

**Dados comerciais** (`condicaoPagamento`, `descontoNegociado`, `prazoEntregaDias`, `vendedor`) vêm do `Fornecedor.db` do livro (cap. 5, p. 72) e só fazem sentido para quem tem o papel `FORNECEDOR`. São opcionais e ficam nulos para clientes. `prazoEntregaDias` é o prazo em dias, não aceita negativo — zero significa entrega imediata.

Telefones e endereços são devolvidos **na ordem em que foram cadastrados**.

**Resposta (201):**

```json
{
  "id": 1,
  "nome": "Greensoft Informatica Ltda",
  "documento": "33.537.659/0007-11",
  "inscricaoEstadual": null,
  "email": "contato@greensoft.com.br",
  "contato": "Wilson",
  "ativo": true,
  "condicaoPagamento": "30/60/90 dias",
  "descontoNegociado": "5% a vista",
  "prazoEntregaDias": 15,
  "vendedor": "Wilson Souza",
  "papeis": ["FORNECEDOR", "CLIENTE"],
  "telefones": [
    { "id": 1, "numero": "(11) 5585-4975", "ramal": "201", "tipo": "COMERCIAL" },
    { "id": 2, "numero": "(11) 5584-2545", "ramal": null, "tipo": "FAX" }
  ],
  "enderecos": [
    { "id": 1, "logradouro": "Av. Paulista", "numero": "1439", "complemento": null,
      "bairro": "Bela Vista", "cep": "01311-200",
      "cidade": "Sao Paulo", "uf": "SP", "principal": true }
  ]
}
```

---

## 2. Plano de Contas — `/api/plano-contas`

Categorias financeiras hierárquicas. Conta **consolidada** agrupa outras e não aceita lançamento; conta **analítica** aceita.

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/plano-contas` | árvore, com `subcontas` recursivas |
| GET | `/api/plano-contas/analiticas` | lista plana, só as que aceitam lançamento — **use para preencher combos** |
| GET | `/api/plano-contas/{id}` | |
| POST | `/api/plano-contas` | 201 |
| PUT | `/api/plano-contas/{id}` | |
| DELETE | `/api/plano-contas/{id}` | 204; falha se tiver subcontas |

**GET — resposta (árvore):**

```json
[
  { "id": 1, "codigo": "1", "descricao": "ATIVO", "consolidada": true,
    "codigoSuperior": null,
    "subcontas": [
      { "id": 3, "codigo": "11", "descricao": "ATIVO CIRCULANTE", "consolidada": true,
        "codigoSuperior": "1",
        "subcontas": [
          { "id": 5, "codigo": "11.01", "descricao": "Caixa", "consolidada": false,
            "codigoSuperior": "11", "subcontas": [] }
        ] }
    ] }
]
```

**POST — corpo:** `{ "codigo": "21.07", "descricao": "Internet", "codigoSuperior": "21", "consolidada": false }`

**Dados já carregados pela migration** (ids estáveis em base nova):

| id | código | descrição | consolidada |
|---|---|---|---|
| 1 | 1 | ATIVO | sim |
| 2 | 2 | PASSIVO | sim |
| 3 | 11 | ATIVO CIRCULANTE | sim |
| 4 | 21 | PASSIVO CIRCULANTE | sim |
| 5 | 11.01 | Caixa | não |
| 6 | 11.02 | Bancos c/ Movimento | não |
| 7 | 11.03 | Clientes a Receber | não |
| 8 | 21.01 | Fornecedores | não |
| 9 | 21.02 | Duplicatas a Pagar | não |
| 10 | 21.03 | Energia Eletrica | não |
| 11 | 21.04 | Agua | não |
| 12 | 21.05 | Telefone | não |
| 13 | 21.06 | Condominio | não |

---

## 3. Contas a Pagar — `/api/contas-pagar`

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/contas-pagar` | filtros `?situacao=&de=&ate=` (período de vencimento) |
| GET | `/api/contas-pagar/{id}` | |
| GET | `/api/contas-pagar/inadimplentes` | vencidos em aberto |
| GET | `/api/contas-pagar/{id}/simulacao?data=` | **não grava nada** — prévia do valor devido |
| POST | `/api/contas-pagar` | 201 |
| PUT | `/api/contas-pagar/{id}` | atualiza **todos** os campos, inclusive `numeroTitulo` e `pessoaId`; falha se já houver pagamento |
| POST | `/api/contas-pagar/{id}/pagamento` | registra quitação, total ou parcial |
| DELETE | `/api/contas-pagar/{id}` | **cancela**, devolve 200 com o recurso |

**POST — corpo:**

```json
{
  "numeroTitulo": "DUP-123456",
  "pessoaId": 1,
  "tipoTitulo": "DUPLICATA",
  "valor": 1000.00,
  "emissao": "2026-09-01",
  "vencimento": "2026-10-10",
  "desconto": 50.00,
  "validadeDesconto": "2026-10-05",
  "acrescimoDia": 2.00,
  "observacao": null,
  "rateios": [
    { "planoContaId": 10, "valor": 600.00 },
    { "planoContaId": 13, "valor": 400.00 }
  ]
}
```

`tipoTitulo`: `DUPLICATA` · `NOTA_PROMISSORIA` · `OUTROS`
`rateios` é opcional, mas se vier, **a soma precisa ser igual a `valor`**.

**Resposta:**

```json
{
  "id": 1, "numeroTitulo": "DUP-123456",
  "pessoaId": 1, "pessoaNome": "Greensoft Informatica Ltda",
  "tipoTitulo": "DUPLICATA", "situacao": "ABERTA",
  "valor": 1000.00, "totalPago": 0, "saldoDevedor": 1000.00,
  "emissao": "2026-09-01", "vencimento": "2026-10-10",
  "desconto": 50.00, "validadeDesconto": "2026-10-05", "acrescimoDia": 2.00,
  "observacao": null,
  "rateios": [
    { "planoContaId": 10, "categoria": "21.03 - Energia Eletrica", "valor": 600.00 }
  ],
  "pagamentos": []
}
```

**Simulação** `GET /api/contas-pagar/1/simulacao?data=2026-10-03`:

```json
{ "dataSimulada": "2026-10-03", "valorOriginal": 1000.00,
  "descontoAplicado": 50.00, "acrescimoAplicado": 0, "valorDevido": 950.00 }
```

**Quitação** `POST /api/contas-pagar/1/pagamento`:

```json
{ "dataPagamento": "2026-10-03", "formaPagamento": "PIX",
  "valorPago": 400.00, "observacao": null }
```

`valorPago` é **opcional** — omitindo, o sistema cobra o valor devido integral com desconto ou juros da data.
`formaPagamento`: `DINHEIRO` · `PIX` · `BOLETO` · `TRANSFERENCIA` · `CHEQUE` · `CARTAO`

---

### Observações sobre o PUT

- Atualiza **todos** os campos do corpo, inclusive `numeroTitulo`, `pessoaId` e `tipoTitulo`.
- Trocar o `numeroTitulo` para um já existente devolve **422**.
- Trocar a `pessoaId` para quem não tem o papel exigido devolve **422** (a RN04 vale também na alteração).
- O `rateios` é **reconciliado**: as categorias que permanecem são atualizadas, as que saíram do corpo são removidas e só as novas são criadas. Reenviar o mesmo rateio é seguro.
- Omitir `rateios` remove todos os rateios do título.

---

## 4. Contas a Receber — `/api/contas-receber`

Espelho exato de contas a pagar. Diferenças nos nomes:

| Contas a pagar | Contas a receber |
|---|---|
| `POST /{id}/pagamento` | `POST /{id}/recebimento` |
| `dataPagamento` | `dataRecebimento` |
| `valorPago` | `valorRecebido` |
| `totalPago` | `totalRecebido` |
| `pagamentos[]` | `recebimentos[]` |
| situação final `PAGA` | situação final `RECEBIDA` |

A pessoa precisa ter o papel **CLIENTE** (em contas a pagar, **FORNECEDOR**).

---

## 5. Despesas — `/api/despesas`

Previsão de gasto fixo que depois vira título a pagar.

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/despesas` | `?previstas=true` traz só as que não viraram título |
| GET | `/api/despesas/{id}` | |
| POST | `/api/despesas` | 201 |
| PUT | `/api/despesas/{id}` | falha se já virou título |
| POST | `/api/despesas/{id}/gerar-titulo` | converte em conta a pagar |
| DELETE | `/api/despesas/{id}` | 204 |

**POST:** `{ "planoContaId": 10, "descricao": "Conta de Luz - dezembro", "valorPrevisto": 150.00, "previsaoPagamento": "2026-12-12" }`

**Gerar título:** `{ "numeroTitulo": "ENEL-778899", "pessoaId": 1, "valor": 187.45, "emissao": "2026-12-01", "vencimento": "2026-12-15", "tipoTitulo": "OUTROS" }`

**Resposta:** inclui `realizada` (boolean), `contaPagarId` e `numeroTitulo` quando já convertida.

---

## 6. Relatórios — `/api/relatorios`

Todos aceitam `?de=&ate=`. Sem datas, usam o mês corrente.

**`/resumo`:**

```json
{
  "de": "2026-09-01", "ate": "2026-12-31",
  "contasAPagar": { "quantidadeTitulos": 2, "valorTotal": 1187.45, "valorQuitado": 950.00,
                    "saldoEmAberto": 187.45, "quantidadeVencidos": 0, "valorVencido": 0 },
  "contasAReceber": { "quantidadeTitulos": 1, "valorTotal": 800.00, "valorQuitado": 760.00,
                      "saldoEmAberto": 0, "quantidadeVencidos": 0, "valorVencido": 0 },
  "saldoProjetado": -387.45, "saldoRealizado": -190.00
}
```

**`/por-categoria`:**

```json
[
  { "codigo": "11.03", "descricao": "Clientes a Receber", "totalAPagar": 0, "totalAReceber": 800.00 },
  { "codigo": "21.03", "descricao": "Energia Eletrica", "totalAPagar": 787.45, "totalAReceber": 0 }
]
```

**`/inadimplencia`:** `{ "posicaoEm": "...", "totalAPagarVencido": 0, "totalAReceberVencido": 0, "titulos": [{ "origem": "CONTA_A_PAGAR", "numeroTitulo": "...", "pessoa": "...", "vencimento": "...", "diasAtraso": 5, "saldoDevedor": 100.00 }] }`

---

## 7. Cadastro bancário (livro, cap. 9)

Cadeia de três níveis: um banco tem várias agências, uma agência tem várias contas.

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/bancos` | filtro `?nome=`; traz as agências e contas aninhadas |
| GET | `/api/bancos/selecao` | lista plana, para combos |
| GET POST | `/api/bancos` · `/api/bancos/{id}` | PUT e DELETE também; DELETE falha se tiver agências |
| GET POST | `/api/agencias` | filtro `?bancoId=` |
| PUT DELETE | `/api/agencias/{id}` | DELETE falha se tiver contas |
| GET POST | `/api/contas-correntes` | filtro `?agenciaId=` |
| GET | `/api/contas-correntes/ativas` | para combos |
| PUT DELETE | `/api/contas-correntes/{id}` | **DELETE desativa**, não exclui — cheques dependem da conta |

**POST banco:** `{ "codigo": "341", "nome": "Banco Itau S/A" }` — código único, até 4 caracteres.

**POST agência:** `{ "bancoId": 1, "numero": "1234", "nome": "Agencia Jabaquara", "gerente": "...", "telefone": "...", "ramal": "...", "fax": "...", "email": "...", "endereco": "..." }`
O número é único **dentro do banco**, não globalmente.

**POST conta corrente:** `{ "agenciaId": 1, "numero": "56789-0", "tipo": "CORRENTE", "limite": 5000.00 }`
A resposta traz `identificacao` pronta para exibir: `"341 / 1234 / 56789-0"`.

---

## 8. Cartórios e remessa para protesto (livro, cap. 10 e 17)

| Método | Rota | Observação |
|---|---|---|
| GET POST | `/api/cartorios` | PUT e DELETE em `/{id}`; DELETE falha se tiver remessas |
| GET | `/api/remessas-cartorio` | filtros `?cartorioId=` e `?emAberto=true` |
| POST | `/api/remessas-cartorio` | envia título a protesto |
| POST | `/api/remessas-cartorio/{id}/protesto` | registra o protesto |
| POST | `/api/remessas-cartorio/{id}/baixa` | baixa o protesto |

**POST remessa:** `{ "cartorioId": 1, "contaReceberId": 3, "dataRemessa": "2026-10-01", "observacao": null }`
`dataRemessa` é opcional — sem ela, usa hoje.

**RN09 aplicada:** só vai a protesto título **vencido** e **não quitado**. Tentar com título a vencer, quitado ou cancelado devolve **422**. Um título só pode estar em uma remessa.

A `situacao` da remessa é derivada das datas: `ENVIADA` → `PROTESTADA` → `BAIXADA`.

---

## 9. Lançamento contábil (livro, cap. 12)

Partida dobrada: toda movimentação sai de uma conta e entra em outra.

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/lancamentos` | filtros `?de=&ate=` e `?status=` |
| GET | `/api/lancamentos/por-conta/{planoContaId}` | extrato da conta, dos dois lados |
| GET POST | `/api/lancamentos` · `/{id}` | |
| DELETE | `/api/lancamentos/{id}` | **estorna**, não apaga; devolve 200 com `status: ESTORNADO` |

**POST:** `{ "contaCreditoId": 5, "contaDebitoId": 8, "valor": 511.45, "descricao": "Pagamento a fornecedor", "data": "2026-10-18" }`

**Regras:** crédito e débito precisam ser contas **diferentes** (422), e ambas precisam ser **analíticas** — conta consolidada não aceita lançamento (422, RN01).

---

## 10. Cheque pré-datado (livro, cap. 16)

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/cheques` | filtros `?situacao=`, `?pessoaId=`, `?de=&ate=` (por depósito) |
| GET | `/api/cheques/a-depositar` | em carteira com data de depósito já vencida |
| GET POST | `/api/cheques` · `/{id}` | PUT só enquanto `EM_CARTEIRA` |
| POST | `/api/cheques/{id}/situacao` | move no ciclo |
| DELETE | `/api/cheques/{id}` | só enquanto `EM_CARTEIRA` |

**POST:** `{ "numeroCheque": "123456", "pessoaId": 1, "contaCorrenteId": 1, "emissao": "2026-10-01", "deposito": "2026-11-15", "valor": 1200.00, "contaReceberId": null, "descricao": "..." }`

`contaReceberId` é opcional — vincula o cheque ao título que ele garante.

**Ciclo:** `EM_CARTEIRA` → `DEPOSITADO` → `COMPENSADO` ou `DEVOLVIDO`.
Cheque **compensado não muda mais** de situação (422). O emitente precisa ter o papel `CLIENTE`. O número é único por conta corrente.

A resposta traz `vencido: true` quando o cheque segue em carteira com a data de depósito já passada.

---

## 11. Situações possíveis

`ABERTA` · `PARCIAL` · `PAGA` · `RECEBIDA` · `VENCIDA` · `CANCELADA`

---

## 8. Regras que a API aplica e o consumidor precisa tratar

| Regra | Efeito |
|---|---|
| RN01 | Rateio em categoria consolidada → **422** |
| RN04 | Título a pagar exige papel FORNECEDOR; a receber, CLIENTE → **422** |
| RN05 | Desconto só vale até `validadeDesconto`; após o vencimento aplica `acrescimoDia` × dias |
| RN07 | Quitar título já quitado → **422** |
| RN10 | Desconto concedido uma única vez por título |
| RN11 | Alterar ou cancelar título com pagamento → **422** |
| RN12 | Soma do rateio diferente do valor → **422** |
| RN13 | Pessoa é inativada, nunca excluída |
| — | `numeroTitulo` e `documento` são únicos → **422** em duplicidade |
| — | Vencimento anterior à emissão → **422** |

As mensagens de erro já vêm em português e legíveis — podem ser exibidas direto ao usuário.

---

## 12. Cobertura do livro

**As 13 tabelas do livro estão implementadas.** O sistema cobre os capítulos 7 a 18.

Diferenças deliberadas em relação ao original, todas documentadas:

| No livro | Aqui | Por quê |
|---|---|---|
| Cliente.db e Fornecedor.db separados | `pessoa` com papel N:N | As estruturas eram quase idênticas |
| Agência tinha o número como chave | Chave artificial, único por banco | Permite mesmo número em bancos diferentes |
| Cheque guardava banco, agência e conta soltos | Aponta para `conta_corrente` | Impede cheque apontar para conta de outra agência |
| Remessa referenciava o título por texto | Chave estrangeira | Impede remessa de título inexistente |
| Situação derivada das datas | Dado explícito | Exigência do enunciado |

---

## 10. CORS

**Já configurado.** A API aceita requisições das origens:

```
http://localhost:5173   http://127.0.0.1:5173    (Vite, padrão)
http://localhost:3000   http://127.0.0.1:3000
```

Métodos liberados: `GET POST PUT DELETE OPTIONS`, todos os headers.

Verificado com preflight real:

```
OPTIONS /api/pessoas   Origin: http://localhost:5173
→ HTTP 200
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
```

Para liberar outra porta, edite `cpr.cors.origens` em `application.properties` no backend.
