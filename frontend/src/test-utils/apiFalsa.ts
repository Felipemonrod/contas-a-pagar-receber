/**
 * API de mentira para os testes.
 *
 * Substitui `fetch` por uma implementacao em memoria que responde como
 * /api/pessoas responde de verdade, incluindo:
 *  - 201 com o recurso criado no POST;
 *  - 422 com o corpo de erro do contrato quando o documento repete;
 *  - o filtro `nome` tendo prioridade sobre `papel`, como em PessoaService.
 *
 * Assim os testes das telas integradas rodam sem back-end e sem banco, e
 * continuam valendo como prova de que o adapter monta o corpo certo.
 */

import { vi } from 'vitest';
import type { PessoaApi, PessoaNova } from '../api/tipos';

/** Registro de uma chamada recebida, para os testes inspecionarem. */
export type ChamadaRegistrada = {
  metodo: string;
  url: string;
  corpo: PessoaNova | null;
};

/** Controle devolvido ao teste para inspecionar e preparar o estado. */
export type ApiFalsa = {
  /** Pessoas guardadas no momento. */
  pessoas: () => PessoaApi[];
  /** Todas as chamadas recebidas, na ordem. */
  chamadas: () => ChamadaRegistrada[];
  /** Ultimo corpo enviado num POST ou PUT. */
  ultimoCorpo: () => PessoaNova | null;
};

/** Monta uma resposta de erro no formato do contrato. */
function respostaDeErro(status: number, codigo: string, mensagem: string): Response {
  return new Response(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      erro: codigo,
      mensagem,
      campos: [],
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Monta uma resposta de sucesso com corpo JSON. */
function respostaOk(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Compara textos ignorando maiusculas e acentos, como o MySQL do back-end
 * faz com a collation padrao (utf8mb4_0900_ai_ci).
 */
function contemTexto(todo: string, parte: string): boolean {
  const limpar = (valor: string) =>
    valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return limpar(todo).includes(limpar(parte));
}

/** Converte o corpo de uma requisicao na pessoa que a API devolveria. */
function montarPessoa(corpo: PessoaNova, id: number): PessoaApi {
  return {
    id,
    nome: corpo.nome,
    documento: corpo.documento,
    inscricaoEstadual: corpo.inscricaoEstadual ?? null,
    email: corpo.email ?? null,
    contato: corpo.contato ?? null,
    ativo: true,
    papeis: corpo.papeis,
    telefones: corpo.telefones.map((telefone, indice) => ({
      id: indice + 1,
      numero: telefone.numero,
      ramal: telefone.ramal ?? null,
      tipo: telefone.tipo ?? 'COMERCIAL',
    })),
    enderecos: corpo.enderecos.map((endereco, indice) => ({
      id: indice + 1,
      logradouro: endereco.logradouro,
      numero: endereco.numero ?? null,
      complemento: endereco.complemento ?? null,
      bairro: endereco.bairro ?? null,
      cep: endereco.cep ?? null,
      cidade: endereco.cidade,
      uf: endereco.uf,
      principal: endereco.principal ?? false,
    })),
  };
}

/**
 * Troca `fetch` pela API de mentira. Chamar dentro de um teste ou de um
 * `beforeEach`; o `vi.restoreAllMocks()` do test-setup desfaz no final.
 *
 * @param iniciais pessoas que ja existem no banco quando o teste comeca
 */
/** Ultima API falsa instalada, para os testes consultarem sem repassa-la. */
let instalada: ApiFalsa | null = null;

/** Devolve a API falsa instalada pelo test-setup no teste atual. */
export function apiFalsaAtual(): ApiFalsa {
  if (!instalada) throw new Error('Nenhuma API falsa instalada neste teste.');
  return instalada;
}

export function instalarApiFalsa(iniciais: PessoaNova[] = []): ApiFalsa {
  let proximoId = 1;
  const guardadas: PessoaApi[] = iniciais.map(corpo => montarPessoa(corpo, proximoId++));
  const chamadas: ChamadaRegistrada[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada, opcoes) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    const metodo = opcoes?.method ?? 'GET';
    const textoDoCorpo = typeof opcoes?.body === 'string' ? opcoes.body : null;
    const corpo = textoDoCorpo ? (JSON.parse(textoDoCorpo) as PessoaNova) : null;
    chamadas.push({ metodo, url, corpo });

    const endereco = new URL(url);
    const caminho = endereco.pathname.replace('/api', '');

    /** Ordena por nome, como o "OrderByNome" das consultas do back-end. */
    const ordenar = (lista: PessoaApi[]) =>
      [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (caminho === '/pessoas' && metodo === 'GET') {
      const nome = endereco.searchParams.get('nome');
      const papel = endereco.searchParams.get('papel');
      // Igual ao back-end: havendo `nome`, o `papel` e ignorado.
      if (nome) return respostaOk(ordenar(guardadas.filter(p => contemTexto(p.nome, nome))));
      if (papel) {
        return respostaOk(ordenar(guardadas.filter(p => p.papeis.some(item => item === papel))));
      }
      return respostaOk(ordenar(guardadas));
    }

    if (caminho === '/pessoas' && metodo === 'POST' && corpo) {
      if (guardadas.some(p => p.documento === corpo.documento)) {
        return respostaDeErro(422, 'REGRA_NEGOCIO', 'Documento ja cadastrado para outra pessoa.');
      }
      const criada = montarPessoa(corpo, proximoId++);
      guardadas.push(criada);
      return respostaOk(criada, 201);
    }

    const casaComId = /^\/pessoas\/(\d+)$/.exec(caminho);
    if (casaComId) {
      const id = Number(casaComId[1]);
      const posicao = guardadas.findIndex(p => p.id === id);
      if (posicao === -1) {
        return respostaDeErro(404, 'NAO_ENCONTRADO', `Pessoa ${id} nao encontrada.`);
      }
      if (metodo === 'PUT' && corpo) {
        guardadas[posicao] = montarPessoa(corpo, id);
        return respostaOk(guardadas[posicao]);
      }
      if (metodo === 'DELETE') {
        guardadas[posicao] = { ...guardadas[posicao], ativo: false };
        return respostaOk(guardadas[posicao]);
      }
      return respostaOk(guardadas[posicao]);
    }

    return respostaDeErro(404, 'NAO_ENCONTRADO', `Rota ${metodo} ${caminho} nao existe.`);
  });

  instalada = {
    pessoas: () => [...guardadas],
    chamadas: () => [...chamadas],
    ultimoCorpo: () => [...chamadas].reverse().find(c => c.corpo)?.corpo ?? null,
  };
  return instalada;
}
