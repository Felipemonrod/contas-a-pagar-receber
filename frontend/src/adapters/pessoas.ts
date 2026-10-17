/**
 * Adapter de Pessoa: traduz entre o vocabulario das telas e o da API.
 *
 *   Tela (nomes do livro)          Adapter            API
 *   { Registro: "1",         pessoaParaRegistro()   { id: 1,
 *     Cliente: "Greensoft" }  registroParaPessoa()    nome: "Greensoft" }
 *
 * Existe para que as telas, desenhadas a partir do livro, continuem usando
 * "Registro", "Cliente" e "CGC" sem saber que a API usa "id", "nome" e
 * "documento". Toda a conversao de nome de campo e de formato mora aqui.
 */

import type {
  EnderecoNovo,
  Papel,
  PessoaApi,
  PessoaNova,
  TelefoneNovo,
} from '../api/tipos';
import type { RecordData } from '../data';

/**
 * Nome do campo que cada tela usa para a razao social.
 * A tela de clientes chama de "Cliente"; a de fornecedores, de "Fornecedor".
 * Na API os dois sao o mesmo campo: `nome`.
 */
const CAMPO_NOME: Record<Papel, string> = {
  CLIENTE: 'Cliente',
  FORNECEDOR: 'Fornecedor',
};

/** Limite da coluna `ramal` no banco do back-end. */
const TAMANHO_MAXIMO_RAMAL = 6;

/**
 * Posicao do telefone que a tela exibe no seu unico campo de telefone.
 *
 * O back-end guarda os telefones num Set sem ordenacao definida, entao a
 * posicao na lista nao significa nada: numa leitura o primeiro item pode ser
 * o fax. Por isso a escolha e pelo tipo, e nao pela posicao. Ler e gravar
 * usam esta mesma funcao, para que a tela sempre edite o mesmo telefone.
 *
 * Devolve -1 quando a pessoa nao tem telefone nenhum.
 */
export function indiceDoTelefoneExibido(telefones: { tipo: string }[]): number {
  const comercial = telefones.findIndex(item => item.tipo === 'COMERCIAL');
  return comercial === -1 ? (telefones.length ? 0 : -1) : comercial;
}

/**
 * Posicao do endereco que a tela exibe. Preferimos o marcado como principal;
 * sem nenhum principal, o primeiro da lista.
 *
 * Devolve -1 quando a pessoa nao tem endereco nenhum.
 */
export function indiceDoEnderecoExibido(enderecos: { principal: boolean }[]): number {
  const principal = enderecos.findIndex(item => item.principal);
  return principal === -1 ? (enderecos.length ? 0 : -1) : principal;
}

/**
 * Junta logradouro e numero no campo unico "Endereco" que a tela mostra.
 * A API guarda os dois separados; o livro usa uma linha so.
 *
 * ('Rua Jarinu', '594') -> 'Rua Jarinu, 594'
 * ('Av. Paulista', null) -> 'Av. Paulista'
 */
export function juntarEndereco(logradouro: string, numero: string | null): string {
  return numero && numero.trim() ? `${logradouro}, ${numero}` : logradouro;
}

/**
 * Separa o campo unico "Endereco" da tela em logradouro e numero.
 *
 * So trata o trecho depois da ultima virgula como numero quando ele realmente
 * parece um numero (digitos, com uma letra opcional no fim, como '594' ou
 * '12A'). Assim 'Rua 7, 40' vira { logradouro: 'Rua 7', numero: '40' }, mas
 * 'Av. Paulista, Conjunto 3' fica inteiro no logradouro, sem inventar numero.
 */
export function separarEndereco(endereco: string): { logradouro: string; numero?: string } {
  const posicao = endereco.lastIndexOf(',');
  if (posicao === -1) return { logradouro: endereco.trim() };

  const inicio = endereco.slice(0, posicao).trim();
  const fim = endereco.slice(posicao + 1).trim();

  if (!inicio || !/^\d+[A-Za-z]?$/.test(fim)) return { logradouro: endereco.trim() };
  return { logradouro: inicio, numero: fim };
}

/**
 * Converte uma pessoa da API numa linha de tela.
 *
 * Campos que a tela mostra numa linha so (endereco) ou que a API guarda em
 * lista (telefones, enderecos) sao achatados aqui. A tela usa somente o
 * primeiro telefone e o primeiro endereco, como no formulario do livro.
 *
 * @param papel decide se o nome vai no campo "Cliente" ou "Fornecedor"
 */
export function pessoaParaRegistro(pessoa: PessoaApi, papel: Papel): RecordData {
  const telefone = pessoa.telefones[indiceDoTelefoneExibido(pessoa.telefones)];
  const endereco = pessoa.enderecos[indiceDoEnderecoExibido(pessoa.enderecos)];

  return {
    // `id` e a chave que a tabela da tela usa para identificar a linha.
    id: String(pessoa.id),
    // "Registro" e o rotulo do livro para o mesmo numero.
    Registro: String(pessoa.id),
    [CAMPO_NOME[papel]]: pessoa.nome,
    CGC: pessoa.documento,
    'Inscrição Estadual': pessoa.inscricaoEstadual ?? '',
    Contato: pessoa.contato ?? '',
    // No formulario do livro o campo de e-mail se chama "Internet".
    Internet: pessoa.email ?? '',
    Endereço: endereco ? juntarEndereco(endereco.logradouro, endereco.numero) : '',
    Cidade: endereco?.cidade ?? '',
    Estado: endereco?.uf ?? '',
    CEP: endereco?.cep ?? '',
    Telefone: telefone?.numero ?? '',
    Ramal: telefone?.ramal ?? '',
  };
}

/**
 * Converte os valores digitados no formulario no corpo que a API espera.
 *
 * Telefone e endereco so entram no corpo quando o usuario preencheu os campos
 * que a API exige (`numero` para telefone; `logradouro`, `cidade` e `uf` para
 * endereco). Enviar um item incompleto resultaria em 400, por isso a lista
 * vai vazia nesse caso.
 *
 * O PUT da API substitui as listas de telefones e enderecos por inteiro, mas
 * a tela, seguindo o formulario do livro, mostra um telefone e um endereco so.
 * Por isso, ao editar, o que a tela nao mostra e devolvido junto: sem isso,
 * gravar uma pessoa com dois telefones apagaria o segundo em silencio. Pelo
 * mesmo motivo os papeis atuais sao preservados - uma pessoa pode ser CLIENTE
 * e FORNECEDOR ao mesmo tempo, e gravar pela tela de clientes nao pode tirar
 * dela o papel de fornecedor.
 *
 * @param papel papel que esta tela garante na pessoa gravada
 * @param pessoaAtual pessoa como esta hoje na API, ao editar um registro
 */
export function registroParaPessoa(
  valores: Record<string, string>,
  papel: Papel,
  pessoaAtual?: PessoaApi,
): PessoaNova {
  /** Le um campo da tela sem espacos em volta. */
  const campo = (nome: string): string => (valores[nome] ?? '').trim();

  /** Converte vazio em `undefined`, porque a API trata ausente e vazio igual. */
  const opcional = (nome: string): string | undefined => campo(nome) || undefined;

  // Os itens que o formulario do livro nao exibe sao copiados de volta sem
  // alteracao; so o telefone e o endereco exibidos e que o usuario editou.
  // A posicao vem das mesmas funcoes usadas na leitura, para que a tela grave
  // exatamente o item que mostrou.
  const telefoneExibido = indiceDoTelefoneExibido(pessoaAtual?.telefones ?? []);
  const enderecoExibido = indiceDoEnderecoExibido(pessoaAtual?.enderecos ?? []);

  const telefones: TelefoneNovo[] = (pessoaAtual?.telefones ?? []).map(telefone => ({
    numero: telefone.numero,
    ramal: telefone.ramal ?? undefined,
    tipo: telefone.tipo,
  }));
  const digitado: TelefoneNovo | null = campo('Telefone')
    ? {
        numero: campo('Telefone'),
        ramal: campo('Ramal').slice(0, TAMANHO_MAXIMO_RAMAL) || undefined,
        // Mantem o tipo que o telefone ja tinha; num cadastro novo, comercial.
        tipo: pessoaAtual?.telefones[telefoneExibido]?.tipo,
      }
    : null;
  if (telefoneExibido === -1) {
    // Pessoa sem telefone ainda: o que o usuario digitou entra como o primeiro.
    if (digitado) telefones.push(digitado);
  } else if (digitado) {
    telefones.splice(telefoneExibido, 1, digitado);
  } else {
    // Campo apagado pelo usuario: sai so o telefone que a tela exibia.
    telefones.splice(telefoneExibido, 1);
  }

  const enderecos: EnderecoNovo[] = (pessoaAtual?.enderecos ?? []).map(endereco => ({
    logradouro: endereco.logradouro,
    numero: endereco.numero ?? undefined,
    complemento: endereco.complemento ?? undefined,
    bairro: endereco.bairro ?? undefined,
    cep: endereco.cep ?? undefined,
    cidade: endereco.cidade,
    uf: endereco.uf,
    principal: endereco.principal,
  }));
  if (campo('Endereço') && campo('Cidade') && campo('Estado')) {
    const { logradouro, numero } = separarEndereco(campo('Endereço'));
    const anterior = enderecoExibido === -1 ? undefined : pessoaAtual?.enderecos[enderecoExibido];
    const editado: EnderecoNovo = {
      logradouro,
      numero,
      // Bairro e complemento nao estao no formulario do livro: ficam como estavam.
      complemento: anterior?.complemento ?? undefined,
      bairro: anterior?.bairro ?? undefined,
      cep: opcional('CEP'),
      cidade: campo('Cidade'),
      uf: campo('Estado'),
      principal: true,
    };
    if (enderecoExibido === -1) enderecos.push(editado);
    else enderecos.splice(enderecoExibido, 1, editado);
  } else if (enderecoExibido !== -1) {
    enderecos.splice(enderecoExibido, 1);
  }

  return {
    nome: campo(CAMPO_NOME[papel]),
    documento: campo('CGC'),
    papeis: pessoaAtual ? [...new Set([...pessoaAtual.papeis, papel])] : [papel],
    inscricaoEstadual: opcional('Inscrição Estadual'),
    email: opcional('Internet'),
    contato: opcional('Contato'),
    telefones,
    enderecos,
  };
}
