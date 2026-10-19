/**
 * Testes do adapter de Despesa.
 *
 * A troca principal e o campo "Lancamento": era um numero solto no livro e
 * na API e a categoria do plano de contas (`planoContaId`).
 */

import { describe, expect, it } from 'vitest';
import {
  acharCategoriaPorRotulo,
  despesaParaRegistro,
  registroParaDespesa,
  rotuloDaCategoria,
} from './despesas';
import type { DespesaApi, PlanoContaItemApi } from '../api/tipos';

/** Despesa ainda prevista, como a API devolve. */
const prevista: DespesaApi = {
  id: 1,
  planoContaId: 10,
  categoria: '21.03 - Energia Eletrica',
  descricao: 'Conta de Luz - dezembro',
  valorPrevisto: 150,
  dataLancamento: '2026-10-07',
  previsaoPagamento: '2026-12-12',
  realizada: false,
  contaPagarId: null,
  numeroTitulo: null,
};

/** As mesmas categorias analiticas que /plano-contas/analiticas devolve. */
const categorias: PlanoContaItemApi[] = [
  { id: 10, codigo: '21.03', descricao: 'Energia Eletrica', consolidada: false },
  { id: 11, codigo: '21.04', descricao: 'Agua', consolidada: false },
];

describe('rotulo da categoria', () => {
  it('usa o mesmo formato que a API devolve em `categoria`', () => {
    // Precisa bater, senao a categoria escolhida nao e reencontrada na lista.
    expect(rotuloDaCategoria(categorias[0])).toBe(prevista.categoria);
  });

  it('acha a categoria pelo rotulo escolhido no formulario', () => {
    expect(acharCategoriaPorRotulo('21.04 - Agua', categorias)?.id).toBe(11);
  });

  it('devolve undefined quando o rotulo nao casa com nenhuma', () => {
    expect(acharCategoriaPorRotulo('99.99 - Inexistente', categorias)).toBeUndefined();
  });

  it('ignora espacos em volta do rotulo', () => {
    expect(acharCategoriaPorRotulo('  21.04 - Agua  ', categorias)?.id).toBe(11);
  });
});

describe('despesaParaRegistro', () => {
  it('poe a categoria no campo que o livro chamava de Lancamento', () => {
    expect(despesaParaRegistro(prevista)['Lançamento']).toBe('21.03 - Energia Eletrica');
  });

  it('mostra PREVISTA enquanto a despesa nao virou titulo', () => {
    const linha = despesaParaRegistro(prevista);

    expect(linha['Situação']).toBe('PREVISTA');
    expect(linha['Número do Título']).toBe('');
  });

  it('mostra REALIZADA e o titulo depois da conversao', () => {
    const convertida: DespesaApi = {
      ...prevista,
      realizada: true,
      contaPagarId: 4,
      numeroTitulo: 'ENEL-778899',
    };
    const linha = despesaParaRegistro(convertida);

    expect(linha['Situação']).toBe('REALIZADA');
    expect(linha['Número do Título']).toBe('ENEL-778899');
  });
});

describe('registroParaDespesa', () => {
  it('traduz o formulario para o corpo da API', () => {
    const corpo = registroParaDespesa(
      {
        Descrição: 'Conta de Agua - janeiro',
        'Lançamento': '21.04 - Agua',
        'Valor Previsto': '95',
        'Previsão de Pagamento': '2027-01-15',
      },
      11,
    );

    expect(corpo).toEqual({
      planoContaId: 11,
      descricao: 'Conta de Agua - janeiro',
      valorPrevisto: 95,
      previsaoPagamento: '2027-01-15',
    });
  });

  it('aceita valor com centavos', () => {
    const corpo = registroParaDespesa({ Descrição: 'X', 'Valor Previsto': '112.37' }, 11);

    expect(corpo.valorPrevisto).toBe(112.37);
  });

  it('valor vazio vira zero, e a API recusa com mensagem', () => {
    const corpo = registroParaDespesa({ Descrição: 'X', 'Valor Previsto': '' }, 11);

    expect(corpo.valorPrevisto).toBe(0);
  });

  it('remove espacos em volta dos valores digitados', () => {
    const corpo = registroParaDespesa({ Descrição: '  Conta de Luz  ' }, 10);

    expect(corpo.descricao).toBe('Conta de Luz');
  });
});
