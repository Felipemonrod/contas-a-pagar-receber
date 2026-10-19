/**
 * Operacoes de /api/bancos, /api/agencias e /api/contas-correntes.
 *
 * Sao tres recursos de uma cadeia so: banco > agencia > conta corrente.
 * GET /api/bancos ja devolve tudo aninhado, entao a tela desenha a arvore
 * com uma requisicao.
 */

import { requisitar } from './http';
import type {
  AgenciaApi,
  AgenciaNova,
  BancoApi,
  BancoNovo,
  ContaCorrenteApi,
  ContaCorrenteNova,
} from './tipos';

/** Bancos com as agencias e contas aninhadas. Filtro opcional por nome. */
export function listarBancos(nome?: string): Promise<BancoApi[]> {
  const consulta = nome && nome.trim() ? `?nome=${encodeURIComponent(nome.trim())}` : '';
  return requisitar<BancoApi[]>(`/bancos${consulta}`);
}

export function criarBanco(banco: BancoNovo): Promise<BancoApi> {
  return requisitar<BancoApi>('/bancos', { metodo: 'POST', corpo: banco });
}

export function criarAgencia(agencia: AgenciaNova): Promise<AgenciaApi> {
  return requisitar<AgenciaApi>('/agencias', { metodo: 'POST', corpo: agencia });
}

export function criarContaCorrente(conta: ContaCorrenteNova): Promise<ContaCorrenteApi> {
  return requisitar<ContaCorrenteApi>('/contas-correntes', { metodo: 'POST', corpo: conta });
}

/** Contas correntes ativas, para campos de escolha (cheques, por exemplo). */
export function listarContasCorrentesAtivas(): Promise<ContaCorrenteApi[]> {
  return requisitar<ContaCorrenteApi[]>('/contas-correntes/ativas');
}

/**
 * DESATIVA a conta corrente; nao exclui.
 * Cheques ja cadastrados dependem dela continuar existindo.
 */
export function desativarContaCorrente(id: number): Promise<ContaCorrenteApi> {
  return requisitar<ContaCorrenteApi>(`/contas-correntes/${id}`, { metodo: 'DELETE' });
}
