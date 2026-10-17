import { readFile, stat } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('src/assets.json', 'utf8'));
const references = Object.values(manifest.screens).flatMap(screen => [...screen.roots.map(root => root.asset), ...Object.values(screen.menu)]);
const unique = [...new Set(references)];
for (const file of unique) {
  const path = `public/assets/${file}`;
  if (!(await stat(path)).size) throw new Error(`Arquivo vazio: ${file}`);
  const root = (await readFile(path, 'utf8')).match(/<svg\b[^>]*>/)?.[0];
  if (!root) throw new Error(`SVG inválido: ${file}`);
  const width = Number(root.match(/\bwidth="([\d.]+)"/)?.[1]);
  const height = Number(root.match(/\bheight="([\d.]+)"/)?.[1]);
  if (width !== manifest.dimensions[file].width || height !== manifest.dimensions[file].height) throw new Error(`Dimensões divergentes: ${file}`);
}
for (const [route, screen] of Object.entries(manifest.screens)) {
  if (screen.roots.length !== 5 || Object.keys(screen.menu).length !== 12) throw new Error(`Mapeamento incompleto: ${route}`);
}
console.log(`${unique.length} SVGs locais verificados em ${Object.keys(manifest.screens).length} telas. Dimensões originais preservadas.`);
