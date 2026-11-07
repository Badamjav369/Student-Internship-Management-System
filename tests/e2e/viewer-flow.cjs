const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const B = 'http://localhost:5174';
(async () => {
  const b = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 300 : 0 }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::|status of 4\d\d/.test(m.text())) errs.push('console ' + m.text()); });
  // 5 хуудастай PDF
  const pp = await ctx.newPage();
  await pp.setContent([1,2,3,4,5,6,7,8,9].map((n) => `<div style="page-break-after:always;font:40px sans-serif">Хуудас ${n}<p>Гэрээний бичиг баримт ${n}</p>${n === 6 ? '<p>Нарлаг Софт ХХК</p>' : ''}</div>`).join(''));
  const pdf = await pp.pdf({ format: 'A4' }); await pp.close();
  const txt = () => page.evaluate(() => document.querySelector('.main')?.innerText ?? '');
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(900); };
  const as = async (email) => {
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } }); localStorage.clear(); });
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(700);
    await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'q123456'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  };
  await as('head@gmail.com');
  const rr = await page.evaluate(async () => (await fetch('/api/head/contracts/9/return', { method: 'POST', headers: { 'x-requested-with': 'pm2', 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'Дахин' }) })).status);
  ok(rr === 204 || rr === 200, 'head returns contract');
  await as('student9@gmail.com');
  await go('/student/contract');
  await page.locator('.main label.kind-card', { hasText: 'Цаасан' }).click(); await page.locator('.main button', { hasText: 'Үргэлжлүүлэх' }).click(); await page.waitForTimeout(1000);
  // PDF биш файл татгалзагдана
  await page.locator('.main input[name=file]').setInputFiles({ name: 'scan.png', mimeType: 'image/png', buffer: Buffer.from('x') });
  await page.locator('.main button', { hasText: 'Скан байршуулах' }).click(); await page.waitForTimeout(600);
  ok(/Зөвхөн PDF/.test(await txt()) || /PDF/.test(await txt()), 'png scan rejected (PDF only)');
  const r = await page.evaluate(async () => { const fd = new FormData(); fd.append('file', new File(['x'], 'a.docx')); return (await fetch('/api/student/contract/scan', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd })).status; });
  ok(r === 422, 'API: docx → 422');
  await page.locator('.main input[name=file]').setInputFiles({ name: 'gereenii_scan.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.locator('.main button', { hasText: 'Скан байршуулах' }).click(); await page.waitForTimeout(1500);
  ok(await page.locator('.doc-tile button', { hasText: 'Үзэх' }).count() === 1, 'scan tile has Үзэх button');
  await page.locator('.doc-tile button', { hasText: 'Үзэх' }).click(); await page.waitForTimeout(2500);
  const jv = () => page.locator('.viewer-jump').inputValue();
  const cvs = () => page.locator('.book .pg .viewer-canvas').count();
  ok(await page.locator('dialog.viewer[open]').count() === 1, 'viewer opens');
  ok(await jv() === '1' && await cvs() === 1, 'cover: page 1 alone');
  await page.screenshot({ path: 'viewer-1.png' });
  await page.locator('button[aria-label="Дараагийн хуудас"]').click(); await page.waitForTimeout(250);
  ok(await page.locator('.leaf').count() === 1, 'page-turn leaf animating');
  await page.screenshot({ path: 'viewer-mid.png' });
  await page.waitForTimeout(900);
  ok(await jv() === '2–3' && await cvs() === 2 && await page.locator('.leaf').count() === 0, 'spread 2–3 (two pages)');
  await page.screenshot({ path: 'viewer-2.png' });
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1100);
  ok(await jv() === '4–5', 'key → 4–5');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1100);
  ok(await jv() === '2–3', 'back → 2–3 (backward flip)');
  await page.locator('.viewer-jump').fill('8'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  ok(await jv() === '8–9', 'jump to page 8 → 8–9');
  ok(await page.locator('button[aria-label="Дараагийн хуудас"]').isDisabled(), 'last spread: next disabled');
  await page.keyboard.press('End'); await page.waitForTimeout(600);
  await page.keyboard.press('Home'); await page.waitForTimeout(900);
  ok(await jv() === '1', 'Home → cover');
  // слайдер
  await page.locator('.viewer-slider').fill('6'); await page.waitForTimeout(1200);
  ok(await jv() === '6–7', 'slider → 6–7');
  // хайлт
  await page.keyboard.press('Control+f'); await page.waitForTimeout(300);
  await page.fill('.viewer-q', 'Нарлаг'); await page.waitForTimeout(2500);
  ok(/1 \/ 1/.test(await page.locator('.viewer-qinfo').innerText()), 'search: 1 match');
  ok(await page.locator('.hit.now').count() === 1, 'match highlighted');
  await page.screenshot({ path: 'viewer-search.png' });
  await page.fill('.viewer-q', 'Гэрээний'); await page.waitForTimeout(2500);
  ok(/1 \/ 9/.test(await page.locator('.viewer-qinfo').innerText()), 'search: 9 matches');
  await page.locator('button[aria-label="Дараагийн тохиролт"]').click(); await page.waitForTimeout(1200);
  ok(/2 \/ 9/.test(await page.locator('.viewer-qinfo').innerText()), 'next match 2 / 9');
  await page.fill('.viewer-q', 'zzzz'); await page.waitForTimeout(800);
  ok(/Олдсонгүй/.test(await page.locator('.viewer-qinfo').innerText()), 'no match message');
  await page.click('button[aria-label="Хайлт хаах"]'); await page.waitForTimeout(300);
  // бүтэн дэлгэц
  const before = await page.locator('.book').boundingBox();
  await page.click('button[aria-label^="Бүтэн дэлгэц"]'); await page.waitForTimeout(1500);
  ok(await page.locator('dialog.viewer.full').count() === 1, 'fullscreen class on');
  const after = await page.locator('.book').boundingBox(); const vw = await page.evaluate(() => [innerWidth, innerHeight]);
  ok(after.height > before.height && after.height >= vw[1] - 40, `fullscreen page fills screen (${Math.round(before.height)} → ${Math.round(after.height)} of ${vw[1]})`);
  await page.screenshot({ path: 'viewer-full.png' });
  await page.waitForTimeout(3200);
  ok(await page.locator('dialog.viewer.full.idle').count() === 1, 'chrome auto-hides when idle');
  await page.mouse.move(300, 300); await page.waitForTimeout(200);
  ok(await page.locator('dialog.viewer.full.idle').count() === 0, 'chrome returns on mouse move');
  await page.keyboard.press('f'); await page.waitForTimeout(1200);
  ok(await page.locator('dialog.viewer.full').count() === 0, 'F exits fullscreen');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.locator('dialog.viewer').count() === 0, 'Esc closes viewer');
  // эрхлэгч харж чадна
  await as('head@gmail.com'); await go('/head/contracts/9'); 
  await page.locator('.doc-tile button', { hasText: 'Үзэх' }).first().click(); await page.waitForTimeout(2500);
  ok(await page.locator('.viewer-canvas').count() >= 1, 'head views scan');
  await page.keyboard.press('Escape');
  // эрхгүй хүн
  await as('org1@gmail.com');
  const st = await page.evaluate(async () => (await fetch('/api/files/37')).status);
  ok(st === 404, 'org_rep cannot read other student file');
  // профайл
  await as('head@gmail.com'); await go('/head/profile'); const t = await txt();
  ok(!/Оюутны код|Хөтөлбөр/.test(t) && /Тэнхмийн эрхлэгч/.test(t), 'head profile: no student fields');
  await as('mentor1@gmail.com'); await go('/mentor/profile'); const t2 = await txt();
  ok(/Байгууллага/.test(t2) && /Нарлаг/.test(t2) && !/Оюутны код/.test(t2), 'mentor profile: organization, no student fields');
  await as('student1@gmail.com'); await go('/student/profile');
  ok(/Оюутны код/.test(await txt()), 'student profile: student code');
  await b.close();
  console.log('errs', JSON.stringify(errs)); console.log(fails ? `FAILS ${fails}` : 'ALL OK');
})();
