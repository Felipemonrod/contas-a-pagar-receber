/**
 * Configuração das telas e os dados de exemplo guardados no navegador.
 *
 * Este arquivo descreve COMO cada tela se apresenta — título, colunas da
 * tabela, botões da barra de ações — usando o vocabulário do livro
 * ("Registro", "Cliente"). Ele não sabe nada sobre a API: a tradução
 * para os nomes do contrato acontece em `src/adapters/`.
 *
 * Não guarda dados: os registros vêm todos da API. Até a integração
 * terminar havia aqui exemplos do Figma e a gravação no `localStorage`,
 * que saíram quando a última tela passou a consumir o servidor.
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
    actions: ['Incluir', 'Editar', 'Inativar', 'Localizar', 'Relatório'],
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
    actions: ['Incluir', 'Editar', 'Inativar', 'Localizar', 'Relatório'],
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
    actions: ['Inclusão', 'Exclusão'],
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
    actions: ['Incluir', 'Editar', 'Quitar', 'Cancelar', 'Localizar'],
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
    actions: ['Incluir', 'Editar', 'Receber', 'Cancelar', 'Localizar'],
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
