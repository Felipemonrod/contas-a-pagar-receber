-- =====================================================================
-- Cartorios e remessa de titulos para protesto
-- (livro, cap. 10 e 17; estruturas no cap. 5, p. 73 e 77)
--
-- RN16: titulo vencido e nao recebido pode ser enviado a protesto. A
-- remessa guarda tres datas - envio, protesto e baixa - e o cartorio
-- precisa estar cadastrado antes.
--
-- Diferenca em relacao ao livro: la a remessa referenciava o titulo pelo
-- numero (texto). Aqui e chave estrangeira para conta_receber, o que
-- impede remessa de titulo inexistente.
-- =====================================================================

CREATE TABLE cartorio (
    id       BIGINT      NOT NULL AUTO_INCREMENT,
    nome     VARCHAR(60) NOT NULL,
    contato  VARCHAR(60),
    telefone VARCHAR(20),
    PRIMARY KEY (id),
    CONSTRAINT uk_cartorio_nome UNIQUE (nome)
) ENGINE = InnoDB;

CREATE TABLE remessa_cartorio (
    id               BIGINT   NOT NULL AUTO_INCREMENT,
    cartorio_id      BIGINT   NOT NULL,
    conta_receber_id BIGINT   NOT NULL,
    data_remessa     DATE     NOT NULL,
    data_protesto    DATE,
    data_baixa       DATE,
    observacao       VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_remessa_cartorio   FOREIGN KEY (cartorio_id)      REFERENCES cartorio (id),
    CONSTRAINT fk_remessa_titulo     FOREIGN KEY (conta_receber_id) REFERENCES conta_receber (id),
    -- Um titulo so pode estar em uma remessa ativa por vez
    CONSTRAINT uk_remessa_titulo     UNIQUE (conta_receber_id),
    CONSTRAINT ck_remessa_protesto   CHECK (data_protesto IS NULL OR data_protesto >= data_remessa),
    CONSTRAINT ck_remessa_baixa      CHECK (data_baixa    IS NULL OR data_baixa    >= data_remessa)
) ENGINE = InnoDB;

CREATE INDEX ix_remessa_cartorio ON remessa_cartorio (cartorio_id);
CREATE INDEX ix_remessa_data     ON remessa_cartorio (data_remessa);
