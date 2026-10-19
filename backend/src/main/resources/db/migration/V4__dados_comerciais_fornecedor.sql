-- =====================================================================
-- Dados comerciais do fornecedor (livro, cap. 5, p. 72 - Fornecedor.db)
--
-- O Fornecedor.db do livro tem quatro campos que o Cliente.db nao tem:
-- Pagamento, Desconto, Entrega e Vendedor. Como cliente e fornecedor
-- foram unificados em PESSOA, eles entram aqui como colunas anulaveis:
-- so fazem sentido para quem tem o papel FORNECEDOR.
--
-- Mantidos com a semantica original do livro:
--   Pagamento -> texto livre, por ser condicao negociada ("30/60/90 dias")
--   Desconto  -> texto livre, pelo mesmo motivo ("5% a vista")
--   Entrega   -> numerico, o prazo em dias
--   Vendedor  -> nome do contato comercial
-- =====================================================================

ALTER TABLE pessoa
    ADD COLUMN condicao_pagamento VARCHAR(20) NULL COMMENT 'Condicao negociada de pagamento',
    ADD COLUMN desconto_negociado VARCHAR(20) NULL COMMENT 'Desconto acordado com o fornecedor',
    ADD COLUMN prazo_entrega_dias INT          NULL COMMENT 'Prazo de entrega em dias',
    ADD COLUMN vendedor           VARCHAR(50)  NULL COMMENT 'Contato comercial no fornecedor';

ALTER TABLE pessoa
    ADD CONSTRAINT ck_pessoa_prazo_entrega CHECK (prazo_entrega_dias IS NULL OR prazo_entrega_dias >= 0);
