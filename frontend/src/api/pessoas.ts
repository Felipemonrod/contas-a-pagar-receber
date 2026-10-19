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
 * navegador, para que a busca alcance todos os registros do banco.
 *
 * ATENCAO: no back-end os dois filtros se excluem. Em PessoaService.listar,
 * quando `nome` vem preenchido o parametro `papel` e ignorado, e a consulta
 * devolve qualquer pessoa cujo nome combine - inclusive de outro papel. Sem
 * tratamento, buscar na tela de Clientes acabaria listando fornecedores.
 * Por isso, quando ha busca por nome, o papel e conferido aqui tambem.
 */
export async function listarPessoas(papel: Papel, nome?: string): Promise<PessoaApi[]> {
  const buscaPorNome = Boolean(nome && nome.trim());
  const parametros = new URLSearchParams({ papel });
  if (buscaPorNome && nome) parametros.set('nome', nome.trim());

  const encontradas = await requisitar<PessoaApi[]>(`/pessoas?${parametros.toString()}`);
  if (!buscaPorNome) return encontradas;
  return encontradas.filter(pessoa => pessoa.papeis.includes(papel));
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
