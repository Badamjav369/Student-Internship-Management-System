const { chromium } = require('playwright');
const fs = require('fs');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  const text = () => page.locator('body').innerText();
  const go = async (p) => { await page.evaluate((x) => { location.hash = x; }, p); await page.waitForTimeout(700); };
  await page.goto('http://localhost:5174/#/admin/home', { waitUntil: 'load' }); await page.waitForTimeout(1200);
  ok(page.url().includes('#/login'), 'not signed in → login');
  ok(await page.locator('demo-panel').count() === 0, 'no demo panel in backend mode');
  await page.fill('input[name=email]', 'admin@gmail.com'); await page.fill('input[name=password]', 'wrong-pass1'); await page.click('button[type=submit]'); await page.waitForTimeout(900);
  ok(/И-мэйл эсвэл нууц үг буруу/.test(await text()), 'wrong password message');
  await page.fill('input[name=password]', 'q123456'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  ok(page.url().includes('/admin/home') && /Сайн байна уу, Тунгалаг/.test(await text()), 'login → admin home');
  // expire report
  await go('/admin/reports/5');
  await page.fill('textarea[name=reason]', 'Оюутан хугацаанд хариу өгөөгүй'); await page.click('button:has-text("Хугацаа хэтэрсэнд тооцох")'); await page.waitForTimeout(300); await page.click('dialog button:has-text("Тооцох")'); await page.waitForTimeout(1000);
  ok(/Хугацаа хэтэрсэн/.test(await text()) && !/Оюутны өмнөөс илгээх/.test(await text()), 'report expired');
  await go('/admin/internships/5');
  ok(/Хангалтгүй \(0\)/.test(await text()) || /0 — хангалтгүй/.test(await text()), 'internship 5 failed grade');
  // notifications
  await go('/admin/notifications');
  ok(/Комисс №1-ийн хуваарь/.test(await text()), 'notifications from backend');
  await page.click('.main .notice-row >> nth=0'); await page.waitForTimeout(900);
  ok(page.url().includes('/admin/internships/12'), 'notice click → link');
  // profile phone + password change
  await go('/admin/profile');
  ok(/admin@gmail.com/.test(await text()), 'profile shows email');
  // file download (template file has no R2 object in seed → 404 handled), uploaded one works
  const r = await page.evaluate(async () => (await fetch('/api/admin/semesters/2')).json());
  ok(r.templates.length >= 3 && r.criteria.length === 8, 'semester 2 api');
  // forbidden for non-admin: login as student
  await page.click('user-menu button').catch(() => {}); await page.waitForTimeout(300);
  await page.click('text=Гарах').catch(() => {}); await page.waitForTimeout(1200);
  ok(page.url().includes('#/login'), 'logout');
  const st = await page.evaluate(async () => { const r1 = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'pm2' }, body: JSON.stringify({ email: 'student1@gmail.com', password: 'q123456' }) }); const r2 = await fetch('/api/admin/semesters/2/todo'); const r3 = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); return [r1.status, r2.status, r3.status]; });
  ok(st[0] === 200 && st[1] === 403 && st[2] === 403, `student cannot use admin api / csrf header required ${st}`);
  // invite + password reset by token from server log
  const log = fs.readFileSync(process.env.SERVER_LOG, 'utf8');
  console.log('mail lines', (log.match(/\[mail\]/g) || []).length);
  // forgot → token → reset → login with new password
  await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } }); localStorage.clear(); });
  await page.goto('http://localhost:5174/#/forgot-password'); await page.waitForTimeout(1000);
  await page.fill('input[name=email]', 'student2@gmail.com'); await page.click('button[type=submit]'); await page.waitForTimeout(900);
  const token = /token=([\w-]+)/.exec(fs.readFileSync(process.env.SERVER_LOG, 'utf8').split('[mail]').pop())?.[1];
  ok(Boolean(token), 'reset token mailed (log)');
  await page.goto(`http://localhost:5174/#/password?token=${token}`); await page.waitForTimeout(1000);
  const pw = page.locator('input[type=password]'); const n = await pw.count();
  for (let k = 0; k < n; k += 1) await pw.nth(k).fill('NewPass123');
  await page.click('button[type=submit]'); await page.waitForTimeout(1000);
  const login2 = await page.evaluate(async () => (await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'pm2' }, body: JSON.stringify({ email: 'student2@gmail.com', password: 'NewPass123' }) })).status);
  ok(login2 === 200, 'login with reset password');
  console.log('errs', JSON.stringify(errs)); console.log(fails ? `FAILS ${fails}` : 'ALL OK');
  await b.close();
})();
