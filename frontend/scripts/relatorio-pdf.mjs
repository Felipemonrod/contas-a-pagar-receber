/**
 * Gera o PDF do relatorio a partir de docs/relatorio/relatorio.html.
 *
 * Usa o Chrome (ou o Edge) que ja esta instalado, em modo headless, com
 * --print-to-pdf. E o mesmo motor que imprime a pagina pelo Ctrl+P, entao o
 * PDF sai igual ao que se ve no navegador, respeitando as regras de @page e
 * as quebras de pagina do CSS.
 *
 * A alternativa seria instalar o Puppeteer, que baixa um Chromium so para
 * isso. Como o navegador ja existe na maquina, nao vale acrescentar ~300 MB
 * de dependencia a um projeto cujo proposito e outro.
 *
 * Uso: node scripts/relatorio-pdf.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Navegadores aceitos, na ordem de preferencia. */
const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const entrada = resolve('docs/relatorio/relatorio.html');
const saida = resolve('docs/relatorio/RELATORIO.pdf');

if (!existsSync(entrada)) {
  console.error(`Nao encontrei ${entrada}.`);
  process.exit(1);
}

const navegador = NAVEGADORES.find(caminho => existsSync(caminho));
if (!navegador) {
  console.error('Nao encontrei Chrome nem Edge instalado.');
  console.error('Abra docs/relatorio/relatorio.html e use Ctrl+P > Salvar como PDF.');
  process.exit(1);
}

// O Chrome recusa --print-to-pdf se ja houver uma instancia usando o perfil
// padrao, entao cada execucao recebe um perfil descartavel.
const perfil = mkdtempSync(join(tmpdir(), 'relatorio-'));

try {
  execFileSync(
    navegador,
    [
      '--headless',
      '--disable-gpu',
      `--user-data-dir=${perfil}`,
      '--no-pdf-header-footer',
      `--print-to-pdf=${saida}`,
      pathToFileURL(entrada).href,
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(perfil, { recursive: true, force: true });
}

if (!existsSync(saida)) {
  console.error('O navegador terminou, mas o PDF nao foi gerado.');
  process.exit(1);
}

console.log(`PDF gerado em ${saida}`);
