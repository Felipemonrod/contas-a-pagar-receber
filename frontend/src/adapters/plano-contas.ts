/**
 * Adapter do Plano de Contas.
 *
 * O formulario do livro pede a conta superior e o COMPLEMENTO do codigo, e
 * mostra o codigo inteiro montado: superior "21" + complemento "07" dá a
 * conta "21.07". A API guarda só o codigo pronto, em `codigo`. Juntar e
 * separar esses pedaços é o trabalho principal deste arquivo.
 */

import type { PlanoContaApi, PlanoContaNovo } from '../api/tipos';
import type { RecordData } from '../data';

/**
 * Monta o codigo completo a partir do superior e do complemento.
 * Sem conta superior, o complemento já é o codigo (conta de primeiro nivel).
 */
export function montarCodigo(superior: string, complemento: string): string {
  const pai = superior.trim();
  const filho = complemento.trim();
  if (!pai) return filho;
  if (!filho) return pai;
  return `${pai}.${filho}`;
}

/**
 * Separa o codigo no que vem antes e depois do ultimo ponto.
 * "21.07" -> { superior: "21", complemento: "07" }
 * "1"     -> { superior: "",   complemento: "1"  }
 */
export function separarCodigo(codigo: string): { superior: string; complemento: string } {
  const posicao = codigo.lastIndexOf('.');
  if (posicao === -1) return { superior: '', complemento: codigo };
  return { superior: codigo.slice(0, posicao), complemento: codigo.slice(posicao + 1) };
}

/** Converte uma conta da API na linha que o formulario da tela exibe. */
export function planoContaParaRegistro(conta: PlanoContaApi): RecordData {
  const { complemento } = separarCodigo(conta.codigo);

  return {
    id: String(conta.id),
    'Nova Conta': conta.codigo,
    'Conta Superior': conta.codigoSuperior ?? '',
    'Complemento da Conta': complemento,
    'Descrição da Conta': conta.descricao,
    // A tela usa "Sim"/"Não" nas caixas de marcar; a API usa booleano.
    Consolidado: conta.consolidada ? 'Sim' : 'Não',
  };
}

/** Converte o formulario no corpo que a API espera. */
export function registroParaPlanoConta(valores: Record<string, string>): PlanoContaNovo {
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  const superior = campo('Conta Superior');
  // O usuario pode digitar o codigo inteiro em "Nova Conta" ou montá-lo
  // pelo complemento; o que estiver preenchido vale.
  const codigo = campo('Nova Conta') || montarCodigo(superior, campo('Complemento da Conta'));

  return {
    codigo,
    descricao: campo('Descrição da Conta'),
    codigoSuperior: superior || undefined,
    consolidada: campo('Consolidado') === 'Sim',
  };
}

/**
 * Percorre a arvore e devolve todas as contas numa lista plana, com a
 * profundidade de cada uma.
 *
 * Serve para desenhar a arvore sem recursao no componente e para montar a
 * lista de contas superiores possiveis no formulario.
 */
export function achatarArvore(
  contas: PlanoContaApi[],
  nivel = 0,
): { conta: PlanoContaApi; nivel: number }[] {
  return contas.flatMap(conta => [
    { conta, nivel },
    ...achatarArvore(conta.subcontas, nivel + 1),
  ]);
}
