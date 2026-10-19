/**
 * Operacoes de /api/cheques.
 *
 * O cheque pre-datado tem um ciclo proprio, e nao um simples CRUD:
 * EM_CARTEIRA -> DEPOSITADO -> COMPENSADO ou DEVOLVIDO. Mover no ciclo e um
 * endpoint separado, do mesmo jeito que quitar um titulo e.
 */

import { requisitar } from './http';
import type { ChequeApi, ChequeNovo, MudancaDeSituacao, SituacaoCheque } from './tipos';

/** Filtros aceitos na listagem. `de` e `ate` recortam por data de deposito. */
export type FiltroCheque = {
  situacao?: SituacaoCheque;
  pessoaId?: number;
  de?: string;
  ate?: string;
};

export function listarCheques(filtro: FiltroCheque = {}): Promise<ChequeApi[]> {
  const parametros = new URLSearchParams();
  if (filtro.situacao) parametros.set('situacao', filtro.situacao);
  if (filtro.pessoaId) parametros.set('pessoaId', String(filtro.pessoaId));
  if (filtro.de) parametros.set('de', filtro.de);
  if (filtro.ate) parametros.set('ate', filtro.ate);

  const consulta = parametros.toString();
  return requisitar<ChequeApi[]>(`/cheques${consulta ? `?${consulta}` : ''}`);
}

/** Cheques em carteira cuja data de deposito ja passou. */
export function listarChequesADepositar(): Promise<ChequeApi[]> {
  return requisitar<ChequeApi[]>('/cheques/a-depositar');
}

/** Cadastra um cheque. O emitente precisa ter o papel CLIENTE. */
export function criarCheque(cheque: ChequeNovo): Promise<ChequeApi> {
  return requisitar<ChequeApi>('/cheques', { metodo: 'POST', corpo: cheque });
}

/** Altera um cheque. So vale enquanto ele esta EM_CARTEIRA. */
export function atualizarCheque(id: number, cheque: ChequeNovo): Promise<ChequeApi> {
  return requisitar<ChequeApi>(`/cheques/${id}`, { metodo: 'PUT', corpo: cheque });
}

/**
 * Move o cheque no ciclo.
 * Responde 422 ao tentar mover um cheque ja COMPENSADO.
 */
export function mudarSituacaoDoCheque(
  id: number,
  mudanca: MudancaDeSituacao,
): Promise<ChequeApi> {
  return requisitar<ChequeApi>(`/cheques/${id}/situacao`, { metodo: 'POST', corpo: mudanca });
}

/** Exclui o cheque. So vale enquanto ele esta EM_CARTEIRA. */
export function excluirCheque(id: number): Promise<void> {
  return requisitar<void>(`/cheques/${id}`, { metodo: 'DELETE' });
}
