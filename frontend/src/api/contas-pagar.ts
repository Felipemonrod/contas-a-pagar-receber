/**
 * Operacoes de /api/contas-pagar.
 *
 * Lancar um titulo e quita-lo sao coisas separadas na API: o POST cria o
 * titulo em aberto, e a quitacao e um POST proprio em /{id}/pagamento. Isso
 * e diferente do formulario do livro, que trazia a data de pagamento junto
 * do lancamento; a tela foi ajustada para seguir a API.
 */

import { requisitar } from './http';
import type {
  ContaPagarApi,
  ContaPagarNova,
  QuitacaoNova,
  SimulacaoApi,
  Situacao,
} from './tipos';

/** Filtros aceitos na listagem. `de` e `ate` recortam por vencimento. */
export type FiltroContaPagar = {
  situacao?: Situacao;
  de?: string;
  ate?: string;
};

/** Lista os titulos a pagar, opcionalmente filtrados. */
export function listarContasPagar(filtro: FiltroContaPagar = {}): Promise<ContaPagarApi[]> {
  const parametros = new URLSearchParams();
  if (filtro.situacao) parametros.set('situacao', filtro.situacao);
  if (filtro.de) parametros.set('de', filtro.de);
  if (filtro.ate) parametros.set('ate', filtro.ate);

  const consulta = parametros.toString();
  return requisitar<ContaPagarApi[]>(`/contas-pagar${consulta ? `?${consulta}` : ''}`);
}

/** Lanca um titulo novo. Responde 201 com o recurso criado. */
export function criarContaPagar(conta: ContaPagarNova): Promise<ContaPagarApi> {
  return requisitar<ContaPagarApi>('/contas-pagar', { metodo: 'POST', corpo: conta });
}

/**
 * Altera um titulo.
 * Responde 422 se o titulo ja tiver pagamento registrado (regra RN11).
 */
export function atualizarContaPagar(id: number, conta: ContaPagarNova): Promise<ContaPagarApi> {
  return requisitar<ContaPagarApi>(`/contas-pagar/${id}`, { metodo: 'PUT', corpo: conta });
}

/**
 * Registra a quitacao, total ou parcial.
 * Responde 422 se o titulo ja estiver quitado (regra RN07).
 */
export function quitarContaPagar(id: number, quitacao: QuitacaoNova): Promise<ContaPagarApi> {
  return requisitar<ContaPagarApi>(`/contas-pagar/${id}/pagamento`, {
    metodo: 'POST',
    corpo: quitacao,
  });
}

/**
 * Previa do valor devido numa data, com desconto ou juros ja aplicados.
 * Nao grava nada: serve para o usuario conferir antes de confirmar.
 */
export function simularQuitacao(id: number, data: string): Promise<SimulacaoApi> {
  return requisitar<SimulacaoApi>(`/contas-pagar/${id}/simulacao?data=${data}`);
}
