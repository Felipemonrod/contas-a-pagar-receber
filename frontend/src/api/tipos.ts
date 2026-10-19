/**
 * Tipos da API, espelhando `backend/docs/CONTRATO-API.md`.
 *
 * Os nomes dos campos aqui sao EXATAMENTE os nomes do JSON da API.
 * Nada e renomeado neste arquivo: a traducao para o vocabulario das telas
 * (que vem do livro: "Registro", "Cliente") acontece em `src/adapters/`.
 */

/**
 * Papeis aceitos pela API. Sao os dois codigos carregados pela migration V2
 * do back-end. Uma pessoa pode ter os dois ao mesmo tempo.
 */
export type Papel = 'CLIENTE' | 'FORNECEDOR';

/**
 * Tipo do telefone. A coluna no banco e um texto livre com o padrao
 * 'COMERCIAL', por isso aqui tambem e texto, e nao uma lista fechada.
 */
export type TipoTelefone = string;

/** Telefone como a API devolve (ja tem id). */
export type TelefoneApi = {
  id: number;
  numero: string;
  ramal: string | null;
  tipo: TipoTelefone;
};

/** Endereco como a API devolve (ja tem id). */
export type EnderecoApi = {
  id: number;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  uf: string;
  principal: boolean;
};

/** Pessoa como a API devolve em GET e em POST/PUT (status 200 e 201). */
export type PessoaApi = {
  id: number;
  nome: string;
  documento: string;
  inscricaoEstadual: string | null;
  email: string | null;
  contato: string | null;
  /** Dados comerciais do livro (cap. 5). So fazem sentido para FORNECEDOR. */
  condicaoPagamento: string | null;
  descontoNegociado: string | null;
  /** Prazo de entrega em dias; zero significa entrega imediata. */
  prazoEntregaDias: number | null;
  vendedor: string | null;
  ativo: boolean;
  papeis: Papel[];
  telefones: TelefoneApi[];
  enderecos: EnderecoApi[];
};

/**
 * Telefone no corpo de uma requisicao: ainda nao tem id.
 * Obrigatorio apenas `numero` (validacao @NotBlank no back-end).
 * `ramal` tem no maximo 6 caracteres, limite da coluna no banco.
 */
export type TelefoneNovo = {
  numero: string;
  ramal?: string;
  tipo?: TipoTelefone;
};

/**
 * Endereco no corpo de uma requisicao: ainda nao tem id.
 * Obrigatorios `logradouro`, `cidade` e `uf` (este com exatamente 2 letras).
 */
export type EnderecoNovo = {
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade: string;
  uf: string;
  principal?: boolean;
};

/**
 * Corpo de POST e PUT de /api/pessoas.
 * Obrigatorios `nome`, `documento` (unico no sistema) e `papeis` (nao vazio).
 */
export type PessoaNova = {
  nome: string;
  documento: string;
  papeis: Papel[];
  inscricaoEstadual?: string;
  email?: string;
  contato?: string;
  condicaoPagamento?: string;
  descontoNegociado?: string;
  prazoEntregaDias?: number;
  vendedor?: string;
  telefones: TelefoneNovo[];
  enderecos: EnderecoNovo[];
};

// ---------------------------------------------------------------------------
// Contas a pagar - secao 3 do contrato
// ---------------------------------------------------------------------------

/** Tipos de titulo aceitos pela API (migration V2). */
export type TipoTitulo = 'DUPLICATA' | 'NOTA_PROMISSORIA' | 'OUTROS';

/** Formas de pagamento aceitas pela API (migration V2). */
export type FormaPagamento =
  | 'DINHEIRO'
  | 'PIX'
  | 'BOLETO'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'CARTAO';

/**
 * Situacao de um titulo. `PAGA` vale para contas a pagar e `RECEBIDA` para
 * contas a receber; as demais servem para as duas.
 */
export type Situacao = 'ABERTA' | 'PARCIAL' | 'PAGA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';

/** Parcela do valor do titulo atribuida a uma categoria do plano de contas. */
export type RateioApi = {
  planoContaId: number;
  categoria: string;
  valor: number;
};

/** Um pagamento ja registrado no titulo. */
export type PagamentoApi = {
  id: number;
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  valorPago: number;
  descontoAplicado: number;
  acrescimoAplicado: number;
};

/** Conta a pagar como a API devolve. */
export type ContaPagarApi = {
  id: number;
  numeroTitulo: string;
  pessoaId: number;
  pessoaNome: string;
  tipoTitulo: TipoTitulo;
  situacao: Situacao;
  valor: number;
  totalPago: number;
  saldoDevedor: number;
  emissao: string;
  vencimento: string;
  desconto: number | null;
  validadeDesconto: string | null;
  /** Acrescimo POR DIA de atraso, e nao o acrescimo total. */
  acrescimoDia: number | null;
  observacao: string | null;
  rateios: RateioApi[];
  pagamentos: PagamentoApi[];
};

/**
 * Corpo de POST e PUT de /api/contas-pagar.
 * `numeroTitulo` tem no maximo 20 caracteres e e unico no sistema.
 * A pessoa precisa ter o papel FORNECEDOR (regra RN04).
 */
export type ContaPagarNova = {
  numeroTitulo: string;
  pessoaId: number;
  tipoTitulo: TipoTitulo;
  valor: number;
  emissao: string;
  vencimento: string;
  desconto?: number;
  validadeDesconto?: string;
  acrescimoDia?: number;
  observacao?: string;
  /**
   * Rateio entre categorias. O PUT SUBSTITUI a lista inteira: omitir aqui
   * apaga os rateios que o titulo ja tinha. Se vier preenchida, a soma
   * precisa ser igual a `valor` (regra RN12).
   */
  rateios?: RateioNovo[];
};

/** Uma parcela do rateio num corpo de requisicao: ainda sem a categoria lida. */
export type RateioNovo = {
  planoContaId: number;
  valor: number;
};

/**
 * Corpo de POST /api/contas-pagar/{id}/pagamento.
 * `valorPago` e opcional: omitido, a API cobra o valor devido integral,
 * ja com o desconto ou os juros da data.
 */
export type QuitacaoNova = {
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  valorPago?: number;
  observacao?: string;
};

/** Previa do valor devido numa data. Nao grava nada. */
export type SimulacaoApi = {
  dataSimulada: string;
  valorOriginal: number;
  descontoAplicado: number;
  acrescimoAplicado: number;
  valorDevido: number;
};

// ---------------------------------------------------------------------------
// Contas a receber - secao 4 do contrato
// ---------------------------------------------------------------------------

/**
 * Espelho de ContaPagarApi. As diferencas sao so de nome:
 * `totalRecebido` no lugar de `totalPago`, `recebimentos` no lugar de
 * `pagamentos`, e a situacao final e RECEBIDA em vez de PAGA.
 */
export type RecebimentoApi = {
  id: number;
  dataRecebimento: string;
  formaPagamento: FormaPagamento;
  valorRecebido: number;
  descontoAplicado: number;
  acrescimoAplicado: number;
};

export type ContaReceberApi = {
  id: number;
  numeroTitulo: string;
  pessoaId: number;
  pessoaNome: string;
  tipoTitulo: TipoTitulo;
  situacao: Situacao;
  valor: number;
  totalRecebido: number;
  saldoDevedor: number;
  emissao: string;
  vencimento: string;
  desconto: number | null;
  validadeDesconto: string | null;
  acrescimoDia: number | null;
  observacao: string | null;
  rateios: RateioApi[];
  recebimentos: RecebimentoApi[];
};

/** Corpo de POST e PUT de /api/contas-receber. Exige papel CLIENTE (RN04). */
export type ContaReceberNova = ContaPagarNova;

/** Corpo de POST /api/contas-receber/{id}/recebimento. */
export type QuitacaoRecebimentoNova = {
  dataRecebimento: string;
  formaPagamento: FormaPagamento;
  valorRecebido?: number;
  observacao?: string;
};

// ---------------------------------------------------------------------------
// Plano de contas - secao 2 do contrato
// ---------------------------------------------------------------------------

/**
 * Categoria financeira. Conta consolidada agrupa outras e NAO aceita
 * lancamento (regra RN01); conta analitica aceita.
 *
 * O tipo e recursivo: cada conta traz suas subcontas, formando a arvore.
 */
export type PlanoContaApi = {
  id: number;
  codigo: string;
  descricao: string;
  consolidada: boolean;
  codigoSuperior: string | null;
  subcontas: PlanoContaApi[];
};

/** Versao plana, devolvida por /analiticas, para preencher combos. */
export type PlanoContaItemApi = {
  id: number;
  codigo: string;
  descricao: string;
  consolidada: boolean;
};

/** Corpo de POST e PUT de /api/plano-contas. */
export type PlanoContaNovo = {
  codigo: string;
  descricao: string;
  codigoSuperior?: string;
  consolidada: boolean;
};

// ---------------------------------------------------------------------------
// Despesas - secao 5 do contrato
// ---------------------------------------------------------------------------

/**
 * Previsao de gasto que depois vira titulo a pagar.
 * Depois de convertida, `realizada` fica verdadeira e `contaPagarId` e
 * `numeroTitulo` apontam para o titulo gerado.
 */
export type DespesaApi = {
  id: number;
  planoContaId: number;
  categoria: string;
  descricao: string;
  valorPrevisto: number;
  dataLancamento: string;
  previsaoPagamento: string;
  realizada: boolean;
  contaPagarId: number | null;
  numeroTitulo: string | null;
};

/** Corpo de POST e PUT de /api/despesas. */
export type DespesaNova = {
  planoContaId: number;
  descricao: string;
  valorPrevisto: number;
  previsaoPagamento: string;
};

/** Corpo de POST /api/despesas/{id}/gerar-titulo. */
export type GerarTituloNovo = {
  numeroTitulo: string;
  pessoaId: number;
  valor: number;
  emissao: string;
  vencimento: string;
  tipoTitulo?: TipoTitulo;
};

// ---------------------------------------------------------------------------
// Relatorios - secao 6 do contrato
// ---------------------------------------------------------------------------

/** Posicao de um lado do caixa (a pagar ou a receber) no periodo. */
export type PosicaoApi = {
  quantidadeTitulos: number;
  valorTotal: number;
  valorQuitado: number;
  saldoEmAberto: number;
  quantidadeVencidos: number;
  valorVencido: number;
};

/** Resumo financeiro do periodo: o que entra, o que sai e o que sobra. */
export type ResumoApi = {
  de: string;
  ate: string;
  contasAPagar: PosicaoApi;
  contasAReceber: PosicaoApi;
  saldoProjetado: number;
  saldoRealizado: number;
};

/** Totais agrupados por categoria do plano de contas. */
export type TotalPorCategoriaApi = {
  codigo: string;
  descricao: string;
  totalAPagar: number;
  totalAReceber: number;
};

/** Titulo vencido e ainda em aberto. */
export type TituloVencidoApi = {
  origem: 'CONTA_A_PAGAR' | 'CONTA_A_RECEBER';
  numeroTitulo: string;
  pessoa: string;
  vencimento: string;
  diasAtraso: number;
  saldoDevedor: number;
};

export type InadimplenciaApi = {
  posicaoEm: string;
  totalAPagarVencido: number;
  totalAReceberVencido: number;
  titulos: TituloVencidoApi[];
};

// ---------------------------------------------------------------------------
// Cadastro bancario - secao 7 do contrato (livro, cap. 9)
// ---------------------------------------------------------------------------

/**
 * Cadeia de tres niveis: um banco tem agencias, uma agencia tem contas.
 * GET /api/bancos ja devolve tudo aninhado, pronto para a arvore da tela.
 */
export type ContaCorrenteApi = {
  id: number;
  agenciaId: number;
  numero: string;
  tipo: string;
  limite: number | null;
  ativa: boolean;
  /** Pronta para exibir: "341 / 1234 / 56789-0". */
  identificacao: string;
};

export type AgenciaApi = {
  id: number;
  bancoId: number;
  bancoCodigo: string;
  bancoNome: string;
  numero: string;
  nome: string | null;
  endereco: string | null;
  gerente: string | null;
  telefone: string | null;
  ramal: string | null;
  fax: string | null;
  email: string | null;
  contas: ContaCorrenteApi[];
};

export type BancoApi = {
  id: number;
  codigo: string;
  nome: string;
  agencias: AgenciaApi[];
};

/** Versao plana de banco, para combos. */
export type BancoItemApi = {
  id: number;
  codigo: string;
  nome: string;
};

/** Corpo de POST e PUT de /api/bancos. Codigo unico, ate 4 caracteres. */
export type BancoNovo = {
  codigo: string;
  nome: string;
};

/** Corpo de /api/agencias. O numero e unico DENTRO do banco. */
export type AgenciaNova = {
  bancoId: number;
  numero: string;
  nome?: string;
  gerente?: string;
  telefone?: string;
  ramal?: string;
  fax?: string;
  email?: string;
  endereco?: string;
};

/** Corpo de /api/contas-correntes. */
export type ContaCorrenteNova = {
  agenciaId: number;
  numero: string;
  tipo?: string;
  limite?: number;
};

// ---------------------------------------------------------------------------
// Cartorios e remessa para protesto - secao 8 (livro, cap. 10 e 17)
// ---------------------------------------------------------------------------

export type CartorioApi = {
  id: number;
  nome: string;
  contato: string | null;
  telefone: string | null;
};

export type CartorioNovo = {
  nome: string;
  contato?: string;
  telefone?: string;
};

/** Situacao da remessa, derivada das datas pelo back-end. */
export type SituacaoRemessa = 'ENVIADA' | 'PROTESTADA' | 'BAIXADA';

export type RemessaApi = {
  id: number;
  cartorioId: number;
  cartorioNome: string;
  contaReceberId: number;
  numeroTitulo: string;
  cliente: string;
  valorTitulo: number;
  saldoDevedor: number;
  vencimentoTitulo: string;
  dataRemessa: string;
  dataProtesto: string | null;
  dataBaixa: string | null;
  situacao: SituacaoRemessa;
  observacao: string | null;
};

/**
 * Corpo de POST /api/remessas-cartorio.
 * Regra RN09: so vai a protesto titulo VENCIDO e NAO QUITADO; a API recusa
 * com 422 um titulo a vencer, quitado ou cancelado. `dataRemessa` e
 * opcional e, omitida, vale hoje.
 */
export type RemessaNova = {
  cartorioId: number;
  contaReceberId: number;
  dataRemessa?: string;
  observacao?: string;
};

// ---------------------------------------------------------------------------
// Lancamento contabil - secao 9 (livro, cap. 12)
// ---------------------------------------------------------------------------

/** Partida dobrada: o valor sai de uma conta e entra em outra. */
export type StatusLancamento = 'ATIVO' | 'ESTORNADO';

export type LancamentoApi = {
  id: number;
  contaCreditoId: number;
  /** Ja formatada pela API, como '11.01 - Caixa'. */
  contaCredito: string;
  contaDebitoId: number;
  contaDebito: string;
  valor: number;
  descricao: string;
  data: string;
  status: StatusLancamento;
};

/**
 * Corpo de POST /api/lancamentos.
 * As duas contas precisam ser DIFERENTES e ambas ANALITICAS: conta
 * consolidada nao aceita lancamento (422, regra RN01).
 */
export type LancamentoNovo = {
  contaCreditoId: number;
  contaDebitoId: number;
  valor: number;
  descricao: string;
  data: string;
};

// ---------------------------------------------------------------------------
// Cheque pre-datado - secao 10 (livro, cap. 16)
// ---------------------------------------------------------------------------

/**
 * Ciclo do cheque: EM_CARTEIRA -> DEPOSITADO -> COMPENSADO ou DEVOLVIDO.
 * Cheque compensado nao muda mais de situacao (422).
 */
export type SituacaoCheque = 'EM_CARTEIRA' | 'DEPOSITADO' | 'COMPENSADO' | 'DEVOLVIDO';

export type ChequeApi = {
  id: number;
  numeroCheque: string;
  pessoaId: number;
  emitente: string;
  contaCorrenteId: number;
  /** Ja formatada pela API: "341 / 1234 / 56789-0". */
  contaCorrente: string;
  emissao: string;
  deposito: string;
  valor: number;
  situacao: SituacaoCheque;
  /** Verdadeiro quando segue em carteira com a data de deposito ja passada. */
  vencido: boolean;
  contaReceberId: number | null;
  numeroTitulo: string | null;
  descricao: string | null;
};

/**
 * Corpo de POST e PUT de /api/cheques.
 * O emitente precisa ter o papel CLIENTE, e o numero e unico por conta
 * corrente. `contaReceberId` e opcional e liga o cheque ao titulo que ele
 * garante. O PUT so vale enquanto o cheque esta EM_CARTEIRA.
 */
export type ChequeNovo = {
  numeroCheque: string;
  pessoaId: number;
  contaCorrenteId: number;
  emissao: string;
  deposito: string;
  valor: number;
  contaReceberId?: number;
  descricao?: string;
};

/** Corpo de POST /api/cheques/{id}/situacao. */
export type MudancaDeSituacao = {
  situacao: SituacaoCheque;
  observacao?: string;
};
