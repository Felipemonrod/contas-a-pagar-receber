-- Dados de dominio para os testes de integracao.
--
-- No ambiente real estes registros vem da migration V2 do Flyway. Como os
-- testes rodam em H2 com o schema gerado pelo Hibernate, o Flyway fica
-- desligado e a carga precisa ser feita aqui.
--
-- Mantenha em sincronia com V2__dados_dominio.sql.

INSERT INTO papel (codigo, descricao) VALUES
    ('CLIENTE',    'Cliente - origem de contas a receber'),
    ('FORNECEDOR', 'Fornecedor - origem de contas a pagar');

INSERT INTO situacao_conta (codigo, descricao) VALUES
    ('ABERTA',    'Titulo lancado e ainda nao quitado'),
    ('PARCIAL',   'Titulo com quitacao parcial'),
    ('PAGA',      'Titulo a pagar integralmente quitado'),
    ('RECEBIDA',  'Titulo a receber integralmente quitado'),
    ('VENCIDA',   'Titulo em aberto apos a data de vencimento'),
    ('CANCELADA', 'Titulo cancelado, mantido para consulta');

INSERT INTO tipo_titulo (codigo, descricao) VALUES
    ('DUPLICATA',        'Duplicata'),
    ('NOTA_PROMISSORIA', 'Nota Promissoria'),
    ('OUTROS',           'Outros');

INSERT INTO forma_pagamento (codigo, descricao) VALUES
    ('DINHEIRO',      'Dinheiro'),
    ('PIX',           'PIX'),
    ('BOLETO',        'Boleto bancario'),
    ('TRANSFERENCIA', 'Transferencia bancaria'),
    ('CHEQUE',        'Cheque'),
    ('CARTAO',        'Cartao');

-- Plano de contas: as consolidadas primeiro, para que as filhas possam
-- referenciar o id do pai.
INSERT INTO plano_conta (id, codigo, descricao, superior_id, consolidada) VALUES
    (1, '1',  'ATIVO',              NULL, TRUE),
    (2, '2',  'PASSIVO',            NULL, TRUE),
    (3, '11', 'ATIVO CIRCULANTE',      1, TRUE),
    (4, '21', 'PASSIVO CIRCULANTE',    2, TRUE);

INSERT INTO plano_conta (id, codigo, descricao, superior_id, consolidada) VALUES
    (5,  '11.01', 'Caixa',              3, FALSE),
    (6,  '11.02', 'Bancos c/ Movimento', 3, FALSE),
    (7,  '11.03', 'Clientes a Receber',  3, FALSE),
    (8,  '21.01', 'Fornecedores',        4, FALSE),
    (9,  '21.02', 'Duplicatas a Pagar',  4, FALSE),
    (10, '21.03', 'Energia Eletrica',    4, FALSE),
    (11, '21.04', 'Agua',                4, FALSE),
    (12, '21.05', 'Telefone',            4, FALSE),
    (13, '21.06', 'Condominio',          4, FALSE);

-- O Hibernate gerou a chave como IDENTITY; depois dos inserts manuais a
-- sequencia precisa continuar de onde paramos.
ALTER TABLE plano_conta ALTER COLUMN id RESTART WITH 100;
