-- =====================================================================
-- Projeto CPR - Contas a Pagar e a Receber
-- Schema inicial normalizado ate a 3a Forma Normal.
--
-- Base: livro "Delphi 4 - Contas a Pagar e a Receber" (Shiraishi/Cortes),
-- capitulo 5, paginas 69-79. O modelo original em Paradox e desnormalizado;
-- as decisoes de normalizacao estao comentadas em cada bloco.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELAS DE DOMINIO
--    3FN: no livro, "Tipo" do titulo e "Situacao" seriam texto livre
--    dentro da propria conta. Extraidas para tabelas proprias, a descricao
--    passa a depender apenas da chave da tabela de dominio.
-- ---------------------------------------------------------------------

CREATE TABLE papel (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    codigo    VARCHAR(20) NOT NULL,
    descricao VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_papel_codigo UNIQUE (codigo)
) ENGINE = InnoDB;

CREATE TABLE situacao_conta (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    codigo    VARCHAR(20) NOT NULL,
    descricao VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_situacao_codigo UNIQUE (codigo)
) ENGINE = InnoDB;

CREATE TABLE tipo_titulo (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    codigo    VARCHAR(30) NOT NULL,
    descricao VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_tipo_titulo_codigo UNIQUE (codigo)
) ENGINE = InnoDB;

CREATE TABLE forma_pagamento (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    codigo    VARCHAR(30) NOT NULL,
    descricao VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_forma_pagamento_codigo UNIQUE (codigo)
) ENGINE = InnoDB;

-- 3FN: no livro, Cidade e Estado ficavam na propria linha do cliente.
-- Como UF depende funcionalmente da cidade (e nao do cliente), havia
-- dependencia transitiva. Cidade vira entidade propria.
CREATE TABLE cidade (
    id   BIGINT      NOT NULL AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    uf   CHAR(2)     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_cidade_nome_uf UNIQUE (nome, uf)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 2. PESSOA
--    O livro tem Cliente.db e Fornecedor.db com estruturas quase iguais.
--    Unificadas em PESSOA; o papel (cliente/fornecedor) vira N:N, o que
--    elimina a gambiarra de um campo "tipo = AMBOS".
-- ---------------------------------------------------------------------

CREATE TABLE pessoa (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    nome               VARCHAR(100) NOT NULL,
    documento          VARCHAR(18)  NOT NULL,
    inscricao_estadual VARCHAR(15),
    email              VARCHAR(80),
    contato            VARCHAR(50),
    ativo              BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_pessoa_documento UNIQUE (documento)
) ENGINE = InnoDB;

-- >>> RELACIONAMENTO N:N <<<
-- Uma pessoa pode ser cliente e fornecedor ao mesmo tempo; um papel e
-- exercido por varias pessoas. 2FN: a tabela so tem a chave composta,
-- nenhum atributo depende de apenas parte dela.
CREATE TABLE pessoa_papel (
    pessoa_id BIGINT NOT NULL,
    papel_id  BIGINT NOT NULL,
    PRIMARY KEY (pessoa_id, papel_id),
    CONSTRAINT fk_pessoa_papel_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoa (id) ON DELETE CASCADE,
    CONSTRAINT fk_pessoa_papel_papel  FOREIGN KEY (papel_id)  REFERENCES papel (id)
) ENGINE = InnoDB;

-- >>> RELACIONAMENTO 1:N <<<
-- 1FN: o livro guardava um unico endereco achatado na linha do cliente.
-- Uma pessoa pode ter endereco comercial, de cobranca e de entrega.
CREATE TABLE endereco (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    pessoa_id   BIGINT       NOT NULL,
    cidade_id   BIGINT       NOT NULL,
    logradouro  VARCHAR(120) NOT NULL,
    numero      VARCHAR(10),
    complemento VARCHAR(60),
    bairro      VARCHAR(60),
    cep         VARCHAR(9),
    principal   BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT fk_endereco_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoa (id) ON DELETE CASCADE,
    CONSTRAINT fk_endereco_cidade FOREIGN KEY (cidade_id) REFERENCES cidade (id)
) ENGINE = InnoDB;

-- >>> RELACIONAMENTO 1:N <<<
-- 1FN: o livro tinha as colunas Telefone, Ramal, Fax e Internet lado a
-- lado - um grupo repetitivo classico. Vira uma linha por telefone.
CREATE TABLE telefone (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    pessoa_id BIGINT      NOT NULL,
    numero    VARCHAR(20) NOT NULL,
    ramal     VARCHAR(6),
    tipo      VARCHAR(20) NOT NULL DEFAULT 'COMERCIAL',
    PRIMARY KEY (id),
    CONSTRAINT fk_telefone_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoa (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 3. PLANO DE CONTAS (categorias financeiras)
--    Auto-relacionamento 1:N, exatamente como o livro (campo Superior).
-- ---------------------------------------------------------------------

CREATE TABLE plano_conta (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    codigo      VARCHAR(18) NOT NULL,
    descricao   VARCHAR(60) NOT NULL,
    superior_id BIGINT,
    consolidada BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT uk_plano_conta_codigo UNIQUE (codigo),
    CONSTRAINT fk_plano_conta_superior FOREIGN KEY (superior_id) REFERENCES plano_conta (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 4. CONTAS A PAGAR
-- ---------------------------------------------------------------------

CREATE TABLE conta_pagar (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    numero_titulo     VARCHAR(20)   NOT NULL,
    pessoa_id         BIGINT        NOT NULL,
    tipo_titulo_id    BIGINT        NOT NULL,
    situacao_id       BIGINT        NOT NULL,
    valor             DECIMAL(14,2) NOT NULL,
    emissao           DATE          NOT NULL,
    vencimento        DATE          NOT NULL,
    desconto          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    validade_desconto DATE,
    acrescimo_dia     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    observacao        VARCHAR(255),
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_conta_pagar_titulo UNIQUE (numero_titulo),
    CONSTRAINT fk_conta_pagar_pessoa  FOREIGN KEY (pessoa_id)      REFERENCES pessoa (id),
    CONSTRAINT fk_conta_pagar_tipo    FOREIGN KEY (tipo_titulo_id) REFERENCES tipo_titulo (id),
    CONSTRAINT fk_conta_pagar_situacao FOREIGN KEY (situacao_id)   REFERENCES situacao_conta (id),
    CONSTRAINT ck_conta_pagar_valor   CHECK (valor > 0),
    CONSTRAINT ck_conta_pagar_datas   CHECK (vencimento >= emissao)
) ENGINE = InnoDB;

CREATE INDEX ix_conta_pagar_venc    ON conta_pagar (vencimento, situacao_id);
CREATE INDEX ix_conta_pagar_pessoa  ON conta_pagar (pessoa_id);

-- >>> RELACIONAMENTO N:N COM ATRIBUTO <<<
-- Um titulo pode ser rateado entre varias categorias (ex.: uma fatura de
-- energia dividida entre Administrativo e Producao) e uma categoria
-- recebe rateio de varios titulos. O valor rateado depende das DUAS
-- partes da chave - por isso mora aqui e nao em conta_pagar (2FN).
CREATE TABLE rateio_conta_pagar (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    conta_pagar_id BIGINT        NOT NULL,
    plano_conta_id BIGINT        NOT NULL,
    valor          DECIMAL(14,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_rateio_cp UNIQUE (conta_pagar_id, plano_conta_id),
    CONSTRAINT fk_rateio_cp_conta FOREIGN KEY (conta_pagar_id) REFERENCES conta_pagar (id) ON DELETE CASCADE,
    CONSTRAINT fk_rateio_cp_plano FOREIGN KEY (plano_conta_id) REFERENCES plano_conta (id),
    CONSTRAINT ck_rateio_cp_valor CHECK (valor > 0)
) ENGINE = InnoDB;

-- >>> RELACIONAMENTO 1:N <<<
-- Um titulo pode ser quitado em mais de um pagamento (parcial).
-- No livro isso era uma unica data "Pagto" na propria conta.
CREATE TABLE pagamento (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    conta_pagar_id     BIGINT        NOT NULL,
    forma_pagamento_id BIGINT        NOT NULL,
    data_pagamento     DATE          NOT NULL,
    valor_pago         DECIMAL(14,2) NOT NULL,
    desconto_aplicado  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    acrescimo_aplicado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    observacao         VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_pagamento_conta FOREIGN KEY (conta_pagar_id)     REFERENCES conta_pagar (id) ON DELETE CASCADE,
    CONSTRAINT fk_pagamento_forma FOREIGN KEY (forma_pagamento_id) REFERENCES forma_pagamento (id),
    CONSTRAINT ck_pagamento_valor CHECK (valor_pago > 0)
) ENGINE = InnoDB;

CREATE INDEX ix_pagamento_data ON pagamento (data_pagamento);

-- ---------------------------------------------------------------------
-- 5. CONTAS A RECEBER (espelho de contas a pagar)
-- ---------------------------------------------------------------------

CREATE TABLE conta_receber (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    numero_titulo     VARCHAR(20)   NOT NULL,
    pessoa_id         BIGINT        NOT NULL,
    tipo_titulo_id    BIGINT        NOT NULL,
    situacao_id       BIGINT        NOT NULL,
    valor             DECIMAL(14,2) NOT NULL,
    emissao           DATE          NOT NULL,
    vencimento        DATE          NOT NULL,
    desconto          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    validade_desconto DATE,
    acrescimo_dia     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    observacao        VARCHAR(255),
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_conta_receber_titulo UNIQUE (numero_titulo),
    CONSTRAINT fk_conta_receber_pessoa   FOREIGN KEY (pessoa_id)      REFERENCES pessoa (id),
    CONSTRAINT fk_conta_receber_tipo     FOREIGN KEY (tipo_titulo_id) REFERENCES tipo_titulo (id),
    CONSTRAINT fk_conta_receber_situacao FOREIGN KEY (situacao_id)    REFERENCES situacao_conta (id),
    CONSTRAINT ck_conta_receber_valor    CHECK (valor > 0),
    CONSTRAINT ck_conta_receber_datas    CHECK (vencimento >= emissao)
) ENGINE = InnoDB;

CREATE INDEX ix_conta_receber_venc   ON conta_receber (vencimento, situacao_id);
CREATE INDEX ix_conta_receber_pessoa ON conta_receber (pessoa_id);

CREATE TABLE rateio_conta_receber (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    conta_receber_id BIGINT        NOT NULL,
    plano_conta_id   BIGINT        NOT NULL,
    valor            DECIMAL(14,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_rateio_cr UNIQUE (conta_receber_id, plano_conta_id),
    CONSTRAINT fk_rateio_cr_conta FOREIGN KEY (conta_receber_id) REFERENCES conta_receber (id) ON DELETE CASCADE,
    CONSTRAINT fk_rateio_cr_plano FOREIGN KEY (plano_conta_id)   REFERENCES plano_conta (id),
    CONSTRAINT ck_rateio_cr_valor CHECK (valor > 0)
) ENGINE = InnoDB;

CREATE TABLE recebimento (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    conta_receber_id   BIGINT        NOT NULL,
    forma_pagamento_id BIGINT        NOT NULL,
    data_recebimento   DATE          NOT NULL,
    valor_recebido     DECIMAL(14,2) NOT NULL,
    desconto_aplicado  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    acrescimo_aplicado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    observacao         VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_recebimento_conta FOREIGN KEY (conta_receber_id)   REFERENCES conta_receber (id) ON DELETE CASCADE,
    CONSTRAINT fk_recebimento_forma FOREIGN KEY (forma_pagamento_id) REFERENCES forma_pagamento (id),
    CONSTRAINT ck_recebimento_valor CHECK (valor_recebido > 0)
) ENGINE = InnoDB;

CREATE INDEX ix_recebimento_data ON recebimento (data_recebimento);
