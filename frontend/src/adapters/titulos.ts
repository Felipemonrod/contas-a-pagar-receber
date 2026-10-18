/**
 * Adapter dos titulos — contas a pagar e contas a receber.
 *
 * Os dois sao a mesma coisa vista dos dois lados do caixa, e a API trata
 * assim: os endpoints sao espelhados e so mudam de nome (`totalPago` x
 * `totalRecebido`, `pagamentos` x `recebimentos`, PAGA x RECEBIDA).
 *
 * Em vez de escrever duas telas quase iguais, as duas respostas sao
 * convertidas aqui numa forma comum, `Titulo`, e a tela trabalha so com ela.
 * E a mesma ideia do adapter de Pessoa, onde cliente e fornecedor viraram
 * uma tela so com o papel por parametro.
 */

import type {
  ContaPagarApi,
  ContaPagarNova,
  RateioApi,
  ContaReceberApi,
  FormaPagamento,
  Papel,
  PessoaApi,
  Situacao,
  TipoTitulo,
} from '../api/tipos';
import type { RecordData } from '../data';

/** De que lado do caixa estamos olhando. */
export type Direcao = 'PAGAR' | 'RECEBER';

/** Uma quitacao, seja ela pagamento ou recebimento. */
export type Quitacao = {
  data: string;
  forma: FormaPagamento;
  valor: number;
};

/** Forma comum dos dois tipos de titulo, usada pelas telas. */
export type Titulo = {
  id: number;
  numeroTitulo: string;
  pessoaId: number;
  pessoaNome: string;
  tipoTitulo: TipoTitulo;
  situacao: Situacao;
  valor: number;
  /** `totalPago` ou `totalRecebido`, conforme o lado. */
  totalQuitado: number;
  saldoDevedor: number;
  emissao: string;
  vencimento: string;
  desconto: number | null;
  validadeDesconto: string | null;
  /** Acrescimo POR DIA de atraso, e nao o acrescimo total. */
  acrescimoDia: number | null;
  observacao: string | null;
  /** Rateio entre categorias, como esta hoje na API. */
  rateios: RateioApi[];
  quitacoes: Quitacao[];
};

/**
 * Rotulo mostrado na tela para cada codigo de tipo da API.
 *
 * A tela do livro oferecia "Boleto", "Nota Fiscal" e "Recibo", que a API
 * recusa. A lista tem exatamente os tres tipos que o back-end carrega.
 */
export const TIPOS_DE_TITULO: Record<TipoTitulo, string> = {
  DUPLICATA: 'Duplicata',
  NOTA_PROMISSORIA: 'Nota Promissória',
  OUTROS: 'Outros',
};

/** Converte o codigo da API no rotulo da tela. */
export function tipoParaRotulo(tipo: TipoTitulo): string {
  return TIPOS_DE_TITULO[tipo];
}

/** Converte o rotulo escolhido na tela no codigo da API. */
export function rotuloParaTipo(rotulo: string): TipoTitulo {
  const encontrado = (Object.keys(TIPOS_DE_TITULO) as TipoTitulo[]).find(
    codigo => TIPOS_DE_TITULO[codigo] === rotulo,
  );
  // Sem correspondencia, "Outros" e o tipo neutro que a API sempre aceita.
  return encontrado ?? 'OUTROS';
}

/** O que muda entre as duas telas. */
export type ConfiguracaoDoLado = {
  direcao: Direcao;
  /** Papel que a pessoa precisa ter na API (regra RN04). */
  papel: Papel;
  /** Como a tela chama a pessoa: "Nome do Fornecedor" ou "Nome do Cliente". */
  campoDaPessoa: string;
  /** Situacao em que o titulo fica quando quitado por inteiro. */
  situacaoQuitada: Situacao;
};

export const LADO_A_PAGAR: ConfiguracaoDoLado = {
  direcao: 'PAGAR',
  papel: 'FORNECEDOR',
  campoDaPessoa: 'Nome do Fornecedor',
  situacaoQuitada: 'PAGA',
};

export const LADO_A_RECEBER: ConfiguracaoDoLado = {
  direcao: 'RECEBER',
  papel: 'CLIENTE',
  campoDaPessoa: 'Nome do Cliente',
  situacaoQuitada: 'RECEBIDA',
};

/** Converte uma conta a pagar na forma comum. */
export function dePagar(conta: ContaPagarApi): Titulo {
  const { totalPago, pagamentos, ...resto } = conta;
  return {
    ...resto,
    totalQuitado: totalPago,
    quitacoes: pagamentos.map(p => ({
      data: p.dataPagamento,
      forma: p.formaPagamento,
      valor: p.valorPago,
    })),
  };
}

/** Converte uma conta a receber na forma comum. */
export function deReceber(conta: ContaReceberApi): Titulo {
  const { totalRecebido, recebimentos, ...resto } = conta;
  return {
    ...resto,
    totalQuitado: totalRecebido,
    quitacoes: recebimentos.map(r => ({
      data: r.dataRecebimento,
      forma: r.formaPagamento,
      valor: r.valorRecebido,
    })),
  };
}

/**
 * Texto de um valor monetario para o input `type="number"` da tela.
 * Campo nulo ou zero na API vira texto vazio, que o input entende como
 * "em branco", para a tela nao mostrar um zero que o usuario nao digitou.
 */
function dinheiroParaTexto(valor: number | null): string {
  return valor === null || valor === 0 ? '' : String(valor);
}

/**
 * Le um campo numerico do formulario.
 * Texto vazio vira `undefined`, para o campo nao ser enviado a API.
 */
function textoParaDinheiro(texto: string): number | undefined {
  const limpo = texto.trim();
  if (!limpo) return undefined;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Converte um titulo na linha que a tela exibe.
 *
 * "Data de Pagamento" nao e um campo do titulo na API: vem da ultima
 * quitacao registrada, e fica vazia enquanto o titulo esta em aberto.
 */
export function tituloParaRegistro(titulo: Titulo, lado: ConfiguracaoDoLado): RecordData {
  const ultima = titulo.quitacoes[titulo.quitacoes.length - 1];

  return {
    id: String(titulo.id),
    'Número do Título': titulo.numeroTitulo,
    [lado.campoDaPessoa]: titulo.pessoaNome,
    Tipo: tipoParaRotulo(titulo.tipoTitulo),
    'Valor do Título': String(titulo.valor),
    'Data de Emissão': titulo.emissao,
    'Data de Vencimento': titulo.vencimento,
    'Data de Pagamento': ultima?.data ?? '',
    Situação: titulo.situacao,
    'Valor do Desconto': dinheiroParaTexto(titulo.desconto),
    'Validade do Desconto': titulo.validadeDesconto ?? '',
    'Acréscimo por Dia': dinheiroParaTexto(titulo.acrescimoDia),
    Observação: titulo.observacao ?? '',
    'Total Pago': String(titulo.totalQuitado),
    'Saldo Devedor': String(titulo.saldoDevedor),
  };
}

/**
 * Converte o formulario da tela no corpo que a API espera.
 *
 * O corpo e o mesmo nos dois lados: so o endereco do endpoint muda.
 *
 * O PUT substitui a lista de rateios por inteiro, e o formulario do livro
 * nao mostra rateio nenhum. Sem devolver os rateios atuais, gravar uma
 * alteracao qualquer apagaria em silencio o rateio do titulo. E o mesmo
 * cuidado que o adapter de Pessoa tem com telefones e enderecos.
 *
 * @param pessoaId pessoa ja resolvida pela tela a partir do nome escolhido
 * @param tituloAtual titulo como esta hoje na API, ao editar um registro
 */
export function registroParaTitulo(
  valores: Record<string, string>,
  pessoaId: number,
  tituloAtual?: Titulo,
): ContaPagarNova {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  // Repassa o rateio como esta. Se o usuario mudar o valor do titulo, a
  // soma deixa de bater e a API recusa com 422 e mensagem clara (RN12) —
  // melhor do que apagar o rateio sem avisar.
  const rateios = tituloAtual?.rateios.length
    ? tituloAtual.rateios.map(r => ({ planoContaId: r.planoContaId, valor: r.valor }))
    : undefined;

  return {
    rateios,
    numeroTitulo: campo('Número do Título'),
    pessoaId,
    tipoTitulo: rotuloParaTipo(campo('Tipo')),
    // O valor e obrigatorio na API; 0 faz a API responder 400, com mensagem.
    valor: textoParaDinheiro(campo('Valor do Título')) ?? 0,
    emissao: campo('Data de Emissão'),
    vencimento: campo('Data de Vencimento'),
    desconto: textoParaDinheiro(campo('Valor do Desconto')),
    validadeDesconto: campo('Validade do Desconto') || undefined,
    acrescimoDia: textoParaDinheiro(campo('Acréscimo por Dia')),
    observacao: campo('Observação') || undefined,
  };
}

/**
 * Acha a pessoa pelo nome escolhido no formulario.
 *
 * A tela mostra nomes porque e assim no livro; a API identifica por id.
 * Devolve `undefined` quando nao ha correspondencia, e a tela avisa o
 * usuario em vez de mandar um id invalido.
 */
export function acharPessoaPorNome(
  nome: string,
  pessoas: PessoaApi[],
): PessoaApi | undefined {
  const procurado = nome.trim();
  return pessoas.find(pessoa => pessoa.nome === procurado);
}
