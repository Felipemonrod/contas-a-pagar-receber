/**
 * Liga cada lado do caixa as suas chamadas de API.
 *
 * A `TitulosScreen` nao importa nenhum modulo de API diretamente: recebe
 * estas funcoes prontas. E o que permite a mesma tela servir Pagamentos e
 * Recebimentos, e o que torna fácil testá-la.
 *
 * Cada funcao devolve o titulo ja na forma comum `Titulo`, convertido pelo
 * adapter — a tela nunca vê `totalPago` nem `totalRecebido`.
 */

import {
  atualizarContaPagar,
  criarContaPagar,
  listarContasPagar,
  cancelarContaPagar,
  quitarContaPagar,
  simularQuitacao,
} from '../api/contas-pagar';
import {
  atualizarContaReceber,
  criarContaReceber,
  listarContasReceber,
  cancelarContaReceber,
  receberContaReceber,
  simularRecebimento,
} from '../api/contas-receber';
import { dePagar, deReceber } from '../adapters/titulos';
import type { OperacoesDeTitulo } from './TitulosScreen';

/** Contas a pagar: a quitacao se chama "pagamento". */
export const OPERACOES_A_PAGAR: OperacoesDeTitulo = {
  listar: async () => (await listarContasPagar()).map(dePagar),
  criar: async corpo => dePagar(await criarContaPagar(corpo)),
  atualizar: async (id, corpo) => dePagar(await atualizarContaPagar(id, corpo)),
  simular: simularQuitacao,
  cancelar: async id => dePagar(await cancelarContaPagar(id)),
  quitar: async (id, dados) =>
    dePagar(
      await quitarContaPagar(id, {
        dataPagamento: dados.data,
        formaPagamento: dados.forma,
        valorPago: dados.valor,
      }),
    ),
};

/** Contas a receber: a quitacao se chama "recebimento". */
export const OPERACOES_A_RECEBER: OperacoesDeTitulo = {
  listar: async () => (await listarContasReceber()).map(deReceber),
  criar: async corpo => deReceber(await criarContaReceber(corpo)),
  atualizar: async (id, corpo) => deReceber(await atualizarContaReceber(id, corpo)),
  simular: simularRecebimento,
  cancelar: async id => deReceber(await cancelarContaReceber(id)),
  quitar: async (id, dados) =>
    deReceber(
      await receberContaReceber(id, {
        dataRecebimento: dados.data,
        formaPagamento: dados.forma,
        valorRecebido: dados.valor,
      }),
    ),
};
