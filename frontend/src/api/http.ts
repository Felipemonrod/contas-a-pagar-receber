/**
 * Cliente HTTP da aplicacao. Um unico lugar que conversa com a API.
 *
 * Responsabilidades:
 *  - montar a URL a partir de `BASE_URL`;
 *  - enviar e receber JSON;
 *  - transformar os erros 400/404/409/422 do contrato em `ErroApi`.
 *
 * Nenhuma tela chama `fetch` diretamente: todas passam por aqui.
 */

/**
 * Endereco da API. O back-end sobe nesta porta e ja libera CORS para
 * http://localhost:5173 e http://127.0.0.1:5173, que sao os enderecos do Vite.
 * Se o back-end subir em outra porta, basta trocar esta linha.
 */
export const BASE_URL = 'http://localhost:8080/api';

/**
 * Um campo rejeitado pela validacao. Vem preenchido somente nos erros 400;
 * nos outros status a API devolve `campos: []`.
 */
export type CampoInvalido = {
  campo: string;
  mensagem: string;
};

/** Corpo de erro da API, igual em todos os status (secao "Formato de erro"). */
export type CorpoDeErro = {
  timestamp: string;
  status: number;
  erro: string;
  mensagem: string;
  campos: CampoInvalido[];
};

/**
 * Erro vindo da API com corpo que segue o contrato.
 *
 * As mensagens da API ja chegam em portugues e legiveis para o usuario final,
 * por isso `message` pode ser exibida direto na tela, sem traducao.
 */
export class ErroApi extends Error {
  /** Status HTTP: 400, 404, 409 ou 422. */
  readonly status: number;
  /** Codigo da API, por exemplo 'REGRA_NEGOCIO'. */
  readonly codigo: string;
  /** Campos rejeitados pela validacao; vazio fora do status 400. */
  readonly campos: CampoInvalido[];

  constructor(corpo: CorpoDeErro) {
    super(corpo.mensagem);
    this.name = 'ErroApi';
    this.status = corpo.status;
    this.codigo = corpo.erro;
    this.campos = corpo.campos;
  }
}

/**
 * Erro de rede: o navegador nao conseguiu falar com o servidor.
 * Normalmente significa que o back-end nao esta rodando.
 */
export class ErroDeRede extends Error {
  constructor() {
    super(
      'Nao foi possivel falar com o servidor. ' +
        `Verifique se a API esta rodando em ${BASE_URL}.`,
    );
    this.name = 'ErroDeRede';
  }
}

/**
 * Confere se um valor desconhecido tem a forma de `CorpoDeErro`.
 *
 * O corpo da resposta e `unknown` porque vem de fora do programa; esta funcao
 * e o ponto onde ele passa a ter um tipo conhecido, sem usar `any`.
 */
function pareceCorpoDeErro(valor: unknown): valor is CorpoDeErro {
  if (typeof valor !== 'object' || valor === null) return false;
  const possivel = valor as Partial<CorpoDeErro>;
  return typeof possivel.mensagem === 'string' && typeof possivel.status === 'number';
}

/** Le o corpo da resposta como JSON, devolvendo `null` quando nao houver corpo. */
async function lerCorpo(resposta: Response): Promise<unknown> {
  // 204 (sem conteudo) e corpo vazio nao tem JSON para interpretar.
  const texto = await resposta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}

/** Opcoes de uma requisicao. `corpo` e serializado como JSON quando presente. */
type Requisicao = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  corpo?: unknown;
};

/**
 * Executa uma requisicao e devolve o corpo da resposta.
 *
 * @param caminho trecho depois de `BASE_URL`, por exemplo '/pessoas?papel=CLIENTE'
 * @throws ErroApi quando a API responde com erro no formato do contrato
 * @throws ErroDeRede quando nao foi possivel chegar ao servidor
 */
export async function requisitar<T>(caminho: string, opcoes: Requisicao = {}): Promise<T> {
  const { metodo = 'GET', corpo } = opcoes;

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    // `fetch` so rejeita por falha de rede; erro HTTP vem em `resposta`.
    throw new ErroDeRede();
  }

  const conteudo = await lerCorpo(resposta);

  if (!resposta.ok) {
    if (pareceCorpoDeErro(conteudo)) throw new ErroApi(conteudo);
    // Resposta de erro fora do contrato (por exemplo um 500 com HTML).
    throw new ErroApi({
      timestamp: new Date().toISOString(),
      status: resposta.status,
      erro: 'ERRO_INESPERADO',
      mensagem: `O servidor respondeu com erro ${resposta.status}.`,
      campos: [],
    });
  }

  return conteudo as T;
}

/**
 * Traduz qualquer erro capturado numa mensagem para o usuario.
 *
 * Recebe `unknown` porque e o tipo de um `catch`. Mantem a mensagem da API
 * quando ela existe, ja que o contrato garante texto legivel em portugues.
 */
export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroApi || erro instanceof ErroDeRede) return erro.message;
  if (erro instanceof Error) return erro.message;
  return 'Ocorreu um erro inesperado.';
}
