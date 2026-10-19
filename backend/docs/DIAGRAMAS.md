# Diagramas — Arquitetura Monolítica

Diagramas em Mermaid, renderizados automaticamente pelo GitHub. Ficam versionados junto do código para que continuem corretos quando o sistema mudar.

---

## 1. Modelo de Domínio / Diagrama de Classes

Atende aos itens *modelo de domínio* e *diagrama de classes* exigidos pelo enunciado.

```mermaid
classDiagram
    class Pessoa {
        +Long id
        +String nome
        +String documento
        +Boolean ativo
        +temPapel(codigo) boolean
    }
    class Papel {
        +String codigo
        +String descricao
    }
    class Endereco {
        +String logradouro
        +String cep
        +Boolean principal
    }
    class Telefone {
        +String numero
        +String ramal
        +String tipo
    }
    class Cidade {
        +String nome
        +String uf
    }
    class PlanoConta {
        +String codigo
        +String descricao
        +Boolean consolidada
        +aceitaLancamento() boolean
    }
    class ContaPagar {
        +String numeroTitulo
        +BigDecimal valor
        +LocalDate vencimento
        +saldoDevedor() BigDecimal
        +quitado() boolean
    }
    class ContaReceber {
        +String numeroTitulo
        +BigDecimal valor
        +LocalDate vencimento
        +saldoDevedor() BigDecimal
    }
    class Pagamento {
        +LocalDate dataPagamento
        +BigDecimal valorPago
    }
    class Recebimento {
        +LocalDate dataRecebimento
        +BigDecimal valorRecebido
    }
    class RateioContaPagar {
        +BigDecimal valor
    }
    class Despesa {
        +String descricao
        +BigDecimal valorPrevisto
        +LocalDate previsaoPagamento
        +realizada() boolean
    }

    Pessoa "*" -- "*" Papel : exerce
    Pessoa "1" --> "*" Endereco
    Pessoa "1" --> "*" Telefone
    Endereco "*" --> "1" Cidade
    PlanoConta "1" --> "*" PlanoConta : superior
    Pessoa "1" --> "*" ContaPagar : fornecedor
    Pessoa "1" --> "*" ContaReceber : cliente
    ContaPagar "1" --> "*" Pagamento
    ContaReceber "1" --> "*" Recebimento
    ContaPagar "1" --> "*" RateioContaPagar
    RateioContaPagar "*" --> "1" PlanoConta
    Despesa "*" --> "1" PlanoConta
    Despesa "0..1" --> "1" ContaPagar : gera
```

---

## 2. DER — Modelo Entidade-Relacionamento

```mermaid
erDiagram
    PESSOA ||--o{ ENDERECO : possui
    PESSOA ||--o{ TELEFONE : possui
    PESSOA }o--o{ PAPEL : "pessoa_papel"
    CIDADE ||--o{ ENDERECO : localiza

    PLANO_CONTA ||--o{ PLANO_CONTA : "superior_id"

    PESSOA ||--o{ CONTA_PAGAR : fornece
    TIPO_TITULO ||--o{ CONTA_PAGAR : classifica
    SITUACAO_CONTA ||--o{ CONTA_PAGAR : estado
    CONTA_PAGAR ||--o{ RATEIO_CONTA_PAGAR : rateia
    PLANO_CONTA ||--o{ RATEIO_CONTA_PAGAR : categoriza
    CONTA_PAGAR ||--o{ PAGAMENTO : quitado_por
    FORMA_PAGAMENTO ||--o{ PAGAMENTO : meio

    PESSOA ||--o{ CONTA_RECEBER : "é cliente"
    TIPO_TITULO ||--o{ CONTA_RECEBER : classifica
    SITUACAO_CONTA ||--o{ CONTA_RECEBER : estado
    CONTA_RECEBER ||--o{ RATEIO_CONTA_RECEBER : rateia
    PLANO_CONTA ||--o{ RATEIO_CONTA_RECEBER : categoriza
    CONTA_RECEBER ||--o{ RECEBIMENTO : quitado_por
    FORMA_PAGAMENTO ||--o{ RECEBIMENTO : meio

    PLANO_CONTA ||--o{ DESPESA : categoriza
    CONTA_PAGAR |o--|| DESPESA : "origina-se de"

    BANCO ||--o{ AGENCIA : possui
    AGENCIA ||--o{ CONTA_CORRENTE : mantem

    CARTORIO ||--o{ REMESSA_CARTORIO : recebe
    CONTA_RECEBER ||--o| REMESSA_CARTORIO : "vai a protesto"

    PLANO_CONTA ||--o{ LANCAMENTO : "credito"
    PLANO_CONTA ||--o{ LANCAMENTO : "debito"
    LANCAMENTO ||--o{ DESPESA : contabiliza
    LANCAMENTO ||--o{ CONTA_PAGAR : contabiliza
    LANCAMENTO ||--o{ CONTA_RECEBER : contabiliza

    PESSOA ||--o{ CHEQUE_PRE_DATADO : emite
    CONTA_CORRENTE ||--o{ CHEQUE_PRE_DATADO : sacado_contra
    CONTA_RECEBER ||--o{ CHEQUE_PRE_DATADO : garante
```

**Cobertura do livro:** as 13 tabelas do `Cliente.db` ao `RemessaCartorio.db` estão representadas. O sistema tem 24 tabelas porque o modelo original foi normalizado — endereços, telefones, papéis, rateios e as tabelas de domínio não existiam no Paradox.

**Normalização aplicada:**

| Forma | Violação no modelo do livro | Correção |
|---|---|---|
| 1FN | `Telefone`, `Ramal`, `Fax` como colunas lado a lado | Tabela `telefone` (1:N) |
| 1FN | Endereço achatado na linha do cliente | Tabela `endereco` (1:N) |
| 2FN | — | `rateio_*` guarda o valor que depende do par (título, categoria) |
| 3FN | `Cidade` e `Estado` na linha do cliente (UF depende da cidade) | Tabela `cidade` |
| 3FN | Tipo e situação como texto na própria conta | Tabelas de domínio |

---

## 3. Diagrama de Pacotes

```mermaid
flowchart TD
    subgraph apresentacao["Apresentação"]
        C1[pessoa.Controller]
        C2[planoconta.Controller]
        C3[contapagar.Controller]
        C4[contareceber.Controller]
        C5[despesa.Controller]
        C6[relatorio.Controller]
        C7[banco.Controller]
        C8[cartorio.Controller]
        C9[lancamento.Controller]
        C10[cheque.Controller]
    end

    subgraph negocio["Negócio"]
        S1[pessoa.Service]
        S2[planoconta.Service]
        S3[contapagar.Service]
        S4[contareceber.Service]
        S5[despesa.Service]
        S6[relatorio.Service]
        S7[banco.Service]
        S8[cartorio.Service]
        S9[lancamento.Service]
        S10[cheque.Service]
        EN[shared.encargo<br/>Strategy]
    end

    subgraph persistencia["Persistência"]
        R1[(Repositories)]
    end

    subgraph transversal["Transversal"]
        EX[shared.exception]
        DO[dominio]
    end

    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4
    C5 --> S5
    C6 --> S6
    C7 --> S7
    C8 --> S8
    C9 --> S9
    C10 --> S10

    S8 --> S4
    S10 --> S7
    S10 --> S4

    S3 --> EN
    S4 --> EN
    S5 --> S3
    S6 --> R1

    S1 --> R1
    S2 --> R1
    S3 --> R1
    S4 --> R1
    S7 --> R1
    S8 --> R1
    S9 --> R1
    S10 --> R1

    S1 -.-> EX
    S3 -.-> EX
    S3 -.-> DO
    S4 -.-> DO

    MYSQL[(MySQL)]
    R1 --> MYSQL
```

> **Observação relevante para a etapa 2:** `contapagar` e `contareceber` **não dependem um do outro**. É essa independência que permite recortá-los em serviços separados.

---

## 4. Arquitetura Monolítica

```mermaid
flowchart LR
    CLI[Cliente HTTP<br/>Postman]

    subgraph app["Aplicação Spring Boot — processo único"]
        direction TB
        WEB[Camada REST<br/>Controllers]
        SRV[Camada de Negócio<br/>Services + Strategy]
        REP[Camada de Dados<br/>Repositories JPA]
        WEB --> SRV --> REP
    end

    DB[(MySQL 8.4<br/>contêiner Docker)]
    FLY[Flyway<br/>migrations]

    CLI -->|JSON| WEB
    REP -->|JDBC| DB
    FLY -.->|cria o schema na inicialização| DB
```

---

## 5. Casos de Uso

```mermaid
flowchart LR
    OPER([Operador<br/>Financeiro])

    UC1[Cadastrar cliente<br/>ou fornecedor]
    UC2[Manter plano<br/>de contas]
    UC3[Lançar título<br/>a pagar]
    UC4[Lançar título<br/>a receber]
    UC5[Simular valor<br/>devido]
    UC6[Registrar<br/>pagamento]
    UC7[Registrar<br/>recebimento]
    UC8[Cadastrar<br/>despesa prevista]
    UC9[Gerar título<br/>da despesa]
    UC10[Consultar<br/>relatórios]
    UC11[Cancelar<br/>título]
    UC12[Manter bancos,<br/>agências e contas]
    UC13[Manter<br/>cartórios]
    UC14[Enviar título<br/>a protesto]
    UC15[Registrar protesto<br/>e baixa]
    UC16[Registrar cheque<br/>pré-datado]
    UC17[Movimentar<br/>cheque]
    UC18[Lançar na<br/>contabilidade]

    OPER --> UC1
    OPER --> UC2
    OPER --> UC3
    OPER --> UC4
    OPER --> UC5
    OPER --> UC6
    OPER --> UC7
    OPER --> UC8
    OPER --> UC9
    OPER --> UC10
    OPER --> UC11

    OPER --> UC12
    OPER --> UC13
    OPER --> UC14
    OPER --> UC15
    OPER --> UC16
    OPER --> UC17
    OPER --> UC18

    UC3 -.->|requer| UC1
    UC3 -.->|requer| UC2
    UC6 -.->|inclui| UC5
    UC9 -.->|inclui| UC3
    UC14 -.->|requer| UC13
    UC14 -.->|requer| UC4
    UC16 -.->|requer| UC12
    UC18 -.->|requer| UC2
```

---

## 6. Diagrama de Sequência — Registrar pagamento

O fluxo mais importante do sistema, e o que melhor mostra o padrão Strategy em ação.

```mermaid
sequenceDiagram
    actor U as Operador
    participant C as ContaPagarController
    participant S as ContaPagarService
    participant R as ContaPagarRepository
    participant CA as CalculadoraEncargos
    participant D as DescontoPorPontualidade
    participant J as JurosPorAtraso
    participant DB as MySQL

    U->>C: POST /contas-pagar/1/pagamento
    C->>C: valida o corpo (@Valid)
    C->>S: quitar(1, request)

    Note over S: abre transação (proxy do Spring)

    S->>R: findById(1)
    R->>DB: SELECT
    DB-->>R: título
    R-->>S: ContaPagar

    alt título cancelado ou já quitado
        S-->>C: NegocioException
        C-->>U: 422 REGRA_NEGOCIO
    end

    S->>CA: calcular(título, dataPagamento)
    CA->>D: calcular(...)
    D-->>CA: desconto disponível, se no prazo
    CA->>J: calcular(...)
    J-->>CA: juros por dia de atraso
    CA-->>S: Encargos(desconto, acréscimo)

    S->>S: valorDevido = saldo - desconto + juros
    S->>S: cria Pagamento e define a situação

    S->>R: save(conta)
    R->>DB: INSERT pagamento + UPDATE conta

    Note over S: confirma a transação

    S-->>C: ContaPagarResponse
    C-->>U: 200 OK
```

---

## 7. Diagrama de Sequência — Despesa vira título (RN03)

```mermaid
sequenceDiagram
    actor U as Operador
    participant DC as DespesaController
    participant DS as DespesaService
    participant CS as ContaPagarService
    participant DB as MySQL

    Note over U: A fatura chegou com valor diferente do previsto

    U->>DC: POST /despesas/1/gerar-titulo
    DC->>DS: gerarTitulo(1, request)
    DS->>DB: SELECT despesa

    alt despesa já realizada
        DS-->>DC: NegocioException
        DC-->>U: 422 "já gerou o título X"
    end

    DS->>DS: monta ContaPagarRequest<br/>rateio integral na categoria da despesa
    DS->>CS: lancarTitulo(request)

    Note over CS: reusa a RN04 — a pessoa<br/>precisa ser fornecedor

    CS->>DB: INSERT conta_pagar + rateio
    CS-->>DS: ContaPagar
    DS->>DB: UPDATE despesa SET conta_pagar_id
    DS-->>DC: DespesaResponse
    DC-->>U: 200 OK
```

---

## 8. Diagrama de Componentes

Mostra os componentes implantáveis da aplicação e as interfaces que cada um oferece e consome. Hoje todos vivem dentro do mesmo processo — é justamente isso que caracteriza o monolito.

```mermaid
flowchart TB
    subgraph externo["Fora da aplicação"]
        NAV[["Cliente HTTP<br/>Postman"]]
        MYSQL[("MySQL 8.4<br/>contêiner Docker")]
    end

    subgraph processo["Processo único — contas_pagar.jar"]
        direction TB

        API[["«component»<br/>API REST<br/>──────────<br/>oferece: HTTP/JSON"]]

        subgraph modulos["Componentes de negócio"]
            direction LR
            MP[["«component»<br/>Pessoas"]]
            MC[["«component»<br/>Plano de Contas"]]
            MPG[["«component»<br/>Contas a Pagar"]]
            MRC[["«component»<br/>Contas a Receber"]]
            MD[["«component»<br/>Despesas"]]
            MR[["«component»<br/>Relatórios"]]
            MB[["«component»<br/>Cadastro Bancário"]]
            MCT[["«component»<br/>Cartórios e Remessa"]]
            ML[["«component»<br/>Lançamento Contábil"]]
            MCH[["«component»<br/>Cheque Pré-Datado"]]
        end

        ENC[["«component»<br/>Cálculo de Encargos<br/>──────────<br/>oferece: PoliticaEncargo"]]
        ERR[["«component»<br/>Tratamento de Erros<br/>──────────<br/>oferece: ApiExceptionHandler"]]
        PER[["«component»<br/>Persistência<br/>──────────<br/>oferece: Repositories<br/>requer: JDBC"]]
        MIG[["«component»<br/>Migrations<br/>Flyway"]]
    end

    NAV -->|HTTP/JSON| API
    API --> MP & MC & MPG & MRC & MD & MR & MB & MCT & ML & MCH

    MPG -->|requer| ENC
    MRC -->|requer| ENC
    MD -->|requer| MPG
    MR -->|requer| PER

    MCT -->|requer| MRC
    MCH -->|requer| MB
    MCH -->|requer| MRC

    MP --> PER
    MC --> PER
    MPG --> PER
    MRC --> PER
    MB --> PER
    MCT --> PER
    ML --> PER
    MCH --> PER

    API -. erros .-> ERR
    PER -->|JDBC| MYSQL
    MIG -->|DDL na inicialização| MYSQL

    style processo fill:none,stroke-dasharray: 5 5
```

**Interfaces entre componentes:**

| Componente | Oferece | Requer |
|---|---|---|
| API REST | Endpoints HTTP/JSON | Componentes de negócio |
| Pessoas | `PessoaService` | Persistência |
| Plano de Contas | `PlanoContaService` | Persistência |
| Contas a Pagar | `ContaPagarService`, `lancarTitulo` | Cálculo de Encargos, Persistência |
| Contas a Receber | `ContaReceberService` | Cálculo de Encargos, Persistência |
| Despesas | `DespesaService` | **Contas a Pagar**, Persistência |
| Relatórios | `RelatorioService` | Persistência |
| Cálculo de Encargos | `PoliticaEncargo`, `CalculadoraEncargos` | — |
| Persistência | Interfaces `*Repository` | Driver JDBC |

**Duas leituras que valem para a segunda etapa:**

1. **Despesas depende de Contas a Pagar.** É a única dependência entre componentes de negócio, e é intencional — assim a RN04 não é duplicada. Na decomposição, essa chamada em memória vira uma chamada de rede, e passa a precisar de tratamento de falha.

2. **Contas a Pagar e Contas a Receber não se conhecem.** Podem virar serviços independentes sem nenhuma reescrita.
