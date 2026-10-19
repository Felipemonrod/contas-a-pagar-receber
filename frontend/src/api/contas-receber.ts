/**
 * Operacoes de /api/contas-receber.
 *
 * Espelho de contas a pagar, com outros nomes: a quitacao e "recebimento",
 * e a pessoa precisa ter o papel CLIENTE em vez de FORNECEDOR (regra RN04).
 */

import { requisitar } from './http';
import type {
  ContaReceberApi,
  ContaReceberNova,
  QuitacaoRecebimentoNova,
  SimulacaoApi,
  Situacao,
} from './tipos';

/** Filtros aceitos na listagem. `de` e `ate` recortam por vencimento. */
export type FiltroContaReceber = {
  situacao?: Situacao;
  de?: string;
  ate?: string;
};

export function listarContasReceber(
  filtro: FiltroContaReceber = {},
): Promise<ContaReceberApi[]> {
  const parametros = new URLSearchParams();
  if (filtro.situacao) parametros.set('situacao', filtro.situacao);
  if (filtro.de) parametros.set('de', filtro.de);
  if (filtro.ate) parametros.set('ate', filtro.ate);

  const consulta = parametros.toString();
  return requisitar<ContaReceberApi[]>(`/contas-receber${consulta ? `?${consulta}` : ''}`);
}

/** Lanca um titulo a receber. Responde 201 com o recurso criado. */
export function criarContaReceber(conta: ContaReceberNova): Promise<ContaReceberApi> {
  return requisitar<ContaReceberApi>('/contas-receber', { metodo: 'POST', corpo: conta });
}

/** Altera um titulo. Responde 422 se ja houver recebimento (regra RN11). */
export function atualizarContaReceber(
  id: number,
  conta: ContaReceberNova,
): Promise<ContaReceberApi> {
  return requisitar<ContaReceberApi>(`/contas-receber/${id}`, { metodo: 'PUT', corpo: conta });
}

/** Registra o recebimento, total ou parcial. */
export function receberContaReceber(
  id: number,
  quitacao: QuitacaoRecebimentoNova,
): Promise<ContaReceberApi> {
  return requisitar<ContaReceberApi>(`/contas-receber/${id}/recebimento`, {
    metodo: 'POST',
    corpo: quitacao,
  });
}

/** Previa do valor devido numa data. Nao grava nada. */
export function simularRecebimento(id: number, data: string): Promise<SimulacaoApi> {
  return requisitar<SimulacaoApi>(`/contas-receber/${id}/simulacao?data=${data}`);
}

/**
 * Titulos a receber vencidos e ainda em aberto.
 *
 * Sao exatamente os que a regra RN09 deixa mandar a protesto, entao a tela
 * de Remessa usa esta lista para so oferecer titulos elegiveis.
 */
export function listarReceberInadimplentes(): Promise<ContaReceberApi[]> {
  return requisitar<ContaReceberApi[]>('/contas-receber/inadimplentes');
}

/**
 * CANCELA o título; não exclui.
 * Responde 200 com o recurso em situação CANCELADA, e 422 se já houver
 * recebimento registrado (regra RN11).
 */
export function cancelarContaReceber(id: number): Promise<ContaReceberApi> {
  return requisitar<ContaReceberApi>(`/contas-receber/${id}`, { metodo: 'DELETE' });
}
