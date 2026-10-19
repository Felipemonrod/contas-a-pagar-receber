/**
 * Operacoes de /api/lancamentos.
 *
 * Partida dobrada: todo lancamento sai de uma conta (credito) e entra em
 * outra (debito). As duas precisam ser diferentes e ambas analiticas.
 */

import { requisitar } from './http';
import type { LancamentoApi, LancamentoNovo, StatusLancamento } from './tipos';

/** Filtros aceitos na listagem. `de` e `ate` recortam por data. */
export type FiltroLancamento = {
  de?: string;
  ate?: string;
  status?: StatusLancamento;
};

export function listarLancamentos(filtro: FiltroLancamento = {}): Promise<LancamentoApi[]> {
  const parametros = new URLSearchParams();
  if (filtro.de) parametros.set('de', filtro.de);
  if (filtro.ate) parametros.set('ate', filtro.ate);
  if (filtro.status) parametros.set('status', filtro.status);

  const consulta = parametros.toString();
  return requisitar<LancamentoApi[]>(`/lancamentos${consulta ? `?${consulta}` : ''}`);
}

export function criarLancamento(lancamento: LancamentoNovo): Promise<LancamentoApi> {
  return requisitar<LancamentoApi>('/lancamentos', { metodo: 'POST', corpo: lancamento });
}

/**
 * ESTORNA o lancamento; nao apaga.
 * Devolve 200 com o recurso em `status: ESTORNADO`, e nao 204.
 */
export function estornarLancamento(id: number): Promise<LancamentoApi> {
  return requisitar<LancamentoApi>(`/lancamentos/${id}`, { metodo: 'DELETE' });
}
