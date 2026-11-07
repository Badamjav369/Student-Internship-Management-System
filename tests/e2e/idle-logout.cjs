// 5 минут идэвхгүй бол системээс гарна: сервер (session дуусна, идэвхтэй үед сунгагдана) ба хөтөч (автоматаар гарч, нэвтрэх хуудас руу).
const { chromium, request } = require('playwright');
const { DatabaseSync } = require('node:sqlite');
const { join } = require('node:path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const H = { 'x-requested-with': 'pm2' };
const DB = join(__dirname, '..', '..', '.data', 'local.sqlite');
const exp = () => new DatabaseSync(DB, { readOnly: true }).prepare("SELECT expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = 'student1@gmail.com' ORDER BY s.rowid DESC LIMIT 1").get()?.expires_at;
(async () => {
  // --- сервер ---
  const api = await request.newContext({ baseURL: 'http://localhost:5174', extraHTTPHeaders: H });
  await api.post('/api/auth/login', { data: { email: 'student1@gmail.com', password: 'q123456' } });
  const left = (Date.parse(exp()) - Date.now()) / 60000;
  ok(left > 4 && left <= 5.01, `session lasts 5 min after login (${left.toFixed(2)})`);
  ok((await api.get('/api/me')).ok(), 'active session works');
  const rw = new DatabaseSync(DB); rw.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash IS NOT NULL").run(new Date(Date.now() - 1000).toISOString()); rw.close();
  ok((await api.get('/api/me')).status() === 401, 'session idle > 5 min → 401');
  await api.post('/api/auth/login', { data: { email: 'student1@gmail.com', password: 'q123456' } });
  const rw2 = new DatabaseSync(DB); rw2.prepare("UPDATE sessions SET expires_at = ?").run(new Date(Date.now() + 30 * 1000).toISOString()); rw2.close();
  ok((await api.get('/api/me')).ok(), 'request with 30 s left still ok');
  ok((Date.parse(exp()) - Date.now()) / 60000 > 4, 'activity extends session back to ~5 min');

  // --- хөтөч ---
  const b = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 300 : 0 });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto('http://localhost:5174/#/login', { waitUntil: 'load' });
  await page.fill('input[name=email]', 'student1@gmail.com'); await page.fill('input[name=password]', 'q123456');
  await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  ok(/#\/student\//.test(page.url()), 'signed in → student page');
  await page.clock.fastForward('04:00'); await page.mouse.move(200, 200); await page.mouse.down(); await page.mouse.up(); await page.clock.fastForward('02:00');
  ok(/#\/student\//.test(page.url()), 'activity at 4 min keeps the session (6 min total)');
  await page.clock.fastForward('06:00'); await page.waitForTimeout(800);
  ok(/#\/login/.test(page.url()), '5+ min idle → login page');
  ok(await page.locator('.toast').filter({ hasText: '5 минут идэвхгүй' }).count() > 0, 'idle message shown');
  const signed = await page.evaluate(() => localStorage.getItem('pm2.session'));
  ok(signed === null, 'local sign-in flag cleared');
  const me = await ctx.request.get('http://localhost:5174/api/me', { headers: H });
  ok(me.status() === 401, 'server session deleted on idle logout');
  await b.close();
  console.log(fails ? 'FAILS ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
