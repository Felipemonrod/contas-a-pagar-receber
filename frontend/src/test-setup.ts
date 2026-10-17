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
const CLIENTES_DE_EXEMPLO: PessoaNova[] = [
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

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/clientes';
  // As telas integradas falam com esta API em memoria, sem back-end no teste.
  instalarApiFalsa(CLIENTES_DE_EXEMPLO);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
