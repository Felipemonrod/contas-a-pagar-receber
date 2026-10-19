/**
 * Adapter de Remessa para Cartorio (livro, cap. 10 e 17).
 *
 * Mandar um titulo a protesto nao e um cadastro comum: a regra RN09 so
 * deixa protestar titulo VENCIDO e NAO QUITADO. Por isso a tela nao pede o
 * numero do titulo digitado, e sim escolhido entre os inadimplentes — o
 * usuario nao consegue montar uma remessa que a API vai recusar.
 */

import type { CartorioApi, ContaReceberApi, RemessaApi, SituacaoRemessa } from '../api/tipos';
import type { RecordData } from '../data';

/** Como cada situacao da remessa aparece na tela. */
export const SITUACOES_DA_REMESSA: Record<SituacaoRemessa, string> = {
  ENVIADA: 'Enviada',
  PROTESTADA: 'Protestada',
  BAIXADA: 'Baixada',
};

/** Converte uma remessa da API na linha que a tela exibe. */
export function remessaParaRegistro(remessa: RemessaApi): RecordData {
  return {
    id: String(remessa.id),
    Nome: remessa.cliente,
    Cartório: remessa.cartorioNome,
    'Número do Título': remessa.numeroTitulo,
    Remessa: remessa.dataRemessa,
    Protesto: remessa.dataProtesto ?? '',
    Baixa: remessa.dataBaixa ?? '',
    Situação: SITUACOES_DA_REMESSA[remessa.situacao],
    'Saldo Devedor': String(remessa.saldoDevedor),
  };
}

/**
 * Como um titulo inadimplente aparece no campo de escolha.
 * Traz o numero e o cliente, porque so o numero nao diz de quem e.
 */
export function rotuloDoTitulo(titulo: ContaReceberApi): string {
  return `${titulo.numeroTitulo} - ${titulo.pessoaNome}`;
}

/** Acha o titulo pelo rotulo escolhido no formulario. */
export function acharTituloPorRotulo(
  rotulo: string,
  titulos: ContaReceberApi[],
): ContaReceberApi | undefined {
  const procurado = rotulo.trim();
  return titulos.find(titulo => rotuloDoTitulo(titulo) === procurado);
}

/** Acha o cartorio pelo nome escolhido no formulario. */
export function acharCartorioPorNome(
  nome: string,
  cartorios: CartorioApi[],
): CartorioApi | undefined {
  const procurado = nome.trim();
  return cartorios.find(cartorio => cartorio.nome === procurado);
}
