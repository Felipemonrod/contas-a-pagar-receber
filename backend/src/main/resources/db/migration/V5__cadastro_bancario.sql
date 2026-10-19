-- =====================================================================
-- Cadastro bancario (livro, cap. 9 e cap. 5 p. 73, 76 e 79)
--
-- Banco.db, Agencia.db e ContaCorrente.db formam uma cadeia 1:N de tres
-- niveis: um banco tem varias agencias, uma agencia tem varias contas.
--
-- Diferenca em relacao ao livro: la a chave de Agencia era so o numero da
-- agencia, o que impediria duas agencias de numero igual em bancos
-- diferentes. Aqui a chave e artificial e a unicidade e por (banco,
-- numero) - mesma correcao aplicada em ContaCorrente.
-- =====================================================================

CREATE TABLE banco (
    id     BIGINT      NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(4)  NOT NULL,
    nome   VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_banco_codigo UNIQUE (codigo)
) ENGINE = InnoDB;

CREATE TABLE agencia (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    banco_id  BIGINT      NOT NULL,
    numero    VARCHAR(10) NOT NULL,
    nome      VARCHAR(60) NOT NULL,
    endereco  VARCHAR(120),
    gerente   VARCHAR(60),
    telefone  VARCHAR(20),
    ramal     VARCHAR(6),
    fax       VARCHAR(20),
    email     VARCHAR(80),
    criado_em DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_agencia_banco_numero UNIQUE (banco_id, numero),
    CONSTRAINT fk_agencia_banco FOREIGN KEY (banco_id) REFERENCES banco (id)
) ENGINE = InnoDB;

CREATE TABLE conta_corrente (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    agencia_id BIGINT        NOT NULL,
    numero     VARCHAR(15)   NOT NULL,
    tipo       VARCHAR(20)   NOT NULL DEFAULT 'CORRENTE',
    limite     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    ativa      BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT uk_conta_corrente_agencia_numero UNIQUE (agencia_id, numero),
    CONSTRAINT fk_conta_corrente_agencia FOREIGN KEY (agencia_id) REFERENCES agencia (id),
    CONSTRAINT ck_conta_corrente_limite CHECK (limite >= 0)
) ENGINE = InnoDB;

CREATE INDEX ix_agencia_banco ON agencia (banco_id);
CREATE INDEX ix_conta_corrente_agencia ON conta_corrente (agencia_id);
