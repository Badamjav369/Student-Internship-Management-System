const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const B = 'http://localhost:5174';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const txt = () => page.evaluate(() => document.querySelector('.auth-main')?.innerText ?? '');
  await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(800);
  ok(await page.locator('.register-cta').count() === 1, 'login: register link');
  await page.screenshot({ path: 'reg-login.png' });
  await page.click('.register-cta'); await page.waitForTimeout(600);
  ok(/#\/register/.test(page.url()) && /Байгууллага бүртгүүлэх/.test(await txt()), 'register page opens');
  await page.screenshot({ path: 'reg-form.png', fullPage: true });
  await page.click('button[type=submit]'); await page.waitForTimeout(400);
  ok(await page.locator('[data-invalid]').count() >= 5, 'empty submit shows errors');
  await page.fill('[name=name]', 'Тест Технологи ХХК'); await page.fill('[name=register_no]', '1234567'); await page.fill('[name=field]', 'Мэдээллийн технологи');
  await page.fill('[name="representative.last_name"]', 'Бат'); await page.fill('[name="representative.first_name"]', 'Дорж'); await page.fill('[name="representative.email"]', 'Dorj.Bat@Testtech.example');
  await page.screenshot({ path: 'reg-filled.png', fullPage: true });
  await page.click('button[type=submit]'); await page.waitForTimeout(1200);
  ok(/Бүртгэл амжилттай/.test(await txt()), 'success state');
  await page.screenshot({ path: 'reg-done.png' });
  // давхар регистр
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
  await page.fill('[name=name]', 'Өөр'); await page.fill('[name=register_no]', '1234567');
  await page.fill('[name="representative.last_name"]', 'Б'); await page.fill('[name="representative.first_name"]', 'Д'); await page.fill('[name="representative.email"]', 'other@x.example');
  await page.click('button[type=submit]'); await page.waitForTimeout(900);
  ok(/регистрийн дугаартай байгууллага бүртгэлтэй/.test(await txt()), 'duplicate register_no error shown on field');
  const api = (p, m = 'GET', body) => page.evaluate(async ([p, m, b2]) => { const r = await fetch(p, { method: m, headers: { 'x-requested-with': 'pm2', 'content-type': 'application/json' }, body: b2 ? JSON.stringify(b2) : undefined }); const t = await r.text(); return [r.status, t ? JSON.parse(t) : null]; }, [p, m, body]);
  // бүртгэлтэй и-мэйл → ижил хариу, шинэ байгууллага үүсэхгүй
  const dup = await api('/api/auth/register-org', 'POST', { name: 'X ХХК', register_no: 'ABCDE99', representative: { last_name: 'A', first_name: 'B', email: 'admin@university.example' } });
  ok(dup[0] === 200, 'existing email → same 200 reply');
  const bad = await api('/api/auth/register-org', 'POST', { name: '', register_no: '1', representative: {} });
  ok(bad[0] === 422 && bad[1].fields.name && bad[1].fields['representative.email'], 'API validation 422 with fields');
  // шинэ төлөөлөгч: токен серверийн log-оос → нууц үг тохируулж нэвтрэх
  const fs = require('fs'); const log = fs.existsSync(process.env.SERVER_LOG) ? fs.readFileSync(process.env.SERVER_LOG, 'utf8') : '';
  const m = log.match(/password\?token=([A-Za-z0-9_-]+)/g); const tok = m && m[m.length - 1].split('=')[1];
  ok(!!tok, 'invite link logged by server');
  if (tok) {
    await page.goto(`${B}/#/password?token=${tok}`, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const pw = page.locator('input[type=password]'); const n = await pw.count();
    for (let i = 0; i < n; i++) await pw.nth(i).fill('Secret123');
    await page.click('button[type=submit]'); await page.waitForTimeout(1200);
    await page.fill('input[name=email]', 'dorj.bat@testtech.example'); await page.fill('input[name=password]', 'Secret123'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
    ok(/consent/.test(page.url()), 'rep logs in → consent');
  }
  await b.close();
  console.log('errs', JSON.stringify(errs)); console.log(fails ? `FAILS ${fails}` : 'ALL OK');
})();
