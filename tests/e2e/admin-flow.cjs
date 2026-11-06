const { chromium } = require('playwright');
const base = 'http://localhost:5174/#';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); } localStorage.setItem('pm2.consent', '2026-10-01T09:00:00.000Z'); localStorage.setItem('pm2.session', 'in'); localStorage.setItem('pm2.role', 'admin'); } catch (e) {} });
  await ctx.request.post('http://localhost:5174/api/auth/login', { data: { email: 'admin@university.example', password: 'Demo1234' }, headers: { 'x-requested-with': 'pm2' } });
  const page = await ctx.newPage(); const errs = [];
  let cur=''; page.on('pageerror', (e) => errs.push('pageerror [' + cur + '] ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,4).join('|')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::/.test(m.text())) errs.push('console ' + m.text()); });
  const go = async (p) => { await page.evaluate((x) => { location.hash = x; }, p); await page.waitForTimeout(400); };
  const text = () => page.locator('.main').innerText();
  const toastText = async () => (await page.locator('toast-region').innerText().catch(() => ''));
  let fails = 0;
  const step = async (name, fn) => { cur = name; try { const r = await fn(); if (r === false) throw new Error('assert'); console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + ' :: ' + e.message.split('\n')[0]); } };
  await page.goto(base + '/admin/home', { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await step('home todo', async () => (await text()).includes('2 оюутанд удирдагч'));
  await step('home → no-supervisor filter', async () => { await page.click('text=Удирдагч оноох'); await page.waitForTimeout(600); return (await text()).includes('2 оюутан') && !(await text()).includes('16 оюутан'); });
  await step('bulk assign', async () => {
    await page.click('button:has-text("Багцаар оноох")');
    const boxes = page.locator('.row-check'); await boxes.nth(0).check(); await boxes.nth(1).check();
    await page.click('.bulk-bar button:has-text("Оноох")'); await page.waitForTimeout(700);
    return (await text()).includes('Оюутан олдсонгүй') && (await toastText()).includes('2 оюутанд');
  });
  await step('home todo gone', async () => { await go('/admin/home'); return !(await text()).includes('удирдагч багш оноогоогүй'); });
  await step('add student', async () => {
    await go('/admin/semesters/2?tab=students'); await page.click('button:has-text("Оюутан нэмэх")'); await page.waitForTimeout(400);
    await page.locator('.pick-row input').first().check(); await page.click('.add-bar button:has-text("Нэмэх")'); await page.waitForTimeout(800);
    return (await text()).includes('17 оюутан');
  });
  await step('remove student', async () => {
    await page.locator('.row-card:has-text("Gazar") , .row-card:has(button:has-text("Хасах"))').first().locator('button:has-text("Хасах")').click();
    await page.waitForTimeout(300); await page.click('dialog button:has-text("Хасах")'); await page.waitForTimeout(800);
    return (await text()).includes('16 оюутан');
  });
  await step('students search', async () => { await page.fill('.students > form.search-card input', 'Тэмүүлэн'); await page.waitForTimeout(700); return (await text()).includes('1 оюутан'); });
  await step('internship decision change_supervisor', async () => {
    await go('/admin/internships/1'); await page.locator('.kind-card:has-text("Удирдагч солих")').click();
    await page.fill('textarea[name=reason]', 'Ачаалал тэнцвэржүүлэх'); await page.click('button:has-text("Шийдвэр бүртгэх")'); await page.waitForTimeout(800);
    return (await text()).includes('Өөрчлөлтийн түүх') && (await text()).includes('Ачаалал тэнцвэржүүлэх');
  });
  await step('internship direct placement', async () => {
    await go('/admin/internships/12'); await page.fill('textarea[name=reason]', 'Эрхлэгч зөвшөөрсөн'); await page.click('button:has-text("Шийдвэр бүртгэх")'); await page.waitForTimeout(800);
    return (await text()).includes('Гэрээ байгуулж буй');
  });
  await step('internship stop validation', async () => {
    await go('/admin/internships/10'); await page.locator('.kind-card:has-text("зогсоох")').click(); await page.click('button:has-text("Шийдвэр бүртгэх")'); await page.waitForTimeout(400);
    return (await text()).includes('Шалтгаанаа 5-аас');
  });
  await step('internship stop', async () => { await page.fill('textarea[name=reason]', 'Оюутан татгалзсан'); await page.click('button:has-text("Шийдвэр бүртгэх")'); await page.waitForTimeout(800); return (await text()).includes('Зогсоосон'); });
  await step('internship extend', async () => {
    await go('/admin/internships/1'); await page.locator('.kind-card:has-text("Хугацаа сунгах")').click(); await page.fill('input[name=end_date]', '2026-11-25');
    await page.fill('textarea[name=reason]', 'Ажил үргэлжилж байна'); await page.click('button:has-text("Шийдвэр бүртгэх")'); await page.waitForTimeout(800); return (await text()).includes('2026.11.25');
  });
  await step('create semester', async () => {
    await go('/admin/semesters'); await page.click('button:has-text("Улирал нэмэх")'); await page.fill('input[name=academic_year]', '27-28'); await page.click('button:has-text("Үүсгэх")'); await page.waitForTimeout(300);
    if (!(await text()).includes('Жишээ нь 2027-2028')) return false;
    await page.fill('input[name=academic_year]', '2027-2028'); await page.selectOption('select[name=season]', 'winter'); await page.click('button:has-text("Үүсгэх")'); await page.waitForTimeout(800);
    return (await text()).includes('2027-2028 оны өвлийн улирал') && (await text()).includes('Тохируулж буй');
  });
  await step('semester settings validation + save', async () => {
    await page.fill('input[name=work_from]', '2027-10-20'); await page.fill('input[name=work_to]', '2027-10-10'); await page.click('button:has-text("Хадгалах")'); await page.waitForTimeout(400);
    if (!(await text()).includes('Дуусах өдөр эхлэх өдрөөс өмнө')) return false;
    await page.fill('input[name=work_to]', '2027-11-20'); await page.click('button:has-text("Хадгалах")'); await page.waitForTimeout(700); return (await toastText()).includes('Тохиргоо хадгалагдлаа');
  });
  await step('activate blocked', async () => { await page.click('button:has-text("Идэвхжүүлэх")'); await page.waitForTimeout(300); await page.click('dialog button:has-text("Идэвхжүүлэх")'); await page.waitForTimeout(700); return (await toastText()).includes('Бүх хугацааг бөглөнө үү'); });
  await step('criteria add/edit/delete (draft)', async () => {
    await page.click('[role=tab]:has-text("Шалгуур")'); await page.waitForTimeout(200);
    const add = page.locator('.crit-row.add').first(); await add.locator('input[name=name]').fill('Нэмэлт шалгуур'); await add.locator('input[name=max_score]').fill('5'); await add.locator('button').click(); await page.waitForTimeout(800);
    if (!(await text()).includes('Нийт 105 / 100')) return false;
    await page.locator('.crit-row:has(input[value="Нэмэлт шалгуур"]) button[aria-label="Устгах"]').click(); await page.waitForTimeout(300); await page.click('dialog button:has-text("Устгах")'); await page.waitForTimeout(800);
    return (await text()).includes('Нийт 100 / 100') ;
  });
  await step('tab persisted after refresh', async () => (await page.locator('[role=tab][aria-selected=true]').innerText()).includes('Шалгуур'));
  await step('template add + delete', async () => {
    await page.click('[role=tab]:has-text("Загвар")'); await page.locator('input[type=file]').first().setInputFiles({ name: 'Удирдамж.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
    await page.click('.tab-panel:not([hidden]) form button:has-text("Нэмэх")'); await page.waitForTimeout(800); if (!(await text()).includes('Удирдамж.pdf')) return false;
    await page.locator('.row-card button:has-text("Устгах")').first().click(); await page.waitForTimeout(300); await page.click('dialog button:has-text("Устгах")'); await page.waitForTimeout(800); return !(await text()).includes('Удирдамж.pdf');
  });
  await step('delete semester', async () => { await page.click('.page-head button:has-text("Устгах")'); await page.waitForTimeout(300); await page.click('dialog button:has-text("Устгах")'); await page.waitForTimeout(800); return page.url().endsWith('/admin/semesters'); });
  console.log('errs', JSON.stringify(errs)); console.log('FAILS', fails);
  await b.close();
})();
