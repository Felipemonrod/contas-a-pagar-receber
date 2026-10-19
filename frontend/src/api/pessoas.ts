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
 * Os dois filtros são aplicados pela API e se combinam: buscar "silva" na
 * tela de Clientes devolve só clientes chamados Silva. Até a correção de
 * 18/10/2026 no back-end eles se excluíam — o nome anulava o papel —, e o
 * front-end precisava conferir o papel de novo. Não precisa mais.
 */
export function listarPessoas(papel: Papel, nome?: string): Promise<PessoaApi[]> {
  const parametros = new URLSearchParams({ papel });
  if (nome && nome.trim()) parametros.set('nome', nome.trim());

  return requisitar<PessoaApi[]>(`/pessoas?${parametros.toString()}`);
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
