import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { instalarApiFalsa } from './test-utils/apiFalsa';
import type { PessoaNova } from './api/tipos';

HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

/**
 * Clientes que a API falsa ja tem no comeco de cada teste.
 * Sao os mesmos exemplos do Figma que antes vinham do localStorage, agora no
 * formato da API, para que os testes das telas integradas tenham o que listar.
 */
export const CLIENTES_DE_EXEMPLO: PessoaNova[] = [
  {
    nome: 'Editora Érica Ltda.',
    documento: '11.111.111/0001-11',
    papeis: ['CLIENTE'],
    telefones: [{ numero: '(11) 0000-0000' }],
    enderecos: [
      { logradouro: 'Rua Jarinu', numero: '594', cidade: 'São Paulo', uf: 'SP', principal: true },
    ],
  },
  {
    nome: 'Cliente Exemplo',
    documento: '22.222.222/0001-22',
    papeis: ['CLIENTE'],
    telefones: [{ numero: '(64) 0000-0000' }],
    enderecos: [
      { logradouro: 'Av. Principal', numero: '100', cidade: 'Morrinhos', uf: 'GO', principal: true },
    ],
  },
  {
    nome: 'Comercial Goiás',
    documento: '33.333.333/0001-33',
    papeis: ['CLIENTE'],
    telefones: [{ numero: '(62) 0000-0000' }],
    enderecos: [
      { logradouro: 'Rua 7', numero: '40', cidade: 'Goiânia', uf: 'GO', principal: true },
    ],
  },
];

/**
 * Fornecedores de exemplo. A tela de Pagamentos precisa deles para preencher
 * o campo de escolha do fornecedor e para trocar o nome pelo `pessoaId`.
 */
export const FORNECEDORES_DE_EXEMPLO: PessoaNova[] = [
  {
    nome: "Fornecedor Brasil S/A",
    documento: "44.444.444/0001-44",
    papeis: ["FORNECEDOR"],
    telefones: [{ numero: "(62) 0000-0000" }],
    enderecos: [
      { logradouro: "Rua das Flores", numero: "123", cidade: "Goiânia", uf: "GO", principal: true },
    ],
  },
  {
    nome: "Distribuidora Central",
    documento: "55.555.555/0001-55",
    papeis: ["FORNECEDOR"],
    telefones: [],
    enderecos: [],
  },
];

/**
 * Todas as pessoas de exemplo, na ordem em que recebem id: os tres clientes
 * (1, 2, 3) e depois os dois fornecedores (4, 5).
 */
export const PESSOAS_DE_EXEMPLO: PessoaNova[] = [
  ...CLIENTES_DE_EXEMPLO,
  ...FORNECEDORES_DE_EXEMPLO,
];

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/clientes';
  // As telas integradas falam com esta API em memoria, sem back-end no teste.
  instalarApiFalsa(PESSOAS_DE_EXEMPLO);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
