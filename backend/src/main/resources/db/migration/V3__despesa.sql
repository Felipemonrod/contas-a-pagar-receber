-- =====================================================================
-- DESPESAS (livro, cap. 3 p. 51 e 54-55; cap. 13)
--
-- No sistema original, despesa nao e um titulo: e a PREVISAO de um gasto
-- fixo (agua, luz, telefone, condominio) com valor previsto e data prevista
-- de pagamento. Quando a fatura chega, a despesa vira um titulo a pagar
-- com valor exato e vencimento real.
--
-- Por isso a despesa tem tabela propria e uma FK opcional para o titulo
-- que dela se originou: enquanto estiver nula, a despesa e so previsao.
-- =====================================================================

CREATE TABLE despesa (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    plano_conta_id      BIGINT        NOT NULL,
    descricao           VARCHAR(80)   NOT NULL,
    valor_previsto      DECIMAL(14,2) NOT NULL,
    data_lancamento     DATE          NOT NULL,
    previsao_pagamento  DATE          NOT NULL,
    conta_pagar_id      BIGINT,                    -- preenchida quando vira titulo
    PRIMARY KEY (id),
    CONSTRAINT fk_despesa_plano  FOREIGN KEY (plano_conta_id) REFERENCES plano_conta (id),
    CONSTRAINT fk_despesa_titulo FOREIGN KEY (conta_pagar_id) REFERENCES conta_pagar (id),
    CONSTRAINT uk_despesa_titulo UNIQUE (conta_pagar_id),   -- um titulo por despesa
    CONSTRAINT ck_despesa_valor  CHECK (valor_previsto > 0)
) ENGINE = InnoDB;

CREATE INDEX ix_despesa_previsao ON despesa (previsao_pagamento);
