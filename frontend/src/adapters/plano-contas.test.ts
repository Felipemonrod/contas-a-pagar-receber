/**
 * Testes do adapter do Plano de Contas.
 *
 * O ponto central e a montagem do codigo da conta: o formulario do livro
 * pede a conta superior e o COMPLEMENTO, e a API guarda o codigo pronto.
 */

import { describe, expect, it } from 'vitest';
import {
  achatarArvore,
  montarCodigo,
  planoContaParaRegistro,
  registroParaPlanoConta,
  separarCodigo,
} from './plano-contas';
import type { PlanoContaApi } from '../api/tipos';

/** Pedaco da arvore que a API devolve, com tres niveis. */
const arvore: PlanoContaApi[] = [
  {
    id: 2,
    codigo: '2',
    descricao: 'PASSIVO',
    consolidada: true,
    codigoSuperior: null,
    subcontas: [
      {
        id: 4,
        codigo: '21',
        descricao: 'PASSIVO CIRCULANTE',
        consolidada: true,
        codigoSuperior: '2',
        subcontas: [
          {
            id: 10,
            codigo: '21.03',
            descricao: 'Energia Eletrica',
            consolidada: false,
            codigoSuperior: '21',
            subcontas: [],
          },
        ],
      },
    ],
  },
];

describe('montarCodigo e separarCodigo', () => {
  it('junta a conta superior com o complemento', () => {
    expect(montarCodigo('21', '07')).toBe('21.07');
  });

  it('sem conta superior, o complemento ja e o codigo', () => {
    expect(montarCodigo('', '1')).toBe('1');
  });

  it('sem complemento, devolve a propria conta superior', () => {
    expect(montarCodigo('21', '')).toBe('21');
  });

  it('ignora espacos em volta', () => {
    expect(montarCodigo(' 21 ', ' 07 ')).toBe('21.07');
  });

  it('separa no ultimo ponto', () => {
    expect(separarCodigo('21.07')).toEqual({ superior: '21', complemento: '07' });
  });

  it('trata codigo de primeiro nivel, sem ponto', () => {
    expect(separarCodigo('1')).toEqual({ superior: '', complemento: '1' });
  });

  it('ida e volta preserva o codigo', () => {
    const { superior, complemento } = separarCodigo('11.01');

    expect(montarCodigo(superior, complemento)).toBe('11.01');
  });
});

describe('planoContaParaRegistro', () => {
  it('traduz a conta da API para os campos do formulario', () => {
    const linha = planoContaParaRegistro(arvore[0].subcontas[0].subcontas[0]);

    expect(linha['Nova Conta']).toBe('21.03');
    expect(linha['Conta Superior']).toBe('21');
    expect(linha['Complemento da Conta']).toBe('03');
    expect(linha['Descrição da Conta']).toBe('Energia Eletrica');
  });

  it('usa Sim e Nao na caixa de marcar, e nao booleano', () => {
    expect(planoContaParaRegistro(arvore[0]).Consolidado).toBe('Sim');
    expect(planoContaParaRegistro(arvore[0].subcontas[0].subcontas[0]).Consolidado).toBe('Não');
  });

  it('conta de primeiro nivel fica sem conta superior', () => {
    expect(planoContaParaRegistro(arvore[0])['Conta Superior']).toBe('');
  });
});

describe('registroParaPlanoConta', () => {
  it('traduz o formulario para o corpo da API', () => {
    const corpo = registroParaPlanoConta({
      'Nova Conta': '21.08',
      'Conta Superior': '21',
      'Descrição da Conta': 'Manutencao Predial',
      Consolidado: 'Não',
    });

    expect(corpo).toEqual({
      codigo: '21.08',
      descricao: 'Manutencao Predial',
      codigoSuperior: '21',
      consolidada: false,
    });
  });

  it('monta o codigo pelo complemento quando Nova Conta esta vazia', () => {
    const corpo = registroParaPlanoConta({
      'Nova Conta': '',
      'Conta Superior': '21',
      'Complemento da Conta': '09',
      'Descrição da Conta': 'Seguranca',
    });

    expect(corpo.codigo).toBe('21.09');
  });

  it('converte a caixa de marcar em booleano', () => {
    const marcado = registroParaPlanoConta({ 'Nova Conta': '3', Consolidado: 'Sim' });

    expect(marcado.consolidada).toBe(true);
  });

  it('conta de primeiro nivel vai sem codigoSuperior', () => {
    const corpo = registroParaPlanoConta({ 'Nova Conta': '3', 'Descrição da Conta': 'RESULTADO' });

    expect(corpo.codigoSuperior).toBeUndefined();
  });
});

describe('achatarArvore', () => {
  it('percorre a arvore inteira guardando a profundidade', () => {
    expect(achatarArvore(arvore).map(({ conta, nivel }) => [conta.codigo, nivel])).toEqual([
      ['2', 0],
      ['21', 1],
      ['21.03', 2],
    ]);
  });

  it('arvore vazia devolve lista vazia', () => {
    expect(achatarArvore([])).toEqual([]);
  });
});
