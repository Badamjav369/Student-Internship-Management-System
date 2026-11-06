// Автомат тест (Playwright): дүр бүрийн ажлын урсгал (API + хөтөч) ба бүх дэлгэцийн шалгалт.
// Тест бүрийн өмнө демо өгөгдөлтэй локал серверийг шинээр (--reset) асаана.
// Бэлтгэл (нэг удаа): npm i --no-save playwright && npx playwright install chromium
// Ашиглах: node tests/run.mjs            — бүгд
//          node tests/run.mjs student-flow sup-views — сонгосон тест
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { LOG, restart, root, stop } from './server.mjs';

const dir = join(root, 'tests', 'e2e');
process.env.SERVER_LOG = LOG;
const pick = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /\.(c|m)js$/.test(f)).map((f) => f.slice(0, -4))
  .filter((f) => !pick.length || pick.includes(f)).sort((a, b) => a.includes('views') - b.includes('views') || a.localeCompare(b));

function run(file) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [join(dir, readdirSync(dir).find((x) => x.startsWith(`${file}.`)))], { cwd: root, env: { ...process.env, NODE_PATH: [process.env.NODE_PATH, join(root, 'node_modules')].filter(Boolean).join(delimiter) } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve({ code, out }));
  });
}

let failed = 0;
for (const f of files) {
  await restart();
  const t0 = Date.now();
  const { code, out } = await run(f);
  const lines = out.trim().split('\n');
  const oks = lines.filter((l) => /^ok\b|^OK\b/.test(l)).length;
  const last = lines[lines.length - 1] ?? '';
  const bad = code !== 0 || /FAILS [1-9]|FAILED|^FAIL\s/m.test(out);
  if (bad) failed += 1;
  console.log(`${bad ? '✗' : '✓'} ${f.padEnd(22)} ${String(oks).padStart(3)} шалгалт  ${((Date.now() - t0) / 1000).toFixed(0)} сек  ${last.slice(0, 60)}`);
  if (bad) console.log(lines.filter((l) => /^FAIL\s/.test(l)).slice(0, 10).join('\n'));
}
await stop();
console.log(failed ? `\n${failed} тест амжилтгүй.` : '\nБүх тест амжилттай.');
process.exit(failed ? 1 : 0);
