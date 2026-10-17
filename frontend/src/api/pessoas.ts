/**
 * Operacoes de /api/pessoas.
 *
 * A API tem UMA entidade Pessoa; "cliente" e "fornecedor" sao papeis dela.
 * Nao existem endpoints separados de cliente e de fornecedor: as duas telas
 * usam estas mesmas funcoes, mudando apenas o papel.
 */

import { requisitar } from './http';
import type { Papel, PessoaApi, PessoaNova } from './tipos';

/**
 * Lista pessoas de um papel, opcionalmente filtrando pelo nome.
 *
 * O filtro por nome e feito pela propria API (parametro `nome`), e nao no
 * navegador, para que a busca funcione sobre todos os registros do banco.
 */
export function listarPessoas(papel: Papel, nome?: string): Promise<PessoaApi[]> {
  const parametros = new URLSearchParams({ papel });
  if (nome && nome.trim()) parametros.set('nome', nome.trim());
  return requisitar<PessoaApi[]>(`/pessoas?${parametros.toString()}`);
}

/** Busca uma pessoa pelo id. Responde 404 quando nao existe. */
export function obterPessoa(id: number): Promise<PessoaApi> {
  return requisitar<PessoaApi>(`/pessoas/${id}`);
}

/** Cadastra uma pessoa. Responde 201 com o recurso criado. */
export function criarPessoa(pessoa: PessoaNova): Promise<PessoaApi> {
  return requisitar<PessoaApi>('/pessoas', { metodo: 'POST', corpo: pessoa });
}

/**
 * Substitui os dados de uma pessoa.
 * O PUT troca as listas de telefones e enderecos por inteiro.
 */
export function atualizarPessoa(id: number, pessoa: PessoaNova): Promise<PessoaApi> {
  return requisitar<PessoaApi>(`/pessoas/${id}`, { metodo: 'PUT', corpo: pessoa });
}

/**
 * Inativa uma pessoa (regra RN13: pessoa nunca e excluida do banco).
 * Responde 200 com o recurso ja inativado, e nao 204.
 */
export function inativarPessoa(id: number): Promise<PessoaApi> {
  return requisitar<PessoaApi>(`/pessoas/${id}`, { metodo: 'DELETE' });
}
