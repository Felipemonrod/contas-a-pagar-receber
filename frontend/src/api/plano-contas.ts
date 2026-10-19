/**
 * Operacoes de /api/plano-contas.
 *
 * Duas formas de ler a mesma coisa: `listarArvore` traz a hierarquia com as
 * subcontas aninhadas, para desenhar a arvore; `listarAnaliticas` traz uma
 * lista plana apenas com as contas que aceitam lancamento, para preencher
 * campos de escolha.
 */

import { requisitar } from './http';
import type { PlanoContaApi, PlanoContaItemApi, PlanoContaNovo } from './tipos';

/** Arvore completa, com as subcontas aninhadas em cada conta. */
export function listarArvore(): Promise<PlanoContaApi[]> {
  return requisitar<PlanoContaApi[]>('/plano-contas');
}

/**
 * Lista plana somente das contas analiticas, que sao as que aceitam
 * lancamento. Contas consolidadas ficam de fora (regra RN01).
 */
export function listarAnaliticas(): Promise<PlanoContaItemApi[]> {
  return requisitar<PlanoContaItemApi[]>('/plano-contas/analiticas');
}

/** Cadastra uma categoria. Responde 201 com o recurso criado. */
export function criarPlanoConta(conta: PlanoContaNovo): Promise<PlanoContaApi> {
  return requisitar<PlanoContaApi>('/plano-contas', { metodo: 'POST', corpo: conta });
}

/** Altera uma categoria existente. */
export function atualizarPlanoConta(
  id: number,
  conta: PlanoContaNovo,
): Promise<PlanoContaApi> {
  return requisitar<PlanoContaApi>(`/plano-contas/${id}`, { metodo: 'PUT', corpo: conta });
}
