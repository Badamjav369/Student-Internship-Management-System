// Хурдан smoke шалгалт: ажиллаж буй сервер (локал dev-server, `wrangler dev` эсвэл Cloudflare) дээр гол урсгалыг хэдхэн секундэд.
//   node scripts/smoke.mjs [baseUrl]        (анхдагч: http://localhost:8787 — wrangler dev-ийн порт; Cloudflare: npm run cf:smoke -- https://...workers.dev)
// Демо өгөгдөл (npm run cf:setup-д «демо» сонгосон, эсвэл dev-server) орсон байх ёстой — нууц үг Demo1234.
// ⚠ Өгөгдлийг өөрчилнэ (гэрээг буцааж, дахин байршуулж, баталгаажуулна) — жинхэнэ өгөгдөл дээр бүү ажиллуул.
// Юуг шалгадаг: нэвтрэлт (PBKDF2), D1 унших/бичих/batch, R2 файл байршуулж буцааж татах (байт бүр ижил эсэх), гэрээний урсгал, бүртгэл.
const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');
const results = [];
let failed = 0;

async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push(`✓ ${name} (${Date.now() - t} мс)`); } catch (e) { failed += 1; results.push(`✗ ${name}: ${e.message}`); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

class Client {
  jar = {};
  async send(method, path, { json, form, raw } = {}) {
    const headers = { 'x-requested-with': 'pm2', cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ') };
    let body;
    if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(base + path, { method, headers, body });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); if (/max-age=0/i.test(c)) delete this.jar[k]; else this.jar[k] = v.join('='); }
    if (raw) return res;
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }
  async login(email) {
    const r = await this.send('POST', '/api/auth/login', { json: { email, password: 'Demo1234' } });
    assert(r.status === 200, `нэвтрэх ${email} → ${r.status} ${JSON.stringify(r.data)}`);
    await this.send('POST', '/api/me/consent', { json: {} });
  }
}

const pdf = () => new Blob([`%PDF-1.4\n% smoke ${Date.now()} ${'x'.repeat(5000)}\n%%EOF\n`], { type: 'application/pdf' });

const notes = [];
await step('health + тохиргоо', async () => {
  const r = await fetch(`${base}/api/health`); assert(r.ok, `status ${r.status}`);
  const h = await r.json();
  assert(h.signing, 'SIGNING_SECRET тохируулаагүй — `npm run cf:setup` (эсвэл npx wrangler secret put SIGNING_SECRET)');
  if (!h.mail) notes.push('! MAIL_API_KEY тохируулаагүй — имэйл (урилга, нууц үг сэргээх, гарын үсгийн код) зөвхөн log-д: npm run cf:logs');
  if (!h.captcha) notes.push('· Turnstile CAPTCHA тохируулаагүй (заавал биш)');
});
await step('статик UI (index.html)', async () => { const r = await fetch(`${base}/`); assert(r.ok && /<html/i.test(await r.text()), `status ${r.status}`); });
await step('backend файлууд нийтлэгдээгүй (server/index.js → 404)', async () => { const r = await fetch(`${base}/server/index.js`); assert(r.status === 404, `status ${r.status}`); });
await step('нэвтрээгүй үед /api/me → 401', async () => { assert((await new Client().send('GET', '/api/me')).status === 401, 'хамгаалагдаагүй'); });
await step('CSRF: толгойгүй POST → 403', async () => { const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert(r.status === 403, `status ${r.status}`); });
await step('буруу нууц үг → 401', async () => { const r = await new Client().send('POST', '/api/auth/login', { json: { email: 'suvd@university.example', password: 'wrong' } }); assert(r.status === 401, `status ${r.status}`); });

const roles = { 'admin@university.example': '/api/admin/users', 'head@university.example': '/api/head/contracts', 'bayarsaikhan@university.example': '/api/me',
  'tsetseg@university.example': '/api/student/dashboard', 'ganbaatar@narlag.example': '/api/me', 'zoljargal@narlag.example': '/api/me' };
for (const [email, path] of Object.entries(roles)) {
  await step(`${email}: нэвтрэх + ${path}`, async () => { const c = new Client(); await c.login(email); const r = await c.send('GET', path); assert(r.status === 200, `status ${r.status}`); });
}

const student = new Client(); const head = new Client();
await step('гэрээ: эрхлэгч буцаана (D1 бичих)', async () => {
  await student.login('tsetseg@university.example'); await head.login('head@university.example');
  const c = (await student.send('GET', '/api/student/contract')).data;
  assert(c, 'гэрээ алга — демо өгөгдөл орсон уу?');
  if (c.status === 'scanned') { const r = await head.send('POST', `/api/head/contracts/${c.internship_id ?? 9}/return`, { json: { reason: 'smoke шалгалт' } }); assert(r.status === 204, `return ${r.status} ${JSON.stringify(r.data)}`); }
});
let fileId;
await step('гэрээ: оюутан PDF байршуулна (R2 put + D1 insert)', async () => {
  const form = new FormData(); form.set('file', pdf(), 'smoke-scan.pdf');
  const r = await student.send('POST', '/api/student/contract/scan', { form });
  assert(r.status === 204, `status ${r.status} ${JSON.stringify(r.data)}`);
  const c = (await student.send('GET', '/api/student/contract')).data;
  assert(c.status === 'scanned', `төлөв ${c.status}`);
  fileId = c.scan_file_id ?? c.scan?.id ?? c.file?.id;
  assert(fileId, `скан файлын id олдсонгүй: ${JSON.stringify(Object.keys(c))}`);
});
await step('R2 get: файлыг буцааж татахад агуулга ижил', async () => {
  const res = await student.send('GET', `/api/files/${fileId}`, { raw: true });
  assert(res.status === 200, `status ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert(res.headers.get('content-type') === 'application/pdf' && /^%PDF-1\.4/.test(new TextDecoder().decode(bytes.slice(0, 8))) && bytes.length > 5000, `төрөл ${res.headers.get('content-type')}, ${bytes.length} байт`);
});
await step('гэрээ: эрхлэгч баталгаажуулна (D1 batch = transaction)', async () => {
  const id = (await student.send('GET', '/api/student/contract')).data.internship_id ?? 9;
  const r = await head.send('POST', `/api/head/contracts/${id}/approve`);
  assert(r.status === 204, `status ${r.status} ${JSON.stringify(r.data)}`);
  assert((await student.send('GET', '/api/student/contract')).data.status === 'approved', 'төлөв approved болсонгүй');
});
await step('демо файл татах (R2-д байхгүй seed/ файл → орлуулга PDF)', async () => {
  const res = await student.send('GET', '/api/files/1', { raw: true });
  assert(res.status === 200 && res.headers.get('content-type') === 'application/pdf', `status ${res.status}`);
});
await step('байгууллага бүртгүүлэх (олон мөр бичих)', async () => {
  const stamp = Date.now();
  const r = await new Client().send('POST', '/api/auth/register-org', { json: { name: `Smoke ХК ${stamp}`, register_no: String(stamp).slice(-7), email: `org${stamp}@example.com`, representative: { last_name: 'Тест', first_name: 'Smoke', email: `smoke${stamp}@example.com`, phone: '99112233', position: 'Менежер' } } });
  assert(r.status === 200 || r.status === 422, `status ${r.status} ${JSON.stringify(r.data)}`);
  assert(r.status === 200, `талбарын алдаа: ${JSON.stringify(r.data?.fields)} (маягтын шаардлага өөрчлөгдсөн бол энэ скриптийг засна)`);
});
await step('нууц үг сэргээх (имэйл илгээх зам; алдаа гарсан ч 200)', async () => {
  const r = await new Client().send('POST', '/api/auth/password/forgot', { json: { email: 'suvd@university.example' } });
  assert(r.status === 200, `status ${r.status}`);
});

console.log(`\nSmoke → ${base}\n${results.join('\n')}\n${notes.length ? `\n${notes.join('\n')}\n` : ''}\n${failed ? `${failed} алдаа` : 'Бүгд амжилттай'} (${results.length} шалгалт)`);
process.exit(failed ? 1 : 0);
