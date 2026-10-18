/**
 * Operacoes de /api/relatorios.
 *
 * Diferente das outras telas, estes endpoints NAO devolvem listas de
 * registros: devolvem numeros ja somados pelo back-end (totais, saldos,
 * dias de atraso). Por isso a tela de relatorios mostra painéis de valores,
 * e nao uma tabela de linhas.
 *
 * Todos aceitam `de` e `ate`; sem datas, usam o mes corrente.
 */

import { requisitar } from './http';
import type { InadimplenciaApi, ResumoApi, TotalPorCategoriaApi } from './tipos';

/** Monta o trecho `?de=&ate=` quando as datas foram informadas. */
function periodo(de?: string, ate?: string): string {
  const parametros = new URLSearchParams();
  if (de) parametros.set('de', de);
  if (ate) parametros.set('ate', ate);
  const consulta = parametros.toString();
  return consulta ? `?${consulta}` : '';
}

/** Posicao financeira do periodo: a pagar, a receber e os saldos. */
export function obterResumo(de?: string, ate?: string): Promise<ResumoApi> {
  return requisitar<ResumoApi>(`/relatorios/resumo${periodo(de, ate)}`);
}

/** Totais agrupados por categoria do plano de contas. */
export function obterPorCategoria(de?: string, ate?: string): Promise<TotalPorCategoriaApi[]> {
  return requisitar<TotalPorCategoriaApi[]>(`/relatorios/por-categoria${periodo(de, ate)}`);
}

/** Titulos vencidos e ainda em aberto, dos dois lados do caixa. */
export function obterInadimplencia(de?: string, ate?: string): Promise<InadimplenciaApi> {
  return requisitar<InadimplenciaApi>(`/relatorios/inadimplencia${periodo(de, ate)}`);
}
