// Энгийн статик шалгалт (dependency-гүй): `npm run check` эсвэл `node scripts/check.mjs`.
// 1) JS файл бүр синтакс алдаагүй  2) import хийсэн файл бүр байгаа  3) CSS @import байгаа
// 4) !important, innerHTML ашиглаагүй  5) index.html-ийн холбоос байгаа.
// Энэ нь браузерт ажиллаж байгааг баталдаггүй — зөвхөн хамгийн энгийн алдааг хурдан барина.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const problems = [];
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (name === 'node_modules' || name.startsWith('.')) return [];
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const rel = (p) => relative(root, p).replaceAll('\\', '/');
const files = [...walk(join(root, 'src')), ...walk(join(root, 'server'))]; // UI ба backend
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));

for (const file of js) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) problems.push(`Синтакс: ${rel(file)}\n${check.stderr.trim()}`);
  const text = readFileSync(file, 'utf8');
  const specs = [...text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of specs) if (!existsSync(resolve(dirname(file), spec))) problems.push(`Олдсонгүй import: ${rel(file)} → ${spec}`);
  if (/\.innerHTML\s*=|insertAdjacentHTML/.test(text)) problems.push(`innerHTML ашигласан: ${rel(file)}`);
}
for (const file of css) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(/@import\s+url\(["']?(\.[^"')]+)["']?\)/g)) if (!existsSync(resolve(dirname(file), m[1]))) problems.push(`Олдсонгүй CSS import: ${rel(file)} → ${m[1]}`);
  if (/!important/.test(text)) problems.push(`!important ашигласан: ${rel(file)}`);
}
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:href|src)="(\.[^"]+)"/g)) if (!existsSync(resolve(root, m[1]))) problems.push(`index.html: олдсонгүй ${m[1]}`);

console.log(`Шалгасан: JS ${js.length}, CSS ${css.length}`);
if (problems.length) { console.error(`\nАлдаа ${problems.length}:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log('Алдаа олдсонгүй.');
