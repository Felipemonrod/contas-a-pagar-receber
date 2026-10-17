import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
beforeEach(() => { localStorage.clear(); window.location.hash = '#/clientes'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
