-- =====================================================================
-- Carga das tabelas de dominio. Sao dados fixos do sistema, nao de teste:
-- as regras de negocio referenciam estes codigos diretamente.
-- =====================================================================

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

-- Tipos conforme o formulario de lancamento do livro (cap. 3, p. 60).
INSERT INTO tipo_titulo (codigo, descricao) VALUES
    ('DUPLICATA',         'Duplicata'),
    ('NOTA_PROMISSORIA',  'Nota Promissoria'),
    ('OUTROS',            'Outros');

INSERT INTO forma_pagamento (codigo, descricao) VALUES
    ('DINHEIRO',      'Dinheiro'),
    ('PIX',           'PIX'),
    ('BOLETO',        'Boleto bancario'),
    ('TRANSFERENCIA', 'Transferencia bancaria'),
    ('CHEQUE',        'Cheque'),
    ('CARTAO',        'Cartao');

-- Plano de contas inicial, seguindo a estrutura hierarquica do livro
-- (cap. 3, p. 49-50): contas consolidadas agrupam e nao recebem lancamento.
INSERT INTO plano_conta (codigo, descricao, superior_id, consolidada) VALUES
    ('1',      'ATIVO',                  NULL, TRUE),
    ('2',      'PASSIVO',                NULL, TRUE);

INSERT INTO plano_conta (codigo, descricao, superior_id, consolidada) VALUES
    ('11',     'ATIVO CIRCULANTE',       (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '1') AS t), TRUE),
    ('21',     'PASSIVO CIRCULANTE',     (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '2') AS t), TRUE);

INSERT INTO plano_conta (codigo, descricao, superior_id, consolidada) VALUES
    ('11.01',  'Caixa',                  (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '11') AS t), FALSE),
    ('11.02',  'Bancos c/ Movimento',    (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '11') AS t), FALSE),
    ('11.03',  'Clientes a Receber',     (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '11') AS t), FALSE),
    ('21.01',  'Fornecedores',           (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE),
    ('21.02',  'Duplicatas a Pagar',     (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE),
    ('21.03',  'Energia Eletrica',       (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE),
    ('21.04',  'Agua',                   (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE),
    ('21.05',  'Telefone',               (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE),
    ('21.06',  'Condominio',             (SELECT id FROM (SELECT id FROM plano_conta WHERE codigo = '21') AS t), FALSE);
