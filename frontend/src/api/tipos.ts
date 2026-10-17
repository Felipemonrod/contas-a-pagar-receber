/**
 * Tipos da API, espelhando `backend/docs/CONTRATO-API.md`.
 *
 * Os nomes dos campos aqui sao EXATAMENTE os nomes do JSON da API.
 * Nada e renomeado neste arquivo: a traducao para o vocabulario das telas
 * (que vem do livro: "Registro", "Cliente", "CGC") acontece em `src/adapters/`.
 */

/**
 * Papeis aceitos pela API. Sao os dois codigos carregados pela migration V2
 * do back-end. Uma pessoa pode ter os dois ao mesmo tempo.
 */
export type Papel = 'CLIENTE' | 'FORNECEDOR';

/**
 * Tipo do telefone. A coluna no banco e um texto livre com o padrao
 * 'COMERCIAL', por isso aqui tambem e texto, e nao uma lista fechada.
 */
export type TipoTelefone = string;

/** Telefone como a API devolve (ja tem id). */
export type TelefoneApi = {
  id: number;
  numero: string;
  ramal: string | null;
  tipo: TipoTelefone;
};

/** Endereco como a API devolve (ja tem id). */
export type EnderecoApi = {
  id: number;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  uf: string;
  principal: boolean;
};

/** Pessoa como a API devolve em GET e em POST/PUT (status 200 e 201). */
export type PessoaApi = {
  id: number;
  nome: string;
  documento: string;
  inscricaoEstadual: string | null;
  email: string | null;
  contato: string | null;
  ativo: boolean;
  papeis: Papel[];
  telefones: TelefoneApi[];
  enderecos: EnderecoApi[];
};

/**
 * Telefone no corpo de uma requisicao: ainda nao tem id.
 * Obrigatorio apenas `numero` (validacao @NotBlank no back-end).
 * `ramal` tem no maximo 6 caracteres, limite da coluna no banco.
 */
export type TelefoneNovo = {
  numero: string;
  ramal?: string;
  tipo?: TipoTelefone;
};

/**
 * Endereco no corpo de uma requisicao: ainda nao tem id.
 * Obrigatorios `logradouro`, `cidade` e `uf` (este com exatamente 2 letras).
 */
export type EnderecoNovo = {
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade: string;
  uf: string;
  principal?: boolean;
};

/**
 * Corpo de POST e PUT de /api/pessoas.
 * Obrigatorios `nome`, `documento` (unico no sistema) e `papeis` (nao vazio).
 */
export type PessoaNova = {
  nome: string;
  documento: string;
  papeis: Papel[];
  inscricaoEstadual?: string;
  email?: string;
  contato?: string;
  telefones: TelefoneNovo[];
  enderecos: EnderecoNovo[];
};
