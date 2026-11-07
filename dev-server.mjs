// Хамааралгүй (dependency-гүй) локал сервер: UI + backend (server/index.js) — Cloudflare дээрхтэй ижил код.
//   node dev-server.mjs [--reset]   → http://localhost:5173; SQLite (.data/local.sqlite), файл (.data/files)
//   Анх асаахад (эсвэл --reset) migration, демо өгөгдөл (scripts/demo.sql) автоматаар. Демо файлууд (seed/...) нь server/lib/files.js-ийн орлуулга.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT ?? 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const PUBLIC = /^\/(index\.html|favicon\.svg|src\/.*)?$/; // Cloudflare-д .assetsignore-той ижил: server/, migrations/... гаргахгүй

async function asset(request) {
  const url = new URL(request.url);
  let file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root) || !PUBLIC.test(url.pathname)) return new Response('Олдсонгүй (404)', { status: 404 });
  if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
  try { return new Response(await readFile(file), { headers: { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' } }); } catch { return new Response('Олдсонгүй (404)', { status: 404 }); }
}

const { d1, migrate, r2 } = await import('./server/local/bindings.js');
if (process.argv.includes('--reset')) await rm(join(root, '.data'), { recursive: true, force: true });
await mkdir(join(root, '.data/files'), { recursive: true });
const fresh = !existsSync(join(root, '.data/local.sqlite'));
const DB = d1(join(root, '.data/local.sqlite'));
const FILES = r2(join(root, '.data/files'));
await migrate(DB, join(root, 'migrations'));
if (fresh) {
  const { seedSql } = await import('./scripts/seed.mjs');
  DB.raw.exec(await seedSql());
  console.log('Демо өгөгдөл орлоо. Нууц үг бүгдэд: q123456 (admin@gmail.com гэх мэт).');
}
// MAIL_*, TURNSTILE_*, RATE_LIMIT, PASSWORD_ITERATIONS, SIGNING_SECRET орчны хувьсагчаар өгвөл локалд ч жинхэнэ (эсвэл туршилтын) имэйл үйлчилгээ рүү явна; үгүй бол консолд.
// FILES_DRIVER=d1 — файлыг R2-ийн оронд D1-д хадгална (Cloudflare дээр R2-гүй үеийн замыг туршихад).
const env = { DB, ...(process.env.FILES_DRIVER === 'd1' ? {} : { FILES }), ASSETS: { fetch: asset }, LOCAL_DEV: '1', ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(MAIL_|TURNSTILE_|RATE_LIMIT|PASSWORD_ITERATIONS|SIGNING_SECRET)/.test(k))) };
const worker = (await import('./server/index.js')).default;
const handler = (request) => worker.fetch(request, env);

createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(new URL(req.url, `http://${req.headers.host}`), { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    const response = await handler(request);
    const headers = Object.fromEntries(response.headers);
    if (response.headers.getSetCookie?.().length) headers['set-cookie'] = response.headers.getSetCookie();
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('Server error');
  }
}).listen(port, () => console.log(`Дадлагын нэгдсэн удирдлага → http://localhost:${port}`));
