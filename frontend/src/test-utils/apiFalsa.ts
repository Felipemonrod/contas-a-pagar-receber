/**
 * API de mentira para os testes.
 *
 * Substitui `fetch` por uma implementacao em memoria que responde como a API
 * de verdade responde, inclusive nos erros. Cobre /api/pessoas e
 * /api/contas-pagar, e repete de proposito dois comportamentos do back-end
 * que o front-end precisa tratar:
 *
 *  - o filtro `nome` tem prioridade sobre `papel` em /pessoas;
 *  - numeroTitulo e documento sao unicos, e repetir devolve 422.
 *
 * Assim os testes das telas integradas rodam sem back-end e sem banco, e
 * continuam valendo como prova de que o adapter monta o corpo certo.
 */

import { vi } from 'vitest';
import type {
  ContaPagarApi,
  ContaPagarNova,
  ContaReceberApi,
  QuitacaoRecebimentoNova,
  PagamentoApi,
  PessoaApi,
  PessoaNova,
  DespesaApi,
  DespesaNova,
  GerarTituloNovo,
  PlanoContaApi,
  PlanoContaNovo,
  QuitacaoNova,
  SimulacaoApi,
} from '../api/tipos';

/** Registro de uma chamada recebida, para os testes inspecionarem. */
export type ChamadaRegistrada = {
  metodo: string;
  url: string;
  corpo: Record<string, unknown> | null;
};

/** Controle devolvido ao teste para inspecionar e preparar o estado. */
export type ApiFalsa = {
  pessoas: () => PessoaApi[];
  contas: () => ContaPagarApi[];
  contasReceber: () => ContaPagarApi[];
  planoContas: () => Omit<PlanoContaApi, 'subcontas'>[];
  despesas: () => DespesaApi[];
  chamadas: () => ChamadaRegistrada[];
  /** Ultimo corpo enviado num POST ou PUT. */
  ultimoCorpo: () => Record<string, unknown> | null;
};

/** Monta uma resposta de erro no formato do contrato. */
function respostaDeErro(status: number, codigo: string, mensagem: string): Response {
  return new Response(
    JSON.stringify({ timestamp: new Date().toISOString(), status, erro: codigo, mensagem, campos: [] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Monta uma resposta de sucesso com corpo JSON. */
function respostaOk(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Compara textos ignorando maiusculas e acentos, como o MySQL do back-end
 * faz com a collation padrao (utf8mb4_0900_ai_ci).
 */
function contemTexto(todo: string, parte: string): boolean {
  const limpar = (valor: string) =>
    valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return limpar(todo).includes(limpar(parte));
}

/** Diferenca em dias entre duas datas `yyyy-MM-dd`. */
function diasEntre(inicio: string, fim: string): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / umDia);
}

/** Converte o corpo de uma requisicao na pessoa que a API devolveria. */
function montarPessoa(corpo: PessoaNova, id: number): PessoaApi {
  return {
    id,
    nome: corpo.nome,
    documento: corpo.documento,
    inscricaoEstadual: corpo.inscricaoEstadual ?? null,
    email: corpo.email ?? null,
    contato: corpo.contato ?? null,
    condicaoPagamento: corpo.condicaoPagamento ?? null,
    descontoNegociado: corpo.descontoNegociado ?? null,
    prazoEntregaDias: corpo.prazoEntregaDias ?? null,
    vendedor: corpo.vendedor ?? null,
    ativo: true,
    papeis: corpo.papeis,
    telefones: corpo.telefones.map((telefone, indice) => ({
      id: indice + 1,
      numero: telefone.numero,
      ramal: telefone.ramal ?? null,
      tipo: telefone.tipo ?? 'COMERCIAL',
    })),
    enderecos: corpo.enderecos.map((endereco, indice) => ({
      id: indice + 1,
      logradouro: endereco.logradouro,
      numero: endereco.numero ?? null,
      complemento: endereco.complemento ?? null,
      bairro: endereco.bairro ?? null,
      cep: endereco.cep ?? null,
      cidade: endereco.cidade,
      uf: endereco.uf,
      principal: endereco.principal ?? false,
    })),
  };
}

/** Nome de exibicao de uma categoria, no formato que a API usa. */
function categoriaDe(planoContaId: number): string {
  const conta = PLANO_INICIAL.find(c => c.id === planoContaId);
  return conta ? `${conta.codigo} - ${conta.descricao}` : '';
}

/** Converte o corpo de uma requisicao no titulo que a API devolveria. */
function montarConta(corpo: ContaPagarNova, id: number, pessoaNome: string): ContaPagarApi {
  return {
    id,
    numeroTitulo: corpo.numeroTitulo,
    pessoaId: corpo.pessoaId,
    pessoaNome,
    tipoTitulo: corpo.tipoTitulo,
    situacao: 'ABERTA',
    valor: corpo.valor,
    totalPago: 0,
    saldoDevedor: corpo.valor,
    emissao: corpo.emissao,
    vencimento: corpo.vencimento,
    desconto: corpo.desconto ?? null,
    validadeDesconto: corpo.validadeDesconto ?? null,
    acrescimoDia: corpo.acrescimoDia ?? null,
    observacao: corpo.observacao ?? null,
    // Igual ao back-end: o POST e o PUT gravam exatamente os rateios que
    // vierem no corpo. Corpo sem rateios deixa o titulo sem rateio nenhum.
    rateios: (corpo.rateios ?? []).map(r => ({
      planoContaId: r.planoContaId,
      categoria: categoriaDe(r.planoContaId),
      valor: r.valor,
    })),
    pagamentos: [],
  };
}

/**
 * Converte um titulo guardado para os nomes que /contas-receber usa.
 * Guardamos tudo no formato de contas a pagar e traduzimos na saida, que e
 * exatamente a relacao entre os dois endpoints descrita no contrato.
 */
function paraFormatoReceber(conta: ContaPagarApi): ContaReceberApi {
  const { totalPago, pagamentos, ...resto } = conta;
  return {
    ...resto,
    totalRecebido: totalPago,
    recebimentos: pagamentos.map(p => ({
      id: p.id,
      dataRecebimento: p.dataPagamento,
      formaPagamento: p.formaPagamento,
      valorRecebido: p.valorPago,
      descontoAplicado: p.descontoAplicado,
      acrescimoAplicado: p.acrescimoAplicado,
    })),
  };
}

/**
 * Calcula o valor devido numa data, como a regra RN05 do back-end:
 * desconto vale ate `validadeDesconto`; depois do vencimento, soma
 * `acrescimoDia` por dia de atraso.
 */
function simular(conta: ContaPagarApi, data: string): SimulacaoApi {
  const dentroDaValidade = conta.validadeDesconto ? data <= conta.validadeDesconto : false;
  const descontoAplicado = dentroDaValidade ? (conta.desconto ?? 0) : 0;

  const atraso = Math.max(0, diasEntre(conta.vencimento, data));
  const acrescimoAplicado = atraso > 0 ? (conta.acrescimoDia ?? 0) * atraso : 0;

  return {
    dataSimulada: data,
    valorOriginal: conta.valor,
    descontoAplicado,
    acrescimoAplicado,
    valorDevido: conta.saldoDevedor - descontoAplicado + acrescimoAplicado,
  };
}

/** Uma conta do plano, guardada sem as subcontas. */
type ContaPlana = Omit<PlanoContaApi, 'subcontas'>;

/**
 * Plano de contas inicial: os mesmos codigos que a migration V2 carrega,
 * para os testes verem a mesma estrutura que a API de verdade devolve.
 */
const PLANO_INICIAL: ContaPlana[] = [
  { id: 1, codigo: '1', descricao: 'ATIVO', consolidada: true, codigoSuperior: null },
  { id: 2, codigo: '2', descricao: 'PASSIVO', consolidada: true, codigoSuperior: null },
  { id: 3, codigo: '11', descricao: 'ATIVO CIRCULANTE', consolidada: true, codigoSuperior: '1' },
  { id: 4, codigo: '21', descricao: 'PASSIVO CIRCULANTE', consolidada: true, codigoSuperior: '2' },
  { id: 5, codigo: '11.01', descricao: 'Caixa', consolidada: false, codigoSuperior: '11' },
  { id: 6, codigo: '11.02', descricao: 'Bancos c/ Movimento', consolidada: false, codigoSuperior: '11' },
  { id: 7, codigo: '21.03', descricao: 'Energia Eletrica', consolidada: false, codigoSuperior: '21' },
];

/** Ultima API falsa instalada, para os testes consultarem sem repassa-la. */
let instalada: ApiFalsa | null = null;

/** Devolve a API falsa instalada pelo test-setup no teste atual. */
export function apiFalsaAtual(): ApiFalsa {
  if (!instalada) throw new Error('Nenhuma API falsa instalada neste teste.');
  return instalada;
}

/**
 * Troca `fetch` pela API de mentira. Chamar dentro de um teste ou de um
 * `beforeEach`; o `vi.restoreAllMocks()` do test-setup desfaz no final.
 *
 * @param pessoasIniciais pessoas ja cadastradas quando o teste comeca
 * @param contasIniciais titulos a pagar ja lancados quando o teste comeca
 */
export function instalarApiFalsa(
  pessoasIniciais: PessoaNova[] = [],
  contasIniciais: ContaPagarNova[] = [],
): ApiFalsa {
  let proximaPessoa = 1;
  let proximaConta = 1;
  let proximoPagamento = 1;

  const pessoas: PessoaApi[] = pessoasIniciais.map(c => montarPessoa(c, proximaPessoa++));
  const contas: ContaPagarApi[] = contasIniciais.map(corpo =>
    montarConta(
      corpo,
      proximaConta++,
      pessoas.find(p => p.id === corpo.pessoaId)?.nome ?? 'Fornecedor',
    ),
  );
  const planoContas: ContaPlana[] = PLANO_INICIAL.map(c => ({ ...c }));
  let proximoPlano = PLANO_INICIAL.length + 1;

  /** Remonta a arvore a partir da lista plana, como o back-end faz. */
  const montarArvore = (superior: string | null = null): PlanoContaApi[] =>
    planoContas
      .filter(c => c.codigoSuperior === superior)
      .map(c => ({ ...c, subcontas: montarArvore(c.codigo) }));

  const despesas: DespesaApi[] = [];
  let proximaDespesa = 1;
  const contasReceber: ContaPagarApi[] = [];
  let proximaContaReceber = 1;
  const chamadas: ChamadaRegistrada[] = [];

  /** Ordena por nome, como o "OrderByNome" das consultas do back-end. */
  const ordenar = (lista: PessoaApi[]) =>
    [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada, opcoes) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    const metodo = opcoes?.method ?? 'GET';
    const texto = typeof opcoes?.body === 'string' ? opcoes.body : null;
    const corpo = texto ? (JSON.parse(texto) as Record<string, unknown>) : null;
    chamadas.push({ metodo, url, corpo });

    const endereco = new URL(url);
    const caminho = endereco.pathname.replace('/api', '');

    // ----- /pessoas -------------------------------------------------------
    if (caminho === '/pessoas' && metodo === 'GET') {
      const nome = endereco.searchParams.get('nome');
      const papel = endereco.searchParams.get('papel');
      // Igual ao back-end: havendo `nome`, o `papel` e ignorado.
      if (nome) return respostaOk(ordenar(pessoas.filter(p => contemTexto(p.nome, nome))));
      if (papel) {
        return respostaOk(ordenar(pessoas.filter(p => p.papeis.some(item => item === papel))));
      }
      return respostaOk(ordenar(pessoas));
    }

    if (caminho === '/pessoas' && metodo === 'POST' && corpo) {
      const nova = corpo as unknown as PessoaNova;
      if (pessoas.some(p => p.documento === nova.documento)) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Documento ja cadastrado para outra pessoa.');
      }
      const criada = montarPessoa(nova, proximaPessoa++);
      pessoas.push(criada);
      return respostaOk(criada, 201);
    }

    const pessoaComId = /^\/pessoas\/(\d+)$/.exec(caminho);
    if (pessoaComId) {
      const id = Number(pessoaComId[1]);
      const posicao = pessoas.findIndex(p => p.id === id);
      if (posicao === -1) {
        return respostaDeErro(404, 'NAO_ENCONTRADO', `Pessoa ${id} nao encontrada.`);
      }
      if (metodo === 'PUT' && corpo) {
        pessoas[posicao] = montarPessoa(corpo as unknown as PessoaNova, id);
        return respostaOk(pessoas[posicao]);
      }
      if (metodo === 'DELETE') {
        pessoas[posicao] = { ...pessoas[posicao], ativo: false };
        return respostaOk(pessoas[posicao]);
      }
      return respostaOk(pessoas[posicao]);
    }

    // ----- /contas-pagar --------------------------------------------------
    if (caminho === '/contas-pagar' && metodo === 'GET') {
      return respostaOk(contas);
    }

    if (caminho === '/contas-pagar' && metodo === 'POST' && corpo) {
      const nova = corpo as unknown as ContaPagarNova;
      if (contas.some(c => c.numeroTitulo === nova.numeroTitulo)) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Ja existe um titulo com este numero.');
      }
      if (nova.vencimento < nova.emissao) {
        return respostaDeErro(
          422,
          'REGRA_NEGOCIO',
          'O vencimento nao pode ser anterior a emissao.',
        );
      }
      const fornecedor = pessoas.find(p => p.id === nova.pessoaId);
      // Regra RN04: titulo a pagar exige o papel FORNECEDOR.
      if (!fornecedor?.papeis.includes('FORNECEDOR')) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'A pessoa informada nao e um fornecedor.');
      }
      const criada = montarConta(nova, proximaConta++, fornecedor.nome);
      contas.push(criada);
      return respostaOk(criada, 201);
    }

    const simulacao = /^\/contas-pagar\/(\d+)\/simulacao$/.exec(caminho);
    if (simulacao) {
      const conta = contas.find(c => c.id === Number(simulacao[1]));
      if (!conta) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');
      return respostaOk(simular(conta, endereco.searchParams.get('data') ?? ''));
    }

    const quitacao = /^\/contas-pagar\/(\d+)\/pagamento$/.exec(caminho);
    if (quitacao && metodo === 'POST' && corpo) {
      const posicao = contas.findIndex(c => c.id === Number(quitacao[1]));
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');

      const conta = contas[posicao];
      // Regra RN07: titulo ja quitado nao aceita nova quitacao.
      if (conta.situacao === 'PAGA') {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Este titulo ja esta quitado.');
      }

      const pedido = corpo as unknown as QuitacaoNova;
      const previa = simular(conta, pedido.dataPagamento);
      const valorPago = pedido.valorPago ?? previa.valorDevido;

      const pagamento: PagamentoApi = {
        id: proximoPagamento++,
        dataPagamento: pedido.dataPagamento,
        formaPagamento: pedido.formaPagamento,
        valorPago,
        descontoAplicado: previa.descontoAplicado,
        acrescimoAplicado: previa.acrescimoAplicado,
      };

      const totalPago = conta.totalPago + valorPago;
      const saldoDevedor = Math.max(0, previa.valorDevido - valorPago);

      contas[posicao] = {
        ...conta,
        totalPago,
        saldoDevedor,
        situacao: saldoDevedor === 0 ? 'PAGA' : 'PARCIAL',
        pagamentos: [...conta.pagamentos, pagamento],
      };
      return respostaOk(contas[posicao]);
    }

    const contaComId = /^\/contas-pagar\/(\d+)$/.exec(caminho);
    if (contaComId) {
      const id = Number(contaComId[1]);
      const posicao = contas.findIndex(c => c.id === id);
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');

      if (metodo === 'PUT' && corpo) {
        // Regra RN11: titulo com pagamento nao pode ser alterado.
        if (contas[posicao].pagamentos.length) {
          return respostaDeErro(
            422,
            'REGRA_NEGOCIO',
            'Titulo com pagamento registrado nao pode ser alterado.',
          );
        }
        const alterada = corpo as unknown as ContaPagarNova;
        const fornecedor = pessoas.find(p => p.id === alterada.pessoaId);
        contas[posicao] = montarConta(alterada, id, fornecedor?.nome ?? 'Fornecedor');
        return respostaOk(contas[posicao]);
      }
      if (metodo === 'DELETE') {
        contas[posicao] = { ...contas[posicao], situacao: 'CANCELADA' };
        return respostaOk(contas[posicao]);
      }
      return respostaOk(contas[posicao]);
    }

    // ----- /contas-receber ------------------------------------------------
    // Espelho de /contas-pagar: guardamos os titulos no mesmo formato e so
    // trocamos os nomes na resposta, como o back-end faz.
    if (caminho === '/contas-receber' && metodo === 'GET') {
      return respostaOk(contasReceber.map(paraFormatoReceber));
    }

    if (caminho === '/contas-receber' && metodo === 'POST' && corpo) {
      const nova = corpo as unknown as ContaPagarNova;
      if (contasReceber.some(c => c.numeroTitulo === nova.numeroTitulo)) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Ja existe um titulo com este numero.');
      }
      const cliente = pessoas.find(p => p.id === nova.pessoaId);
      // Regra RN04: titulo a receber exige o papel CLIENTE.
      if (!cliente?.papeis.includes('CLIENTE')) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'A pessoa informada nao e um cliente.');
      }
      const criada = montarConta(nova, proximaContaReceber++, cliente.nome);
      contasReceber.push(criada);
      return respostaOk(paraFormatoReceber(criada), 201);
    }

    const simulacaoReceber = /^\/contas-receber\/(\d+)\/simulacao$/.exec(caminho);
    if (simulacaoReceber) {
      const conta = contasReceber.find(c => c.id === Number(simulacaoReceber[1]));
      if (!conta) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');
      return respostaOk(simular(conta, endereco.searchParams.get('data') ?? ''));
    }

    const recebimento = /^\/contas-receber\/(\d+)\/recebimento$/.exec(caminho);
    if (recebimento && metodo === 'POST' && corpo) {
      const posicao = contasReceber.findIndex(c => c.id === Number(recebimento[1]));
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');

      const conta = contasReceber[posicao];
      if (conta.situacao === 'RECEBIDA') {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Este titulo ja foi recebido.');
      }

      const pedido = corpo as unknown as QuitacaoRecebimentoNova;
      const previa = simular(conta, pedido.dataRecebimento);
      const valorRecebido = pedido.valorRecebido ?? previa.valorDevido;
      const saldoDevedor = Math.max(0, previa.valorDevido - valorRecebido);

      contasReceber[posicao] = {
        ...conta,
        totalPago: conta.totalPago + valorRecebido,
        saldoDevedor,
        situacao: saldoDevedor === 0 ? 'RECEBIDA' : 'PARCIAL',
        pagamentos: [
          ...conta.pagamentos,
          {
            id: proximoPagamento++,
            dataPagamento: pedido.dataRecebimento,
            formaPagamento: pedido.formaPagamento,
            valorPago: valorRecebido,
            descontoAplicado: previa.descontoAplicado,
            acrescimoAplicado: previa.acrescimoAplicado,
          },
        ],
      };
      return respostaOk(paraFormatoReceber(contasReceber[posicao]));
    }

    const contaReceberComId = /^\/contas-receber\/(\d+)$/.exec(caminho);
    if (contaReceberComId) {
      const id = Number(contaReceberComId[1]);
      const posicao = contasReceber.findIndex(c => c.id === id);
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Titulo nao encontrado.');

      if (metodo === 'PUT' && corpo) {
        if (contasReceber[posicao].pagamentos.length) {
          return respostaDeErro(
            422,
            'REGRA_NEGOCIO',
            'Titulo com recebimento registrado nao pode ser alterado.',
          );
        }
        const alterada = corpo as unknown as ContaPagarNova;
        const cliente = pessoas.find(p => p.id === alterada.pessoaId);
        contasReceber[posicao] = montarConta(alterada, id, cliente?.nome ?? 'Cliente');
        return respostaOk(paraFormatoReceber(contasReceber[posicao]));
      }
      return respostaOk(paraFormatoReceber(contasReceber[posicao]));
    }

    // ----- /plano-contas --------------------------------------------------
    if (caminho === '/plano-contas' && metodo === 'GET') {
      return respostaOk(montarArvore());
    }

    if (caminho === '/plano-contas/analiticas' && metodo === 'GET') {
      const analiticas = planoContas
        .filter(c => !c.consolidada)
        .map(({ id, codigo, descricao, consolidada }) => ({ id, codigo, descricao, consolidada }));
      return respostaOk(analiticas);
    }

    if (caminho === '/plano-contas' && metodo === 'POST' && corpo) {
      const nova = corpo as unknown as PlanoContaNovo;
      if (planoContas.some(c => c.codigo === nova.codigo)) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Ja existe uma conta com este codigo.');
      }
      const criada = {
        id: proximoPlano++,
        codigo: nova.codigo,
        descricao: nova.descricao,
        consolidada: nova.consolidada,
        codigoSuperior: nova.codigoSuperior ?? null,
      };
      planoContas.push(criada);
      return respostaOk({ ...criada, subcontas: [] }, 201);
    }

    const planoComId = /^\/plano-contas\/(\d+)$/.exec(caminho);
    if (planoComId) {
      const id = Number(planoComId[1]);
      const posicao = planoContas.findIndex(c => c.id === id);
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Conta nao encontrada.');

      if (metodo === 'PUT' && corpo) {
        const alterada = corpo as unknown as PlanoContaNovo;
        planoContas[posicao] = {
          id,
          codigo: alterada.codigo,
          descricao: alterada.descricao,
          consolidada: alterada.consolidada,
          codigoSuperior: alterada.codigoSuperior ?? null,
        };
        return respostaOk({ ...planoContas[posicao], subcontas: [] });
      }
      if (metodo === 'DELETE') {
        if (planoContas.some(c => c.codigoSuperior === planoContas[posicao].codigo)) {
          return respostaDeErro(409, 'CONFLITO', 'A conta possui subcontas.');
        }
        planoContas.splice(posicao, 1);
        return new Response(null, { status: 204 });
      }
      return respostaOk({ ...planoContas[posicao], subcontas: [] });
    }

    // ----- /despesas ------------------------------------------------------
    if (caminho === '/despesas' && metodo === 'GET') {
      const previstas = endereco.searchParams.get('previstas') === 'true';
      return respostaOk(previstas ? despesas.filter(d => !d.realizada) : despesas);
    }

    if (caminho === '/despesas' && metodo === 'POST' && corpo) {
      const nova = corpo as unknown as DespesaNova;
      const categoria = planoContas.find(c => c.id === nova.planoContaId);
      // Regra RN01: categoria consolidada nao aceita lancamento.
      if (!categoria || categoria.consolidada) {
        return respostaDeErro(
          422,
          'REGRA_NEGOCIO',
          `A categoria '${categoria?.descricao ?? ''}' e consolidada e nao aceita lancamento.`,
        );
      }
      const criada: DespesaApi = {
        id: proximaDespesa++,
        planoContaId: nova.planoContaId,
        categoria: `${categoria.codigo} - ${categoria.descricao}`,
        descricao: nova.descricao,
        valorPrevisto: nova.valorPrevisto,
        dataLancamento: new Date().toLocaleDateString('sv-SE'),
        previsaoPagamento: nova.previsaoPagamento,
        realizada: false,
        contaPagarId: null,
        numeroTitulo: null,
      };
      despesas.push(criada);
      return respostaOk(criada, 201);
    }

    const gerar = /^\/despesas\/(\d+)\/gerar-titulo$/.exec(caminho);
    if (gerar && metodo === 'POST' && corpo) {
      const posicao = despesas.findIndex(d => d.id === Number(gerar[1]));
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Despesa nao encontrada.');
      if (despesas[posicao].realizada) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Esta despesa ja virou titulo.');
      }

      const pedido = corpo as unknown as GerarTituloNovo;
      const fornecedor = pessoas.find(p => p.id === pedido.pessoaId);
      if (!fornecedor?.papeis.includes('FORNECEDOR')) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'A pessoa informada nao e um fornecedor.');
      }

      const titulo = montarConta(
        {
          numeroTitulo: pedido.numeroTitulo,
          pessoaId: pedido.pessoaId,
          tipoTitulo: pedido.tipoTitulo ?? 'OUTROS',
          valor: pedido.valor,
          emissao: pedido.emissao,
          vencimento: pedido.vencimento,
        },
        proximaConta++,
        fornecedor.nome,
      );
      contas.push(titulo);
      despesas[posicao] = {
        ...despesas[posicao],
        realizada: true,
        contaPagarId: titulo.id,
        numeroTitulo: titulo.numeroTitulo,
      };
      return respostaOk(titulo, 201);
    }

    const despesaComId = /^\/despesas\/(\d+)$/.exec(caminho);
    if (despesaComId) {
      const id = Number(despesaComId[1]);
      const posicao = despesas.findIndex(d => d.id === id);
      if (posicao === -1) return respostaDeErro(404, 'NAO_ENCONTRADO', 'Despesa nao encontrada.');

      if (metodo === 'PUT' && corpo) {
        if (despesas[posicao].realizada) {
          return respostaDeErro(422, 'REGRA_NEGOCIO', 'Despesa ja convertida nao pode mudar.');
        }
        const alterada = corpo as unknown as DespesaNova;
        const categoria = planoContas.find(c => c.id === alterada.planoContaId);
        despesas[posicao] = {
          ...despesas[posicao],
          planoContaId: alterada.planoContaId,
          categoria: categoria ? `${categoria.codigo} - ${categoria.descricao}` : '',
          descricao: alterada.descricao,
          valorPrevisto: alterada.valorPrevisto,
          previsaoPagamento: alterada.previsaoPagamento,
        };
        return respostaOk(despesas[posicao]);
      }
      if (metodo === 'DELETE') {
        despesas.splice(posicao, 1);
        return new Response(null, { status: 204 });
      }
      return respostaOk(despesas[posicao]);
    }

    // ----- /relatorios ----------------------------------------------------
    // Somas simples sobre o que esta guardado, so para as telas terem numeros
    // coerentes nos testes. A conta de verdade e do back-end.
    if (caminho.startsWith('/relatorios')) {
      const somar = (valores: number[]) => valores.reduce((total, v) => total + v, 0);
      const posicaoDe = (lista: ContaPagarApi[]) => ({
        quantidadeTitulos: lista.length,
        valorTotal: somar(lista.map(c => c.valor)),
        valorQuitado: somar(lista.map(c => c.totalPago)),
        saldoEmAberto: somar(lista.map(c => c.saldoDevedor)),
        quantidadeVencidos: 0,
        valorVencido: 0,
      });

      if (caminho === '/relatorios/resumo') {
        const aPagar = posicaoDe(contas);
        const aReceber = posicaoDe(contasReceber);
        return respostaOk({
          de: endereco.searchParams.get('de') ?? '',
          ate: endereco.searchParams.get('ate') ?? '',
          contasAPagar: aPagar,
          contasAReceber: aReceber,
          saldoProjetado: aReceber.valorTotal - aPagar.valorTotal,
          saldoRealizado: aReceber.valorQuitado - aPagar.valorQuitado,
        });
      }

      if (caminho === '/relatorios/por-categoria') {
        return respostaOk(
          planoContas
            .filter(c => !c.consolidada)
            .map(c => ({
              codigo: c.codigo,
              descricao: c.descricao,
              totalAPagar: 0,
              totalAReceber: 0,
            })),
        );
      }

      if (caminho === '/relatorios/inadimplencia') {
        return respostaOk({
          posicaoEm: new Date().toLocaleDateString('sv-SE'),
          totalAPagarVencido: 0,
          totalAReceberVencido: 0,
          titulos: [],
        });
      }
    }

    return respostaDeErro(404, 'NAO_ENCONTRADO', `Rota ${metodo} ${caminho} nao existe.`);
  });

  instalada = {
    pessoas: () => [...pessoas],
    contas: () => [...contas],
    contasReceber: () => [...contasReceber],
    planoContas: () => [...planoContas],
    despesas: () => [...despesas],
    chamadas: () => [...chamadas],
    ultimoCorpo: () => [...chamadas].reverse().find(c => c.corpo)?.corpo ?? null,
  };
  return instalada;
}
