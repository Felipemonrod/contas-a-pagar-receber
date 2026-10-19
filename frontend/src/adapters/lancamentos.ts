/**
 * Adapter de Lancamento Contabil (livro, cap. 12).
 *
 * As duas contas sao escolhidas pelo texto que a API ja devolve pronto
 * ("11.01 - Caixa"), e aqui viram os ids que ela espera. A tela so oferece
 * contas ANALITICAS, porque conta consolidada nao recebe lancamento
 * (regra RN01), e as duas precisam ser diferentes.
 */

import type { LancamentoApi, LancamentoNovo, PlanoContaItemApi } from '../api/tipos';
import type { RecordData } from '../data';

/** Como cada status aparece na tela. */
export const STATUS_DO_LANCAMENTO = {
  ATIVO: 'Ativo',
  ESTORNADO: 'Estornado',
} as const;

/** Rotulo de uma conta no campo de escolha, igual ao que a API devolve. */
export function rotuloDaConta(conta: PlanoContaItemApi): string {
  return `${conta.codigo} - ${conta.descricao}`;
}

/** Acha a conta pelo rotulo escolhido no formulario. */
export function acharContaPorRotulo(
  rotulo: string,
  contas: PlanoContaItemApi[],
): PlanoContaItemApi | undefined {
  const procurado = rotulo.trim();
  return contas.find(conta => rotuloDaConta(conta) === procurado);
}

/** Converte um lancamento da API na linha que a tela exibe. */
export function lancamentoParaRegistro(lancamento: LancamentoApi): RecordData {
  return {
    id: String(lancamento.id),
    Registro: String(lancamento.id),
    Data: lancamento.data,
    'Conta de Crédito': lancamento.contaCredito,
    'Conta de Débito': lancamento.contaDebito,
    Valor: String(lancamento.valor),
    Descrição: lancamento.descricao,
    Situação: STATUS_DO_LANCAMENTO[lancamento.status],
  };
}

/**
 * Converte o formulario no corpo que a API espera.
 *
 * @param contaCreditoId conta de origem, ja resolvida pela tela
 * @param contaDebitoId conta de destino, ja resolvida pela tela
 */
export function registroParaLancamento(
  valores: Record<string, string>,
  contaCreditoId: number,
  contaDebitoId: number,
): LancamentoNovo {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  return {
    contaCreditoId,
    contaDebitoId,
    valor: Number(campo('Valor')) || 0,
    descricao: campo('Descrição'),
    data: campo('Data'),
  };
}
