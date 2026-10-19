/**
 * Operacoes de /api/cartorios e /api/remessas-cartorio.
 *
 * Os dois moram juntos porque so existem um pelo outro: cartorio e o
 * destino da remessa, e remessa e a unica coisa que se faz com cartorio.
 */

import { requisitar } from './http';
import type { CartorioApi, CartorioNovo, RemessaApi, RemessaNova } from './tipos';

export function listarCartorios(): Promise<CartorioApi[]> {
  return requisitar<CartorioApi[]>('/cartorios');
}

export function criarCartorio(cartorio: CartorioNovo): Promise<CartorioApi> {
  return requisitar<CartorioApi>('/cartorios', { metodo: 'POST', corpo: cartorio });
}

export function atualizarCartorio(id: number, cartorio: CartorioNovo): Promise<CartorioApi> {
  return requisitar<CartorioApi>(`/cartorios/${id}`, { metodo: 'PUT', corpo: cartorio });
}

/** Exclui o cartorio. Falha se ele ja tiver remessas. */
export function excluirCartorio(id: number): Promise<void> {
  return requisitar<void>(`/cartorios/${id}`, { metodo: 'DELETE' });
}

/**
 * Lista as remessas.
 * @param apenasEmAberto true traz so as que ainda nao foram baixadas
 */
export function listarRemessas(apenasEmAberto = false): Promise<RemessaApi[]> {
  const consulta = apenasEmAberto ? '?emAberto=true' : '';
  return requisitar<RemessaApi[]>(`/remessas-cartorio${consulta}`);
}

/**
 * Envia um titulo a protesto.
 * Responde 422 se o titulo nao estiver vencido e em aberto (regra RN09),
 * ou se ja estiver em outra remessa.
 */
export function criarRemessa(remessa: RemessaNova): Promise<RemessaApi> {
  return requisitar<RemessaApi>('/remessas-cartorio', { metodo: 'POST', corpo: remessa });
}

/** Registra o protesto do titulo no cartorio. */
export function protestarRemessa(id: number, dataProtesto: string): Promise<RemessaApi> {
  return requisitar<RemessaApi>(`/remessas-cartorio/${id}/protesto`, {
    metodo: 'POST',
    corpo: { dataProtesto },
  });
}

/** Baixa o protesto, encerrando a remessa. */
export function baixarRemessa(
  id: number,
  dataBaixa: string,
  observacao?: string,
): Promise<RemessaApi> {
  return requisitar<RemessaApi>(`/remessas-cartorio/${id}/baixa`, {
    metodo: 'POST',
    corpo: { dataBaixa, observacao },
  });
}
