/**
 * Testes do adapter de titulos.
 *
 * Funcoes puras: recebem um objeto e devolvem outro, sem rede.
 */

import { describe, expect, it } from 'vitest';
import {
  dePagar,
  deReceber,
  LADO_A_PAGAR,
  LADO_A_RECEBER,
  registroParaTitulo,
  rotuloParaTipo,
  tipoParaRotulo,
  tituloParaRegistro,
} from './titulos';
import type { ContaPagarApi, ContaReceberApi } from '../api/tipos';

/** Conta a pagar de exemplo, com rateio, como a do contrato. */
const contaAPagar: ContaPagarApi = {
  id: 1,
  numeroTitulo: 'DUP-123456',
  pessoaId: 1,
  pessoaNome: 'Greensoft Informatica Ltda',
  tipoTitulo: 'DUPLICATA',
  situacao: 'ABERTA',
  valor: 1000,
  totalPago: 0,
  saldoDevedor: 1000,
  emissao: '2026-09-01',
  vencimento: '2026-10-10',
  desconto: 50,
  validadeDesconto: '2026-10-05',
  acrescimoDia: 2,
  observacao: null,
  rateios: [
    { planoContaId: 10, categoria: '21.03 - Energia Eletrica', valor: 600 },
    { planoContaId: 13, categoria: '21.06 - Condominio', valor: 400 },
  ],
  pagamentos: [],
};

describe('tipo do titulo', () => {
  it('traduz o codigo da API no rotulo da tela e de volta', () => {
    expect(tipoParaRotulo('NOTA_PROMISSORIA')).toBe('Nota Promissória');
    expect(rotuloParaTipo('Nota Promissória')).toBe('NOTA_PROMISSORIA');
  });

  it('usa OUTROS para um rotulo que a API nao conhece', () => {
    // A tela do livro oferecia "Boleto", que a API recusa.
    expect(rotuloParaTipo('Boleto')).toBe('OUTROS');
  });
});

describe('os dois lados viram a mesma forma', () => {
  it('converte uma conta a pagar', () => {
    const titulo = dePagar({
      ...contaAPagar,
      totalPago: 400,
      pagamentos: [
        {
          id: 1,
          dataPagamento: '2026-10-03',
          formaPagamento: 'PIX',
          valorPago: 400,
          descontoAplicado: 50,
          acrescimoAplicado: 0,
        },
      ],
    });

    expect(titulo.totalQuitado).toBe(400);
    expect(titulo.quitacoes).toEqual([{ data: '2026-10-03', forma: 'PIX', valor: 400 }]);
  });

  it('converte uma conta a receber, que usa outros nomes', () => {
    const contaAReceber: ContaReceberApi = {
      ...contaAPagar,
      totalRecebido: 760,
      recebimentos: [
        {
          id: 1,
          dataRecebimento: '2026-10-04',
          formaPagamento: 'BOLETO',
          valorRecebido: 760,
          descontoAplicado: 40,
          acrescimoAplicado: 0,
        },
      ],
    };

    const titulo = deReceber(contaAReceber);

    expect(titulo.totalQuitado).toBe(760);
    expect(titulo.quitacoes).toEqual([{ data: '2026-10-04', forma: 'BOLETO', valor: 760 }]);
  });
});

describe('tituloParaRegistro', () => {
  it('usa o campo de pessoa do lado em uso', () => {
    expect(tituloParaRegistro(dePagar(contaAPagar), LADO_A_PAGAR)['Nome do Fornecedor']).toBe(
      'Greensoft Informatica Ltda',
    );
    expect(tituloParaRegistro(dePagar(contaAPagar), LADO_A_RECEBER)['Nome do Cliente']).toBe(
      'Greensoft Informatica Ltda',
    );
  });

  it('deixa a data de pagamento vazia enquanto o titulo esta em aberto', () => {
    expect(tituloParaRegistro(dePagar(contaAPagar), LADO_A_PAGAR)['Data de Pagamento']).toBe('');
  });

  it('mostra a data da ultima quitacao registrada', () => {
    const comDuas = dePagar({
      ...contaAPagar,
      pagamentos: [
        {
          id: 1,
          dataPagamento: '2026-10-03',
          formaPagamento: 'PIX',
          valorPago: 100,
          descontoAplicado: 0,
          acrescimoAplicado: 0,
        },
        {
          id: 2,
          dataPagamento: '2026-10-09',
          formaPagamento: 'PIX',
          valorPago: 200,
          descontoAplicado: 0,
          acrescimoAplicado: 0,
        },
      ],
    });

    expect(tituloParaRegistro(comDuas, LADO_A_PAGAR)['Data de Pagamento']).toBe('2026-10-09');
  });

  it('troca zero por vazio nos campos de dinheiro opcionais', () => {
    const semDesconto = dePagar({ ...contaAPagar, desconto: 0, acrescimoDia: null });
    const linha = tituloParaRegistro(semDesconto, LADO_A_PAGAR);

    expect(linha['Valor do Desconto']).toBe('');
    expect(linha['Acréscimo por Dia']).toBe('');
  });
});

describe('registroParaTitulo preserva o rateio', () => {
  /** Formulário preenchido como a tela exibiria o título do contrato. */
  const comoNaTela = {
    'Número do Título': 'DUP-123456',
    'Nome do Fornecedor': 'Greensoft Informatica Ltda',
    Tipo: 'Duplicata',
    'Valor do Título': '1000',
    'Data de Emissão': '2026-09-01',
    'Data de Vencimento': '2026-10-20',
    'Valor do Desconto': '50',
    'Validade do Desconto': '2026-10-05',
    'Acréscimo por Dia': '2',
    Observação: '',
  };

  it('devolve o rateio atual, que o formulário do livro não mostra', () => {
    const corpo = registroParaTitulo(comoNaTela, 1, dePagar(contaAPagar));

    // Sem isto, o PUT limparia os rateios do título em silêncio.
    expect(corpo.rateios).toEqual([
      { planoContaId: 10, valor: 600 },
      { planoContaId: 13, valor: 400 },
    ]);
  });

  it('não inventa rateio ao lançar um título novo', () => {
    expect(registroParaTitulo(comoNaTela, 1).rateios).toBeUndefined();
  });

  it('não envia lista vazia quando o título não tem rateio', () => {
    const semRateio = dePagar({ ...contaAPagar, rateios: [] });

    expect(registroParaTitulo(comoNaTela, 1, semRateio).rateios).toBeUndefined();
  });

  it('traduz os demais campos para os nomes do contrato', () => {
    const corpo = registroParaTitulo(comoNaTela, 7);

    expect(corpo).toMatchObject({
      numeroTitulo: 'DUP-123456',
      pessoaId: 7,
      tipoTitulo: 'DUPLICATA',
      valor: 1000,
      emissao: '2026-09-01',
      vencimento: '2026-10-20',
      desconto: 50,
      acrescimoDia: 2,
    });
    // Campo em branco não é enviado, em vez de virar texto vazio.
    expect(corpo.observacao).toBeUndefined();
  });

  it('o corpo é o mesmo nos dois lados do caixa', () => {
    const aPagar = registroParaTitulo(comoNaTela, 1, dePagar(contaAPagar));
    const aReceber = registroParaTitulo(
      { ...comoNaTela, 'Nome do Cliente': 'Greensoft Informatica Ltda' },
      1,
      dePagar(contaAPagar),
    );

    expect(aReceber).toEqual(aPagar);
  });
});
