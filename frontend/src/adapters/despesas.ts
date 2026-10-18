/**
 * Adapter de Despesa.
 *
 * Uma despesa é a PREVISÃO de um gasto: "conta de luz de dezembro, uns
 * R$ 150". Quando a fatura chega com o valor real, ela vira um título a
 * pagar.
 *
 * O campo "Lançamento" da tela do livro era um número solto (125, 156). Na
 * API o que prende a despesa a alguma coisa é `planoContaId`, a categoria
 * do plano de contas. Por isso o campo passou a ser a categoria, que é o
 * que ele de fato significa.
 */

import type { DespesaApi, DespesaNova, PlanoContaItemApi } from '../api/tipos';
import type { RecordData } from '../data';

/** Converte uma despesa da API na linha que a tela exibe. */
export function despesaParaRegistro(despesa: DespesaApi): RecordData {
  return {
    id: String(despesa.id),
    Número: String(despesa.id),
    Lançamento: despesa.categoria,
    'Data Lanç.': despesa.dataLancamento,
    'Previsão de Pagamento': despesa.previsaoPagamento,
    'Valor Previsto': String(despesa.valorPrevisto),
    Descrição: despesa.descricao,
    // Colunas de acompanhamento: mostram se a previsão já virou título.
    Situação: despesa.realizada ? 'REALIZADA' : 'PREVISTA',
    'Número do Título': despesa.numeroTitulo ?? '',
  };
}

/**
 * Converte o formulário no corpo que a API espera.
 *
 * @param planoContaId categoria já resolvida pela tela a partir do nome
 */
export function registroParaDespesa(
  valores: Record<string, string>,
  planoContaId: number,
): DespesaNova {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  return {
    planoContaId,
    descricao: campo('Descrição'),
    valorPrevisto: Number(campo('Valor Previsto')) || 0,
    previsaoPagamento: campo('Previsão de Pagamento'),
  };
}

/**
 * Como uma categoria aparece no campo de escolha da tela.
 * O mesmo texto que a API devolve em `categoria`, para que o nome escolhido
 * possa ser reencontrado na lista ao editar.
 */
export function rotuloDaCategoria(conta: PlanoContaItemApi): string {
  return `${conta.codigo} - ${conta.descricao}`;
}

/** Acha a categoria pelo rótulo escolhido no formulário. */
export function acharCategoriaPorRotulo(
  rotulo: string,
  categorias: PlanoContaItemApi[],
): PlanoContaItemApi | undefined {
  const procurado = rotulo.trim();
  return categorias.find(conta => rotuloDaCategoria(conta) === procurado);
}
