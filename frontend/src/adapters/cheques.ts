/**
 * Adapter de Cheque Pre-Datado (livro, cap. 16).
 *
 * A tela do livro tem campos separados para Banco, Agencia e Conta
 * Corrente. Na API isso e UMA conta corrente, identificada por id, e a
 * resposta ja traz o texto pronto para exibir ("341 / 1234 / 56789-0").
 * Entao a tela passa a ter um campo so de conta, e e aqui que os tres
 * campos antigos viram um.
 */

import type { ChequeApi, ChequeNovo, ContaCorrenteApi, SituacaoCheque } from '../api/tipos';
import type { RecordData } from '../data';

/** Como cada situacao do ciclo aparece na tela. */
export const SITUACOES_DO_CHEQUE: Record<SituacaoCheque, string> = {
  EM_CARTEIRA: 'Em carteira',
  DEPOSITADO: 'Depositado',
  COMPENSADO: 'Compensado',
  DEVOLVIDO: 'Devolvido',
};

/**
 * Para onde o cheque pode ir a partir de onde esta.
 *
 * O ciclo e EM_CARTEIRA -> DEPOSITADO -> COMPENSADO ou DEVOLVIDO, e cheque
 * compensado nao muda mais. A tela oferece so os destinos validos, em vez
 * de deixar o usuario tentar e receber 422.
 */
export const PROXIMAS_SITUACOES: Record<SituacaoCheque, SituacaoCheque[]> = {
  EM_CARTEIRA: ['DEPOSITADO'],
  DEPOSITADO: ['COMPENSADO', 'DEVOLVIDO'],
  COMPENSADO: [],
  DEVOLVIDO: [],
};

/** Converte um cheque da API na linha que a tela exibe. */
export function chequeParaRegistro(cheque: ChequeApi): RecordData {
  return {
    id: String(cheque.id),
    Cliente: cheque.emitente,
    'Número do Cheque': cheque.numeroCheque,
    Emissão: cheque.emissao,
    'Data para Depósito': cheque.deposito,
    // Os tres campos do livro viram um: a API ja manda formatado.
    'Conta Corrente': cheque.contaCorrente,
    Valor: String(cheque.valor),
    Situação: SITUACOES_DO_CHEQUE[cheque.situacao],
    // Titulo que o cheque garante, quando ha.
    'Número do Título': cheque.numeroTitulo ?? '',
    Descrição: cheque.descricao ?? '',
  };
}

/**
 * Converte o formulario no corpo que a API espera.
 *
 * @param pessoaId cliente emitente, ja resolvido pela tela
 * @param contaCorrenteId conta do cheque, ja resolvida pela tela
 */
export function registroParaCheque(
  valores: Record<string, string>,
  pessoaId: number,
  contaCorrenteId: number,
): ChequeNovo {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  return {
    numeroCheque: campo('Número do Cheque'),
    pessoaId,
    contaCorrenteId,
    emissao: campo('Emissão'),
    deposito: campo('Data para Depósito'),
    valor: Number(campo('Valor')) || 0,
    descricao: campo('Descrição') || undefined,
  };
}

/** Acha a conta corrente pelo texto escolhido no formulario. */
export function acharContaCorrentePorIdentificacao(
  identificacao: string,
  contas: ContaCorrenteApi[],
): ContaCorrenteApi | undefined {
  const procurada = identificacao.trim();
  return contas.find(conta => conta.identificacao === procurada);
}
