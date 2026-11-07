const { chromium } = require('playwright');
const base = 'http://localhost:5174/#';
(async () => {
  const b = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 300 : 0 });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); } localStorage.setItem('pm2.consent', '2026-10-01T09:00:00.000Z'); localStorage.setItem('pm2.session', 'in'); localStorage.setItem('pm2.role', 'admin'); } catch (e) {} });
  await ctx.request.post('http://localhost:5174/api/auth/login', { data: { email: 'admin@gmail.com', password: 'q123456' }, headers: { 'x-requested-with': 'pm2' } });
  const page = await ctx.newPage(); const errs = []; let cur = '';
  page.on('pageerror', (e) => errs.push('pageerror [' + cur + '] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::/.test(m.text())) errs.push('console [' + cur + '] ' + m.text()); });
  const go = async (p) => { await page.evaluate((x) => { location.hash = x; }, p); await page.waitForTimeout(450); };
  const text = () => page.locator('.main').innerText();
  const toastText = async () => (await page.locator('toast-region').innerText().catch(() => ''));
  let fails = 0;
  const step = async (name, fn) => { cur = name; try { const r = await fn(); if (r === false) throw new Error('assert'); console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + ' :: ' + e.message.split('\n')[0]); } };
  const confirm = async (label) => { await page.waitForTimeout(250); await page.click(`dialog button:has-text("${label}")`); await page.waitForTimeout(800); };
  await page.goto(base + '/admin/users', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await step('users filter role=supervisor', async () => { await page.click('.chip-row >> nth=0 >> text=Удирдагч багш'); await page.waitForTimeout(600); const t = await text(); return t.includes('Баярсайхан') && !t.includes('Тэмүүлэн') && t.includes('5 хэрэглэгч'); });
  await step('users filter status=disabled', async () => { await page.click('.chip-row >> nth=1 >> text=Идэвхгүй'); await page.waitForTimeout(600); return (await text()).includes('1 хэрэглэгч') ; });
  await step('users search', async () => { await page.click('.chip-row >> nth=1 >> text=Бүх төлөв'); await page.click('.chip-row >> nth=0 >> text=Бүгд'); await page.fill('input[type=search]', 'org1'); await page.waitForTimeout(700); return (await text()).includes('1 хэрэглэгч'); });
  await step('user-new validation', async () => { await go('/admin/users/new'); await page.click('button:has-text("Нэмэх")'); await page.waitForTimeout(300); const t = await text(); return t.includes('Овог бичнэ үү') && t.includes('И-мэйл хаяг буруу') && t.includes('Оюутны код бичнэ үү'); });
  await step('user-new duplicate email', async () => { await page.fill('input[name=last_name]', 'Тест'); await page.fill('input[name=first_name]', 'Хэрэглэгч'); await page.fill('input[name=email]', 'student2@gmail.com'); await page.fill('input[name=student_code]', 'B230000099'); await page.click('button:has-text("Нэмэх")'); await page.waitForTimeout(600); return (await text()).includes('и-мэйл бүртгэлтэй'); });
  await step('user-new ok', async () => { await page.fill('input[name=email]', 'test.user@gmail.com'); await page.click('button:has-text("Нэмэх")'); await page.waitForTimeout(900); return (await text()).includes('Тест Хэрэглэгч') && (await text()).includes('Урилга илгээсэн'); });
  await step('user roles edit', async () => {
    await page.locator('.role-check:has-text("Удирдагч багш") input').check(); await page.locator('.role-check:has-text("2026-2027 оны өвлийн") input').check();
    await page.click('button:has-text("Хадгалах")'); await page.waitForTimeout(800); await go('/admin/users'); await page.fill('input[type=search]', 'test.user'); await page.waitForTimeout(700);
    const t = await text(); return t.includes('Удирдагч багш') && t.includes('Комиссын гишүүн · 2026-2027');
  });
  await step('user disable/enable', async () => {
    await page.click('.row-card a'); await page.waitForTimeout(500);
    await page.click('button:has-text("Идэвхгүй болгох")'); await confirm('Идэвхгүй болгох'); if (!(await text()).includes('Идэвхгүй')) return false;
    await page.click('button:has-text("Идэвхжүүлэх")'); await page.waitForTimeout(800); return (await text()).includes('Урилга илгээсэн');
  });
  await step('user delete', async () => { await page.click('.profile-head button.danger'); await confirm('Устгах'); return page.url().endsWith('/admin/users'); });
  await step('user delete blocked (active student)', async () => { await go('/admin/users/1'); await page.click('.profile-head button.danger'); await confirm('Устгах'); return (await toastText()).includes('Дуусаагүй дадлагатай'); });
  await step('import invalid file', async () => { await go('/admin/users/import'); await page.locator('input[type=file]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }); await page.click('button:has-text("Шалгах")'); await page.waitForTimeout(300); return (await text()).includes('CSV эсвэл Excel'); });
  await step('import dry-run csv', async () => {
    const csv = 'Код,Овог,Нэр,И-мэйл,Хөтөлбөр,Утас\nB230000010,Дорж,Ану,anu.d@gmail.com,Программ хангамж,99001122\nB221910123,Бат,Тэмүүлэн,student1@gmail.com,,\nB230000012,Бат,Сараа,bad-email,,\n';
    await page.locator('input[type=file]').setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) }); await page.click('button:has-text("Шалгах")'); await page.waitForTimeout(700);
    const t = await text(); return t.includes('И-мэйл буруу') && t.includes('Бүртгэлтэй') && (await page.locator('button:has-text("Бүртгэх")').isVisible());
  });
  await step('import run', async () => { await page.click('button:has-text("Бүртгэх")'); await page.waitForTimeout(1000); const t = await text(); return page.url().includes('/admin/users?role=student') && t.includes('Дорж Ану'); });
  await step('organizations list/search', async () => { await go('/admin/organizations'); const t = await text(); if (!t.includes('8 байгууллага')) return false; await page.fill('input[type=search]', 'zzzz'); await page.waitForTimeout(700); return (await text()).includes('Байгууллага олдсонгүй'); });
  await step('organization edit', async () => {
    await go('/admin/organizations/1'); await page.fill('input[name=name]', 'Шинэ нэр ХХК'); await page.fill('input[name=email]', 'bad'); await page.click('form button:has-text("Хадгалах")'); await page.waitForTimeout(300);
    if (!(await text()).includes('И-мэйл хаяг буруу')) return false;
    await page.fill('input[name=email]', 'info@new.example'); await page.click('form button:has-text("Хадгалах")'); await page.waitForTimeout(800); return (await text()).includes('Шинэ нэр ХХК') && (await page.inputValue('input[name=email]')) === 'info@new.example';
  });
  await step('organization delete blocked', async () => { await page.click('form button.danger'); await confirm('Устгах'); return (await toastText()).includes('Дуусаагүй дадлагатай'); });
  await step('committee create', async () => { await go('/admin/committees'); await page.click('button:has-text("Комисс үүсгэх")'); await page.fill('input[name=name]', 'Комисс №2'); await page.click('form button:has-text("Үүсгэх")'); await page.waitForTimeout(900); return (await text()).includes('Комисс №2') && (await text()).includes('Нийтлээгүй'); });
  await step('committee publish blocked', async () => { await page.click('.page-head button:has-text("Нийтлэх")'); await confirm('Нийтлэх'); return (await toastText()).includes('Хамгаалах өдрийг тогтооно уу'); });
  await step('committee settings save', async () => {
    await page.fill('input[name=defense_date]', '2026-12-09'); await page.fill('input[name=start_time]', '09:00'); await page.fill('input[name=location]', '3-р байр 101');
    await page.locator('.member-row:has-text("Баярсайхан") input[type=checkbox]').check(); await page.locator('.member-row:has-text("Баярсайхан") input[type=radio]').check();
    await page.click('form button:has-text("Хадгалах")'); await page.waitForTimeout(800); return (await toastText()).includes('Тохиргоо хадгалагдлаа') && (await page.locator('input[name=location]').inputValue()) === '3-р байр 101';
  });
  await step('committee slots add/save', async () => {
    await page.click('button:has-text("Нэмэх")'); await page.waitForTimeout(200); await page.click('button:has-text("Нэмэх")'); await page.click('button:has-text("Хуваарь хадгалах")'); await page.waitForTimeout(800);
    const n = await page.locator('.slot-row').count(); return n === 2 && (await page.locator('.slot-time').nth(1).inputValue()) === '09:40';
  });
  await step('committee slot reorder', async () => { await page.locator('.slot-row').nth(1).locator('button[aria-label="Дээш"]').click(); return (await page.locator('.slot-time').nth(0).inputValue()) === '09:40'; });
  await step('committee publish', async () => { await page.click('button:has-text("Хуваарь хадгалах")'); await page.waitForTimeout(700); await page.click('.page-head button:has-text("Нийтлэх")'); await confirm('Нийтлэх'); return (await text()).includes('Нийтэлсэн'); });
  await step('committee delete', async () => { await page.click('.page-head button:has-text("Устгах")'); await confirm('Устгах'); return page.url().endsWith('/admin/committees'); });
  await step('reports tabs', async () => { await go('/admin/reports'); const t = await text(); if (!t.includes('Дашдорж')) return false; await page.click('.filter-chip:has-text("Хүлээн авсан")'); await page.waitForTimeout(600); const tt = await text(); console.log('  [reports]', (tt.match(/\d+ тайлан/)||[])[0], tt.includes('Дашдорж')); return tt.includes('6 тайлан'); });
  await step('report proxy invalid', async () => { await go('/admin/reports/5'); await page.click('button:has-text("Оюутны өмнөөс илгээх")'); await page.waitForTimeout(300); return (await text()).includes('Файл сонгоно уу'); });
  await step('report proxy ok', async () => {
    const files = page.locator('input[type=file]'); await files.nth(0).setInputFiles({ name: 'tailan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') }); await files.nth(1).setInputFiles({ name: 'tod.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
    await page.click('button:has-text("Оюутны өмнөөс илгээх")'); await page.waitForTimeout(900); const t = await text(); return t.includes('Хүлээн авсан') && !t.includes('Хугацаа хэтэрсэн\nШалтгаан');
  });
  console.log('errs', JSON.stringify(errs)); console.log('FAILS', fails);
  await b.close();
})();
