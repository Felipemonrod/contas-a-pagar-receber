/**
 * Configuração das telas e os dados de exemplo guardados no navegador.
 *
 * Este arquivo descreve COMO cada tela se apresenta — título, colunas da
 * tabela, botões da barra de ações — usando o vocabulário do livro
 * ("Registro", "Cliente"). Ele não sabe nada sobre a API: a tradução
 * para os nomes do contrato acontece em `src/adapters/`.
 *
 * As telas ainda não integradas guardam seus registros no `localStorage`,
 * e `initialDatabase` é o conteúdo com que elas começam.
 */

import formLayouts from './form-layouts.json';

/**
 * As pastas do menu lateral, na ordem em que aparecem.
 *
 * Cada item é um par [rota, rótulo]: a rota vira o endereço `#/rota`, e o
 * rótulo é o texto da etiqueta azul.
 */
export const groups = [
  {
    title: 'CADASTRO',
    items: [
      ['clientes', 'Clientes'],
      ['fornecedores', 'Fornecedores'],
      ['bancos', 'Bancos'],
      ['cartorios', 'Cartórios'],
    ],
  },
  {
    title: 'PLANO DE CONTAS',
    items: [
      ['plano', 'Manutenção'],
      ['lancamentos', 'Lançamentos'],
    ],
  },
  {
    title: 'CONTAS A PAGAR',
    items: [
      ['despesas', 'Despesas'],
      ['pagamentos', 'Pagamentos'],
    ],
  },
  {
    title: 'CONTAS A RECEBER',
    items: [
      ['recebimentos', 'Recebimentos'],
      ['cheques', 'Cheque Pré-Datado'],
      ['remessas', 'Remessa p/ Cartório'],
    ],
  },
  {
    title: 'RELATÓRIOS',
    items: [['relatorios', 'Relatórios']],
  },
] as const;

/**
 * As telas de cadastro. Os nomes saem das chaves de `form-layouts.json`,
 * então declarar um formulário lá já cria a tela correspondente aqui.
 */
export type Entity = keyof typeof formLayouts;

/** Tudo que a navegação por hash aceita: as telas, o menu e os relatórios. */
export type Route = Entity | 'inicio' | 'relatorios';

/**
 * Uma linha de tela.
 *
 * Todos os valores são texto, inclusive datas e dinheiro, porque é assim que
 * saem dos campos do formulário. A conversão para número e data acontece no
 * adapter, na fronteira com a API.
 */
export type RecordData = { id: string; [key: string]: string };

/** Os registros de todas as telas guardados no navegador. */
export type Database = Record<Entity, RecordData[]>;

/** Uma coluna da tabela. `format` decide como o valor é exibido. */
export type Column = { key: string; label: string; width?: number; format?: 'money' | 'date' };

/** Tudo que uma tela precisa para se desenhar. */
export type ScreenConfig = {
  /** Título da janela e da aba do navegador. */
  title: string;
  /** Cabeçalho mostrado dentro da tela. */
  heading: string;
  description: string;
  /** Título da janela de inclusão e edição. */
  modal: string;
  /** Botões da barra de ações, na ordem; o primeiro é o destacado. */
  actions: string[];
  columns: Column[];
  /** Campo que identifica o registro, exigido no formulário. */
  primary: string;
};

/**
 * Atalho para declarar uma coluna.
 * Por padrão o rótulo exibido é a própria chave do campo.
 */
const col = (key: string, width?: number, label = key, format?: Column['format']): Column => ({
  key,
  label,
  width,
  format,
});

export const screens: Record<Entity, ScreenConfig> = {
  clientes: {
    title: 'Cadastro de Clientes',
    heading: 'Clientes',
    description: 'Cadastro e manutenção de clientes.',
    modal: 'Cadastro de Cliente',
    primary: 'Cliente',
    actions: ['Incluir', 'Editar', 'Localizar', 'Relatório'],
    columns: [
      col('Registro', 90),
      col('Cliente', 250),
      col('Endereço', 280),
      col('Cidade', 180),
      col('Estado', 70, 'UF'),
      col('Telefone', 180),
    ],
  },

  fornecedores: {
    title: 'Cadastro de Fornecedores',
    heading: 'Fornecedores',
    description: 'Cadastro e manutenção de fornecedores.',
    modal: 'Cadastro de Fornecedor',
    primary: 'Fornecedor',
    actions: ['Incluir', 'Editar', 'Localizar', 'Relatório'],
    columns: [
      col('Registro', 90),
      col('Fornecedor', 250),
      col('Endereço', 250),
      col('Cidade', 170),
      col('Telefone', 160),
      col('Vendedor', 160),
    ],
  },

  bancos: {
    title: 'Cadastro de Bancos',
    heading: 'Bancos, Agências e Contas Correntes',
    description: 'Cadeia de três níveis: um banco tem agências, uma agência tem contas.',
    modal: 'Banco',
    primary: 'Banco',
    actions: ['Incluir Banco'],
    columns: [col('Número', 120), col('Banco', 500)],
  },

  cartorios: {
    title: 'Cadastro de Cartórios',
    heading: 'Cartórios',
    description: 'Cadastro de cartórios utilizados para remessa de títulos.',
    modal: 'Cadastro de Cartório',
    primary: 'Nome do Cartório',
    actions: ['Incluir', 'Editar', 'Deletar'],
    columns: [
      col('Nome do Cartório', 360, 'Nome'),
      col('Contato', 250),
      col('Telefone', 260),
    ],
  },

  plano: {
    title: 'Plano de Contas',
    heading: 'Plano de Contas',
    description: 'Manutenção da estrutura hierárquica das contas.',
    modal: 'Plano de Contas',
    primary: 'Descrição da Conta',
    actions: ['Inclusão'],
    columns: [col('Nova Conta', 160, 'Conta'), col('Descrição da Conta', 500, 'Descrição')],
  },

  lancamentos: {
    title: 'Lançamento',
    heading: 'Lançamento Contábil',
    description: 'Partida dobrada: o valor sai de uma conta e entra em outra.',
    modal: 'Lançamento',
    primary: 'Descrição',
    actions: ['Incluir', 'Estornar'],
    columns: [
      col('Registro', 80),
      col('Data', 120, 'Data', 'date'),
      col('Conta de Crédito', 230, 'Crédito'),
      col('Conta de Débito', 230, 'Débito'),
      col('Valor', 140, 'Valor', 'money'),
      col('Descrição', 240),
      col('Situação', 110),
    ],
  },

  despesas: {
    title: 'Contas a Pagar — Despesas',
    heading: 'Despesas',
    description: 'Cadastro das despesas previstas.',
    modal: 'Despesa',
    primary: 'Descrição',
    actions: ['Inclusão', 'Edição', 'Exclusão', 'Gerar Título'],
    columns: [
      col('Número', 80),
      col('Descrição', 240),
      col('Lançamento', 200, 'Categoria'),
      col('Previsão de Pagamento', 150, 'Prev. Pagamento', 'date'),
      col('Valor Previsto', 150, 'Valor Previsto', 'money'),
      col('Situação', 120),
      col('Número do Título', 140, 'Título'),
    ],
  },

  pagamentos: {
    title: 'Contas a Pagar — Pagamentos',
    heading: 'Pagamentos',
    description: 'Lançamento, quitação e acompanhamento de títulos a pagar.',
    modal: 'Pagamento',
    primary: 'Nome do Fornecedor',
    actions: ['Incluir', 'Editar', 'Quitar', 'Localizar'],
    columns: [
      col('Número do Título', 140, 'Título'),
      col('Nome do Fornecedor', 230, 'Fornecedor'),
      col('Valor do Título', 130, 'Valor', 'money'),
      col('Data de Vencimento', 130, 'Vencimento', 'date'),
      col('Data de Pagamento', 130, 'Pagamento', 'date'),
      col('Saldo Devedor', 130, 'Saldo', 'money'),
      col('Situação', 110),
    ],
  },

  recebimentos: {
    title: 'Contas a Receber — Recebimentos',
    heading: 'Recebimentos',
    description: 'Lançamento, recebimento e acompanhamento de títulos a receber.',
    modal: 'Recebimento',
    primary: 'Nome do Cliente',
    actions: ['Incluir', 'Editar', 'Receber', 'Localizar'],
    columns: [
      col('Número do Título', 140, 'Título'),
      col('Nome do Cliente', 230, 'Cliente'),
      col('Valor do Título', 130, 'Valor', 'money'),
      col('Data de Vencimento', 130, 'Vencimento', 'date'),
      col('Data de Pagamento', 130, 'Recebimento', 'date'),
      col('Saldo Devedor', 130, 'Saldo', 'money'),
      col('Situação', 110),
    ],
  },

  cheques: {
    title: 'Cheque Pré-Datado',
    heading: 'Cheque Pré-Datado',
    description: 'Cadastro e acompanhamento do ciclo dos cheques recebidos.',
    modal: 'Cheque Pré-Datado',
    primary: 'Cliente',
    actions: ['Incluir', 'Editar', 'Movimentar', 'Excluir'],
    columns: [
      col('Cliente', 210),
      col('Número do Cheque', 120, 'Cheque'),
      col('Conta Corrente', 180, 'Conta'),
      col('Emissão', 120, 'Emissão', 'date'),
      col('Data para Depósito', 130, 'Depósito', 'date'),
      col('Valor', 130, 'Valor', 'money'),
      col('Situação', 120),
    ],
  },

  remessas: {
    title: 'Remessa de Títulos para Cartório',
    heading: 'Remessa de Títulos para Cartório',
    description: 'Envio de títulos vencidos a protesto e acompanhamento.',
    modal: 'Remessa',
    primary: 'Cartório',
    actions: ['Enviar', 'Protestar', 'Baixar'],
    columns: [
      col('Nome', 200, 'Cliente'),
      col('Número do Título', 140, 'Título'),
      col('Cartório', 180),
      col('Saldo Devedor', 130, 'Saldo', 'money'),
      col('Remessa', 120, 'Remessa', 'date'),
      col('Protesto', 120, 'Protesto', 'date'),
      col('Baixa', 120, 'Baixa', 'date'),
      col('Situação', 110),
    ],
  },
};

/** Numera os exemplos sequencialmente, para cada linha ter o seu `id`. */
const rows = (items: Omit<RecordData, 'id'>[]): RecordData[] =>
  items.map((item, indice) => ({ ...item, id: String(indice + 1) }));

/**
 * Registros de exemplo, retirados do protótipo do Figma.
 *
 * Valem para as telas que ainda guardam dados no navegador. Clientes,
 * Fornecedores e Pagamentos já vêm da API e não usam o que está aqui — mas
 * `clientes` e `fornecedores` continuam servindo de lista de escolha nos
 * formulários das telas que ainda não foram integradas.
 */
export const initialDatabase: Database = {
  clientes: rows([
    {
      Registro: '001',
      Cliente: 'Editora Érica Ltda.',
      Endereço: 'Rua Jarinu, 594',
      Cidade: 'São Paulo',
      Estado: 'SP',
      Telefone: '(11) 0000-0000',
    },
    {
      Registro: '002',
      Cliente: 'Cliente Exemplo',
      Endereço: 'Av. Principal, 100',
      Cidade: 'Morrinhos',
      Estado: 'GO',
      Telefone: '(64) 0000-0000',
    },
    {
      Registro: '003',
      Cliente: 'Comercial Goiás',
      Endereço: 'Rua 7, 40',
      Cidade: 'Goiânia',
      Estado: 'GO',
      Telefone: '(62) 0000-0000',
    },
  ]),

  fornecedores: rows([
    {
      Registro: '001',
      Fornecedor: 'Fornecedor Brasil S/A',
      Endereço: 'Rua das Flores, 123',
      Cidade: 'Goiânia',
      Telefone: '(62) 0000-0000',
      Vendedor: 'João',
    },
    {
      Registro: '002',
      Fornecedor: 'Distribuidora Central',
      Endereço: 'Av. Goiás, 450',
      Cidade: 'Anápolis',
      Telefone: '(62) 0000-1111',
      Vendedor: 'Carlos',
    },
  ]),

  bancos: rows([
    {
      Banco: '001 - Banco do Brasil',
      Agência: '0300-9',
      'Nome da Agência': 'Boa Vista',
      'Conta Corrente': '001145',
      Limite: '1500',
    },
    {
      Banco: '237 - Banco Bradesco',
      Agência: '1050-2',
      'Nome da Agência': 'Centro',
      'Conta Corrente': '009821',
      Limite: '3000',
    },
  ]),

  cartorios: rows([
    { 'Nome do Cartório': 'Cartório de Títulos', Contato: 'Jorge', Telefone: '011-5555-4975' },
    { 'Nome do Cartório': 'Cartório de Protesto', Contato: 'Wilson', Telefone: '011-5584-2545' },
  ]),

  plano: rows([
    { 'Nova Conta': '111.01', 'Conta Superior': '111', 'Descrição da Conta': 'Caixa' },
    { 'Nova Conta': '111.02', 'Conta Superior': '111', 'Descrição da Conta': 'Banco' },
    { 'Nova Conta': '111.03', 'Conta Superior': '111', 'Descrição da Conta': 'Aplicações' },
    { 'Nova Conta': '112.01', 'Conta Superior': '112', 'Descrição da Conta': 'Clientes' },
    {
      'Nova Conta': '112.02',
      'Conta Superior': '112',
      'Descrição da Conta': 'Duplicatas a Receber',
    },
  ]),

  lancamentos: rows([
    {
      Registro: '1',
      Data: '1998-05-03',
      'Conta de Crédito': 'Caixa',
      'Conta de Débito': 'Fornecedores',
      Valor: '511.45',
      Descrição: 'Pagamento a fornecedores',
    },
    {
      Registro: '2',
      Data: '1998-05-04',
      'Conta de Crédito': 'Caixa',
      'Conta de Débito': 'Duplicatas a Pagar',
      Valor: '5471',
      Descrição: 'Liquidação de duplicatas',
    },
  ]),

  despesas: rows([
    {
      Número: '1',
      Lançamento: '125',
      'Data Lanç.': '1998-07-31',
      'Previsão de Pagamento': '1999-12-12',
      'Valor Previsto': '150',
      Descrição: 'Conta de Água',
    },
    {
      Número: '2',
      Lançamento: '156',
      'Data Lanç.': '1998-07-31',
      'Previsão de Pagamento': '1999-12-12',
      'Valor Previsto': '120',
      Descrição: 'Conta de Luz',
    },
  ]),

  pagamentos: rows([
    {
      'Número do Título': '156456454',
      'Nome do Fornecedor': 'Fornecedor Brasil S/A',
      'Valor do Título': '200',
      'Data de Emissão': '1999-12-12',
      'Data de Vencimento': '1999-12-12',
      'Data de Pagamento': '1999-12-12',
      Situação: 'PAGO',
      Tipo: 'Duplicata',
    },
    {
      'Número do Título': '778899',
      'Nome do Fornecedor': 'Distribuidora Central',
      'Valor do Título': '850',
      'Data de Emissão': '2026-10-05',
      'Data de Vencimento': '2026-10-20',
      Situação: 'ABERTO',
      Tipo: 'Duplicata',
    },
  ]),

  recebimentos: rows([
    {
      'Número do Título': '123456',
      'Nome do Cliente': 'Cliente Exemplo',
      'Valor do Título': '100',
      'Data de Emissão': '1998-06-25',
      'Data de Vencimento': '1998-06-25',
      'Data de Pagamento': '1998-06-25',
      Situação: 'RECEBIDO',
      Tipo: 'Duplicata',
    },
    {
      'Número do Título': '998812',
      'Nome do Cliente': 'Comercial Goiás',
      'Valor do Título': '950',
      'Data de Emissão': '2026-10-02',
      'Data de Vencimento': '2026-10-18',
      Situação: 'ABERTO',
      Tipo: 'Duplicata',
    },
  ]),

  cheques: rows([
    {
      Cliente: 'Cliente Exemplo',
      'Número do Cheque': '002354',
      Emissão: '2026-10-01',
      'Data para Depósito': '2026-10-15',
      Banco: '001 - Banco do Brasil',
      Agência: '0300-9',
      'Conta Corrente': '001145',
      Valor: '1500',
    },
  ]),

  remessas: rows([
    {
      Nome: 'Cliente Exemplo',
      Cartório: 'Cartório de Protesto',
      'Número do Título': '012345',
      Remessa: '2026-10-01',
      Protesto: '2026-10-10',
    },
  ]),
};

/** Chave sob a qual os registros locais ficam guardados no navegador. */
export const STORAGE_KEY = 'contas-financeiro-v1';

/**
 * Lê os registros guardados no navegador.
 *
 * O conteúdo do `localStorage` vem de fora do programa: pode estar corrompido,
 * ser de uma versão antiga ou ter sido editado à mão. Por isso cada tela é
 * conferida antes de ser aceita, e a que não passar volta ao exemplo inicial,
 * sem derrubar as demais.
 */
export function readDatabase(): Database {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!salvo || typeof salvo !== 'object') return structuredClone(initialDatabase);

    const telas = Object.keys(initialDatabase) as Entity[];
    const conferidas = telas.map(tela => {
      const valor = (salvo as Record<string, unknown>)[tela];
      const valido =
        Array.isArray(valor) &&
        valor.every(
          linha =>
            linha &&
            typeof linha === 'object' &&
            typeof linha.id === 'string' &&
            Object.values(linha).every(campo => typeof campo === 'string'),
        );
      return [tela, valido ? valor : structuredClone(initialDatabase[tela])];
    });

    return Object.fromEntries(conferidas) as Database;
  } catch {
    // JSON inválido ou `localStorage` indisponível (janela anônima, por exemplo).
    return structuredClone(initialDatabase);
  }
}

/** Confere se um texto é o nome de uma tela de cadastro. */
export const isEntity = (value: string): value is Entity => Object.hasOwn(screens, value);

/** Lê a rota a partir do endereço, caindo no menu quando não reconhece. */
export function routeFromHash(): Route {
  const valor = window.location.hash.replace(/^#\/?/, '');
  return isEntity(valor) || valor === 'relatorios' ? valor : 'inicio';
}

/**
 * Formata um valor para exibição na tabela, conforme o tipo da coluna.
 * Campo vazio vira travessão, para a tabela não ficar com buracos.
 */
export function displayValue(value: string | undefined, format?: Column['format']): string {
  if (!value) return '–';

  if (format === 'money') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      Number(value) || 0,
    );
  }

  // A API usa yyyy-MM-dd; a tela mostra dd/MM/yyyy.
  if (format === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.split('-').reverse().join('/');
  }

  return value;
}

/**
 * Tira acentos e maiúsculas de um texto, para a busca não distinguir
 * "Goiás" de "goias".
 */
export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/**
 * Monta o registro a ser gravado, completando o que a tela preenche sozinha:
 * número sequencial, data de lançamento e situação.
 *
 * Vale apenas para as telas que ainda guardam dados no navegador; nas telas
 * integradas quem gera o identificador é a API.
 */
export function nextRecord(
  entity: Entity,
  values: Record<string, string>,
  records: RecordData[],
  original?: RecordData,
): RecordData {
  const numeros = records.map(r => Number(r.Registro || r.Número || r.id) || 0);
  const proximo = String(Math.max(0, ...numeros) + 1);

  const record: RecordData = { ...original, ...values, id: original?.id || crypto.randomUUID() };

  // `||=` só preenche quando o campo veio vazio, preservando o que o
  // usuário digitou e o que o registro já tinha.
  record.Registro ||= ['clientes', 'fornecedores'].includes(entity)
    ? proximo.padStart(3, '0')
    : proximo;

  if (entity === 'despesas') {
    record.Número ||= proximo;
    // 'sv-SE' é o atalho para a data de hoje já no formato yyyy-MM-dd.
    record['Data Lanç.'] ||= new Date().toLocaleDateString('sv-SE');
  }

  if (entity === 'pagamentos' || entity === 'recebimentos') {
    const quitado = entity === 'pagamentos' ? 'PAGO' : 'RECEBIDO';
    record.Situação = record['Data de Pagamento'] ? quitado : 'ABERTO';
  }

  return record;
}
