/**
 * Testes do adapter de Pessoa.
 *
 * Nao usam rede: o adapter e uma funcao pura que recebe um objeto e devolve
 * outro. O exemplo de pessoa e o mesmo do CONTRATO-API.md, para que o teste
 * falhe se o contrato mudar.
 */

import { describe, expect, it } from 'vitest';
import {
  juntarEndereco,
  pessoaParaRegistro,
  registroParaPessoa,
  separarEndereco,
} from './pessoas';
import type { PessoaApi } from '../api/tipos';

/** Resposta de exemplo copiada da secao 1 do contrato. */
const pessoaDoContrato: PessoaApi = {
  id: 1,
  nome: 'Greensoft Informatica Ltda',
  documento: '33.537.659/0007-11',
  inscricaoEstadual: null,
  email: 'contato@greensoft.com.br',
  contato: 'Wilson',
  ativo: true,
  papeis: ['FORNECEDOR', 'CLIENTE'],
  telefones: [
    { id: 1, numero: '(11) 5585-4975', ramal: '201', tipo: 'COMERCIAL' },
    { id: 2, numero: '(11) 5584-2545', ramal: null, tipo: 'FAX' },
  ],
  enderecos: [
    {
      id: 1,
      logradouro: 'Av. Paulista',
      numero: '1439',
      complemento: null,
      bairro: 'Bela Vista',
      cep: '01311-200',
      cidade: 'Sao Paulo',
      uf: 'SP',
      principal: true,
    },
  ],
};

describe('juntarEndereco e separarEndereco', () => {
  it('junta logradouro e numero numa linha so', () => {
    expect(juntarEndereco('Rua Jarinu', '594')).toBe('Rua Jarinu, 594');
  });

  it('omite a virgula quando a API nao tem numero', () => {
    expect(juntarEndereco('Av. Paulista', null)).toBe('Av. Paulista');
  });

  it('separa o numero do fim da linha', () => {
    expect(separarEndereco('Rua 7, 40')).toEqual({ logradouro: 'Rua 7', numero: '40' });
  });

  it('aceita numero com letra', () => {
    expect(separarEndereco('Rua A, 12A')).toEqual({ logradouro: 'Rua A', numero: '12A' });
  });

  it('nao inventa numero quando o fim nao e numerico', () => {
    expect(separarEndereco('Av. Paulista, Conjunto 3')).toEqual({
      logradouro: 'Av. Paulista, Conjunto 3',
    });
  });

  it('aceita endereco sem virgula', () => {
    expect(separarEndereco('Av. Paulista')).toEqual({ logradouro: 'Av. Paulista' });
  });
});

describe('pessoaParaRegistro', () => {
  it('traduz os nomes de campo da API para os da tela de clientes', () => {
    const linha = pessoaParaRegistro(pessoaDoContrato, 'CLIENTE');

    expect(linha.Registro).toBe('1');
    expect(linha.Cliente).toBe('Greensoft Informatica Ltda');
    expect(linha['CPF / CNPJ']).toBe('33.537.659/0007-11');
    expect(linha.Internet).toBe('contato@greensoft.com.br');
    expect(linha.Contato).toBe('Wilson');
  });

  it('usa o campo Fornecedor quando o papel e FORNECEDOR', () => {
    const linha = pessoaParaRegistro(pessoaDoContrato, 'FORNECEDOR');

    expect(linha.Fornecedor).toBe('Greensoft Informatica Ltda');
    expect(linha.Cliente).toBeUndefined();
  });

  it('achata o primeiro telefone e o endereco principal', () => {
    const linha = pessoaParaRegistro(pessoaDoContrato, 'CLIENTE');

    expect(linha.Telefone).toBe('(11) 5585-4975');
    expect(linha.Ramal).toBe('201');
    expect(linha.Endereço).toBe('Av. Paulista, 1439');
    expect(linha.Cidade).toBe('Sao Paulo');
    expect(linha.Estado).toBe('SP');
    expect(linha.CEP).toBe('01311-200');
  });

  it('troca campos nulos da API por texto vazio, que a tela sabe exibir', () => {
    const linha = pessoaParaRegistro(pessoaDoContrato, 'CLIENTE');

    expect(linha['Inscrição Estadual']).toBe('');
  });

  it('nao quebra com pessoa sem telefone e sem endereco', () => {
    const semContato: PessoaApi = { ...pessoaDoContrato, telefones: [], enderecos: [] };
    const linha = pessoaParaRegistro(semContato, 'CLIENTE');

    expect(linha.Telefone).toBe('');
    expect(linha.Endereço).toBe('');
    expect(linha.Cidade).toBe('');
  });
});

describe('registroParaPessoa', () => {
  const formularioCompleto = {
    Cliente: 'Editora Erica Ltda.',
    'CPF / CNPJ': '11.222.333/0001-44',
    'Inscrição Estadual': '123456',
    Endereço: 'Rua Jarinu, 594',
    Cidade: 'Sao Paulo',
    Estado: 'SP',
    CEP: '03127-020',
    Telefone: '(11) 0000-0000',
    Ramal: '12',
    Contato: 'Maria',
    Internet: 'contato@erica.com.br',
  };

  it('traduz os campos da tela para os nomes da API', () => {
    const corpo = registroParaPessoa(formularioCompleto, 'CLIENTE');

    expect(corpo.nome).toBe('Editora Erica Ltda.');
    expect(corpo.documento).toBe('11.222.333/0001-44');
    expect(corpo.email).toBe('contato@erica.com.br');
    expect(corpo.contato).toBe('Maria');
    expect(corpo.papeis).toEqual(['CLIENTE']);
  });

  it('separa o endereco em logradouro e numero', () => {
    const corpo = registroParaPessoa(formularioCompleto, 'CLIENTE');

    expect(corpo.enderecos).toEqual([
      {
        logradouro: 'Rua Jarinu',
        numero: '594',
        cep: '03127-020',
        cidade: 'Sao Paulo',
        uf: 'SP',
        principal: true,
      },
    ]);
  });

  it('monta a lista de telefones a partir dos campos soltos', () => {
    const corpo = registroParaPessoa(formularioCompleto, 'CLIENTE');

    expect(corpo.telefones).toEqual([{ numero: '(11) 0000-0000', ramal: '12' }]);
  });

  it('grava o papel FORNECEDOR e le o campo Fornecedor', () => {
    const corpo = registroParaPessoa({ Fornecedor: 'Acme S/A', 'CPF / CNPJ': '1' }, 'FORNECEDOR');

    expect(corpo.nome).toBe('Acme S/A');
    expect(corpo.papeis).toEqual(['FORNECEDOR']);
  });

  it('omite endereco incompleto, que a API rejeitaria com 400', () => {
    const corpo = registroParaPessoa(
      { Cliente: 'Sem Endereco', 'CPF / CNPJ': '1', Endereço: 'Rua X' },
      'CLIENTE',
    );

    expect(corpo.enderecos).toEqual([]);
  });

  it('omite telefone quando o numero nao foi preenchido', () => {
    const corpo = registroParaPessoa({ Cliente: 'Sem Fone', 'CPF / CNPJ': '1', Ramal: '9' }, 'CLIENTE');

    expect(corpo.telefones).toEqual([]);
  });

  it('corta o ramal no limite de 6 caracteres da coluna do banco', () => {
    const corpo = registroParaPessoa(
      { Cliente: 'A', 'CPF / CNPJ': '1', Telefone: '(11) 1111-1111', Ramal: '1234567890' },
      'CLIENTE',
    );

    expect(corpo.telefones[0].ramal).toBe('123456');
  });

  it('troca campo vazio por undefined em vez de enviar texto vazio', () => {
    const corpo = registroParaPessoa({ Cliente: 'A', 'CPF / CNPJ': '1', Internet: '   ' }, 'CLIENTE');

    expect(corpo.email).toBeUndefined();
  });

  it('remove espacos em volta dos valores digitados', () => {
    const corpo = registroParaPessoa({ Cliente: '  Acme  ', 'CPF / CNPJ': ' 123 ' }, 'CLIENTE');

    expect(corpo.nome).toBe('Acme');
    expect(corpo.documento).toBe('123');
  });
});

describe('ida e volta entre os dois formatos', () => {
  it('preserva os dados ao converter para tela e de volta para a API', () => {
    const linha = pessoaParaRegistro(pessoaDoContrato, 'CLIENTE');
    const corpo = registroParaPessoa(linha, 'CLIENTE');

    expect(corpo.nome).toBe(pessoaDoContrato.nome);
    expect(corpo.documento).toBe(pessoaDoContrato.documento);
    expect(corpo.email).toBe(pessoaDoContrato.email);
    expect(corpo.enderecos[0].logradouro).toBe('Av. Paulista');
    expect(corpo.enderecos[0].numero).toBe('1439');
    expect(corpo.enderecos[0].cidade).toBe('Sao Paulo');
    expect(corpo.telefones[0].numero).toBe('(11) 5585-4975');
  });
});

describe('o que a tela nao mostra e preservado ao editar', () => {
  /** Formulario preenchido como a tela de clientes o exibiria para Greensoft. */
  const comoNaTela = {
    Cliente: 'Greensoft Informatica Ltda',
    'CPF / CNPJ': '33.537.659/0007-11',
    Endereço: 'Av. Paulista, 1439',
    Cidade: 'Sao Paulo',
    Estado: 'SP',
    CEP: '01311-200',
    Telefone: '(11) 5585-4975',
    Ramal: '201',
    Contato: 'Wilson Editado',
    Internet: 'contato@greensoft.com.br',
  };

  it('mantem o papel de fornecedor ao gravar pela tela de clientes', () => {
    const corpo = registroParaPessoa(comoNaTela, 'CLIENTE', pessoaDoContrato);

    expect(corpo.papeis).toEqual(['FORNECEDOR', 'CLIENTE']);
  });

  it('nao duplica o papel quando a pessoa ja o tem', () => {
    const soCliente = { ...pessoaDoContrato, papeis: ['CLIENTE'] as const };
    const corpo = registroParaPessoa(comoNaTela, 'CLIENTE', {
      ...pessoaDoContrato,
      papeis: [...soCliente.papeis],
    });

    expect(corpo.papeis).toEqual(['CLIENTE']);
  });

  it('mantem o segundo telefone, que o formulario do livro nao exibe', () => {
    const corpo = registroParaPessoa(comoNaTela, 'CLIENTE', pessoaDoContrato);

    expect(corpo.telefones).toHaveLength(2);
    expect(corpo.telefones[0]).toEqual({
      numero: '(11) 5585-4975',
      ramal: '201',
      tipo: 'COMERCIAL',
    });
    // O fax continua la, intacto.
    expect(corpo.telefones[1]).toEqual({ numero: '(11) 5584-2545', ramal: undefined, tipo: 'FAX' });
  });

  it('mantem bairro e complemento, que nao estao no formulario', () => {
    const corpo = registroParaPessoa(comoNaTela, 'CLIENTE', pessoaDoContrato);

    expect(corpo.enderecos).toHaveLength(1);
    expect(corpo.enderecos[0].bairro).toBe('Bela Vista');
    expect(corpo.enderecos[0].logradouro).toBe('Av. Paulista');
    expect(corpo.enderecos[0].numero).toBe('1439');
  });

  it('ao cadastrar do zero nao inventa telefone nem endereco extra', () => {
    const corpo = registroParaPessoa(comoNaTela, 'CLIENTE');

    expect(corpo.telefones).toHaveLength(1);
    expect(corpo.enderecos).toHaveLength(1);
    expect(corpo.papeis).toEqual(['CLIENTE']);
  });

  it('remove o telefone exibido quando o usuario apaga o campo', () => {
    const corpo = registroParaPessoa(
      { ...comoNaTela, Telefone: '', Ramal: '' },
      'CLIENTE',
      pessoaDoContrato,
    );

    // Sai o telefone que a tela mostrava; o fax, que ela nao mostra, fica.
    expect(corpo.telefones).toEqual([
      { numero: '(11) 5584-2545', ramal: undefined, tipo: 'FAX' },
    ]);
  });
});

describe('ordem dos telefones vinda da API', () => {
  /**
   * O back-end guarda os telefones num Set sem ordenacao, e devolve o fax
   * antes do comercial. A tela precisa continuar exibindo e gravando o
   * telefone comercial, e nao o primeiro item da lista.
   */
  const faxPrimeiro: PessoaApi = {
    ...pessoaDoContrato,
    telefones: [
      { id: 5, numero: '(11) 5584-2545', ramal: null, tipo: 'FAX' },
      { id: 6, numero: '(11) 5585-4975', ramal: '201', tipo: 'COMERCIAL' },
    ],
  };

  it('exibe o telefone comercial, mesmo vindo depois do fax', () => {
    const linha = pessoaParaRegistro(faxPrimeiro, 'CLIENTE');

    expect(linha.Telefone).toBe('(11) 5585-4975');
    expect(linha.Ramal).toBe('201');
  });

  it('grava sobre o comercial e nao sobre o fax', () => {
    const linha = pessoaParaRegistro(faxPrimeiro, 'CLIENTE');
    const corpo = registroParaPessoa({ ...linha, Telefone: '(64) 3413-0000' }, 'CLIENTE', faxPrimeiro);

    expect(corpo.telefones).toEqual([
      { numero: '(11) 5584-2545', ramal: undefined, tipo: 'FAX' },
      { numero: '(64) 3413-0000', ramal: '201', tipo: 'COMERCIAL' },
    ]);
  });

  it('usa o primeiro telefone quando nenhum e comercial', () => {
    const semComercial: PessoaApi = {
      ...pessoaDoContrato,
      telefones: [{ id: 9, numero: '(11) 9999-9999', ramal: null, tipo: 'CELULAR' }],
    };

    expect(pessoaParaRegistro(semComercial, 'CLIENTE').Telefone).toBe('(11) 9999-9999');
  });

  it('adiciona o primeiro telefone a uma pessoa que nao tinha nenhum', () => {
    const semTelefone: PessoaApi = { ...pessoaDoContrato, telefones: [] };
    const corpo = registroParaPessoa(
      { Cliente: 'A', 'CPF / CNPJ': '1', Telefone: '(62) 1111-2222' },
      'CLIENTE',
      semTelefone,
    );

    expect(corpo.telefones).toEqual([
      { numero: '(62) 1111-2222', ramal: undefined, tipo: undefined },
    ]);
  });
});

describe('campos que o formulario da tela nao tem', () => {
  it('mantem o contato ao gravar por um formulario sem o campo Contato', () => {
    // O formulario de Fornecedor, vindo do livro, nao tem "Contato".
    const corpo = registroParaPessoa(
      { Fornecedor: 'Greensoft Informatica Ltda', 'CPF / CNPJ': '33.537.659/0007-11' },
      'FORNECEDOR',
      pessoaDoContrato,
    );

    expect(corpo.contato).toBe('Wilson');
  });

  it('apaga o contato quando o campo existe e o usuario o esvazia', () => {
    const corpo = registroParaPessoa(
      { Cliente: 'Greensoft', 'CPF / CNPJ': '1', Contato: '' },
      'CLIENTE',
      pessoaDoContrato,
    );

    expect(corpo.contato).toBeUndefined();
  });

  it('mantem o e-mail e a inscricao estadual pelo mesmo motivo', () => {
    const comInscricao: PessoaApi = { ...pessoaDoContrato, inscricaoEstadual: '123456' };
    const corpo = registroParaPessoa({ Fornecedor: 'A', 'CPF / CNPJ': '1' }, 'FORNECEDOR', comInscricao);

    expect(corpo.email).toBe('contato@greensoft.com.br');
    expect(corpo.inscricaoEstadual).toBe('123456');
  });

  it('num cadastro novo, campo ausente continua sendo undefined', () => {
    const corpo = registroParaPessoa({ Fornecedor: 'Novo', 'CPF / CNPJ': '1' }, 'FORNECEDOR');

    expect(corpo.contato).toBeUndefined();
    expect(corpo.email).toBeUndefined();
  });
});
