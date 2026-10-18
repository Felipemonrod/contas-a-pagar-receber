/**
 * Operacoes de /api/despesas.
 *
 * Uma despesa e a PREVISAO de um gasto fixo: "conta de luz de dezembro, uns
 * R$ 150". Quando a fatura chega com o valor real, ela e convertida num
 * titulo a pagar por /gerar-titulo, e deixa de ser apenas previsao.
 */

import { requisitar } from './http';
import type { DespesaApi, DespesaNova, GerarTituloNovo } from './tipos';
import type { ContaPagarApi } from './tipos';

/**
 * Lista as despesas.
 * @param apenasPrevistas true traz so as que ainda nao viraram titulo
 */
export function listarDespesas(apenasPrevistas = false): Promise<DespesaApi[]> {
  return requisitar<DespesaApi[]>(`/despesas${apenasPrevistas ? '?previstas=true' : ''}`);
}

/** Cadastra uma despesa prevista. Responde 201 com o recurso criado. */
export function criarDespesa(despesa: DespesaNova): Promise<DespesaApi> {
  return requisitar<DespesaApi>('/despesas', { metodo: 'POST', corpo: despesa });
}

/** Altera uma despesa. Responde 422 se ela ja tiver virado titulo. */
export function atualizarDespesa(id: number, despesa: DespesaNova): Promise<DespesaApi> {
  return requisitar<DespesaApi>(`/despesas/${id}`, { metodo: 'PUT', corpo: despesa });
}

/** Exclui uma despesa. Responde 204. */
export function excluirDespesa(id: number): Promise<void> {
  return requisitar<void>(`/despesas/${id}`, { metodo: 'DELETE' });
}

/**
 * Converte a despesa prevista num titulo a pagar, com o valor real da
 * fatura. Devolve o titulo criado.
 */
export function gerarTitulo(id: number, dados: GerarTituloNovo): Promise<ContaPagarApi> {
  return requisitar<ContaPagarApi>(`/despesas/${id}/gerar-titulo`, {
    metodo: 'POST',
    corpo: dados,
  });
}
