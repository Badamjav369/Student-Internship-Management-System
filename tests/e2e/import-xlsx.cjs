// Excel (.xlsx) импорт (inline strings + shared strings хоёр хэлбэр): кирилл нэр, үсэг гэмтэхгүй; буруу и-мэйл, бүртгэлтэй хэрэглэгчийг ялгана; бүртгэхэд хэрэглэгч үүснэ.
const { request } = require('playwright');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const api = await request.newContext({ baseURL: 'http://localhost:5174', extraHTTPHeaders: { 'x-requested-with': 'pm2' } });
  ok((await api.post('/api/auth/login', { data: { email: 'admin@gmail.com', password: 'q123456' } })).ok(), 'admin login');
  const file = { name: 'students.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync(join(__dirname, '..', 'fixtures', 'students.xlsx')) };
  const dry = await api.post('/api/admin/users/import', { multipart: { file, dry: 'true' } });
  const d = await dry.json();
  ok(dry.ok() && d.total_rows === 4, `dry-run reads 4 rows (${d.total_rows})`);
  ok(d.created_users === 2 && d.existing_users === 1 && d.errors.length === 1, `2 new, 1 existing, 1 error (${JSON.stringify([d.created_users, d.existing_users, d.errors.length])})`);
  ok(d.errors[0]?.row === 4 && /И-мэйл буруу/.test(d.errors[0].message), 'bad e-mail reported on row 4');
  // Excel/LibreOffice-ийн хэлбэр: shared strings, шууд UTF-8
  const shared = { name: 'students-shared.xlsx', mimeType: file.mimeType, buffer: readFileSync(join(__dirname, '..', 'fixtures', 'students-shared.xlsx')) };
  const d2 = await (await api.post('/api/admin/users/import', { multipart: { file: shared, dry: 'true' } })).json();
  ok(d2.total_rows === 4 && d2.created_users === 2 && d2.existing_users === 1 && d2.errors.length === 1, `shared-strings xlsx parsed the same (${JSON.stringify([d2.total_rows, d2.created_users, d2.existing_users, d2.errors.length])})`);
  const run = await api.post('/api/admin/users/import', { multipart: { file, dry: 'false' } });
  ok(run.ok() && (await run.json()).created_users === 2, 'import creates 2 users');
  const list = await (await api.get('/api/admin/users?role=student')).text();
  ok(list.includes('Цэнгүүн') && list.includes('Үүрээнтуяа') && list.includes('Өлзийбат'), 'Cyrillic names (incl. Ө, Ү) stored intact');
  console.log(fails ? 'FAILS ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
