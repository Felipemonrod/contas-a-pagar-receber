-- =====================================================================
-- Lancamento contabil e cheque pre-datado
-- (livro, cap. 12 e 16; estruturas no cap. 5, p. 75 e 77)
--
-- RN14: todo lancamento tem uma conta de credito e uma de debito, valor,
-- data e status - partida dobrada, refletindo ativo e passivo.
--
-- RN15: o cheque pre-datado e um recebimento com data de deposito
-- futura, vinculado a cliente, banco, agencia e conta corrente.
-- Funciona como garantia.
-- =====================================================================

CREATE TABLE lancamento (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    conta_credito_id  BIGINT        NOT NULL,
    conta_debito_id   BIGINT        NOT NULL,
    valor             DECIMAL(14,2) NOT NULL,
    descricao         VARCHAR(80)   NOT NULL,
    data              DATE          NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'ATIVO',
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_lancamento_credito FOREIGN KEY (conta_credito_id) REFERENCES plano_conta (id),
    CONSTRAINT fk_lancamento_debito  FOREIGN KEY (conta_debito_id)  REFERENCES plano_conta (id),
    CONSTRAINT ck_lancamento_valor   CHECK (valor > 0),
    -- Partida dobrada: credito e debito precisam ser contas diferentes
    CONSTRAINT ck_lancamento_contas  CHECK (conta_credito_id <> conta_debito_id)
) ENGINE = InnoDB;

CREATE INDEX ix_lancamento_data ON lancamento (data);

-- ---------------------------------------------------------------------
-- Vinculo do movimento financeiro com a contabilidade.
--
-- No livro, Despesa.db, Pagamento.db e Recebimento.db tinham todas um
-- campo "Lancamento". Aqui ele e opcional: o titulo existe mesmo sem
-- contabilizacao, e a FK e preenchida quando o lancamento e feito.
-- ---------------------------------------------------------------------

ALTER TABLE despesa
    ADD COLUMN lancamento_id BIGINT NULL,
    ADD CONSTRAINT fk_despesa_lancamento FOREIGN KEY (lancamento_id) REFERENCES lancamento (id);

ALTER TABLE conta_pagar
    ADD COLUMN lancamento_id BIGINT NULL,
    ADD CONSTRAINT fk_conta_pagar_lancamento FOREIGN KEY (lancamento_id) REFERENCES lancamento (id);

ALTER TABLE conta_receber
    ADD COLUMN lancamento_id BIGINT NULL,
    ADD CONSTRAINT fk_conta_receber_lancamento FOREIGN KEY (lancamento_id) REFERENCES lancamento (id);

-- ---------------------------------------------------------------------
-- Cheque pre-datado
--
-- Diferenca em relacao ao livro: la o cheque guardava Banco, Agencia e
-- ContaCorrente em colunas separadas. Aqui aponta para conta_corrente,
-- que ja conhece a agencia e o banco - evita a inconsistencia de um
-- cheque apontar para uma conta que nao pertence aquela agencia.
-- ---------------------------------------------------------------------

CREATE TABLE cheque_pre_datado (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    numero_cheque     VARCHAR(10)   NOT NULL,
    pessoa_id         BIGINT        NOT NULL,
    conta_corrente_id BIGINT        NOT NULL,
    emissao           DATE          NOT NULL,
    deposito          DATE          NOT NULL,
    valor             DECIMAL(14,2) NOT NULL,
    situacao          VARCHAR(20)   NOT NULL DEFAULT 'EM_CARTEIRA',
    conta_receber_id  BIGINT        NULL,
    descricao         VARCHAR(80),
    criado_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_cheque_conta_numero UNIQUE (conta_corrente_id, numero_cheque),
    CONSTRAINT fk_cheque_pessoa  FOREIGN KEY (pessoa_id)         REFERENCES pessoa (id),
    CONSTRAINT fk_cheque_conta   FOREIGN KEY (conta_corrente_id) REFERENCES conta_corrente (id),
    CONSTRAINT fk_cheque_titulo  FOREIGN KEY (conta_receber_id)  REFERENCES conta_receber (id),
    CONSTRAINT ck_cheque_valor   CHECK (valor > 0),
    CONSTRAINT ck_cheque_datas   CHECK (deposito >= emissao)
) ENGINE = InnoDB;

CREATE INDEX ix_cheque_deposito ON cheque_pre_datado (deposito, situacao);
CREATE INDEX ix_cheque_pessoa   ON cheque_pre_datado (pessoa_id);
