const { chromium } = require('playwright');
const { execSync } = require('child_process');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::/.test(m.text())) errs.push('console ' + m.text()); });
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(800); };
  const as = async (email) => {
    await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } }); localStorage.clear(); });
    await page.goto('http://localhost:5174/#/login', { waitUntil: 'load' }); await page.waitForTimeout(800);
    await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'q123456'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  };
  const txt = () => page.evaluate(() => document.querySelector('.main')?.innerText ?? '');
  const confirm = async (name) => { await page.locator('dialog.confirm button', { hasText: name }).click(); await page.waitForTimeout(500); };

  // --- нэвтрэх: supervisor@ → удирдагч багш
  await page.goto('http://localhost:5174/#/login', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/#/login', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.fill('input[name=email]', 'supervisor1@gmail.com');
  await page.fill('input[name=password]', 'q123456');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1500);
  if (await page.locator('input[name=consent], input[type=checkbox]').count()) { await page.check('input[type=checkbox]'); await page.click('button[type=submit]'); await page.waitForTimeout(600); }
  ok(/#\/supervisor\/home/.test(await page.evaluate(() => location.hash)), 'login → /supervisor/home');
  let t = await txt();
  ok(/Хийх ажил/.test(t) && !/үе шат/.test(t), 'home: todo, no stage count');
  ok(await page.locator('.hero-count').count() === 0, 'home: no hero-count');
  const nav = await page.locator('.sidebar a, nav a').allInnerTexts();
  ok(['Миний оюутнууд', 'Ажлын төлөвлөгөө', 'Оноо, эцсийн дүн', 'Дүнгийн хуудас'].every((x) => nav.join('|').includes(x)), 'nav items');

  // --- Students list: search + chips
  await go('/supervisor/students');
  ok((await page.locator('.row-card').count()) === 8, 'students: 8 rows');
  await page.fill('input[name=q]', 'Саруул'); await page.waitForTimeout(450);
  ok((await page.locator('.row-card').count()) === 1, 'students: search 1');
  await page.fill('input[name=q]', ''); await page.waitForTimeout(450);
  await page.locator('.filter-chip', { hasText: 'Тайлан өгөх шатанд' }).click();
  ok((await page.locator('.row-card').count()) === 2, 'students: chip filter 2');
  await go('/supervisor/students/999');
  ok(/олдсонгүй/i.test(await txt()), 'students/999 missing state');

  // --- Reports: revision requires comment
  await go('/supervisor/reports');
  ok(/Хянах/.test(await txt()) && (await page.locator('.row-card').count()) === 1, 'reports: default chip = submitted (1)');
  await go('/supervisor/reports/6');
  await page.locator('.main button', { hasText: 'Засвар шаардах' }).click(); await page.waitForTimeout(300);
  ok(/засахыг бичнэ үү/.test(await txt()), 'report: revision without comment → error');
  await page.fill('textarea[name=comment]', 'Дүгнэлт хэсгийг өргөтгөнө үү.');
  await page.locator('.main button', { hasText: 'Засвар шаардах' }).click(); await page.waitForTimeout(600);
  t = await txt();
  ok(/Засвар шаардсан/.test(t) && /Дүгнэлт хэсгийг/.test(t) && !(await page.locator('.main button', { hasText: 'Хүлээн авах' }).count()), 'report: → revision, decision form gone');
  await go('/supervisor/home');
  ok(!/Э\. Уянга: тайлан хянах/.test(await txt()), 'home todo: report item gone');
  // reset, accept
  execSync('node tests/server.mjs restart'); await as('supervisor1@gmail.com');
  await go('/supervisor/reports/6');
  await page.locator('.main button', { hasText: 'Хүлээн авах' }).click(); await confirm('Хүлээн авах');
  t = await txt();
  ok(/Хүлээн авсан/.test(t) && /хамгаалалтад бэлэн/i.test(t), 'report: accepted');
  await go('/supervisor/students/6');
  ok(/Хамгаалалтад бэлэн/.test(await txt()), 'student 6 status → ready');

  // --- Scores: org approve (7)
  await go('/supervisor/scores/7');
  await page.locator('.main button', { hasText: 'Буцаах' }).click(); await page.waitForTimeout(300);
  ok(/Шалтгаанаа бичнэ үү/.test(await txt()), 'score: return w/o reason → error');
  await page.locator('.main button', { hasText: 'Батлах' }).click(); await confirm('Батлах');
  t = await txt();
  ok(/Баталгаажсан/.test(t) && !/Тамгатай тодорхойлолт/.test(t), 'score 7: org approved');
  // chain on 2: confirm → finalize → sisi
  await go('/supervisor/scores/2');
  await page.locator('.main button', { hasText: 'Комиссын оноог баталгаажуулах' }).click(); await confirm('Комиссын оноог баталгаажуулах');
  ok(await page.locator('.main button', { hasText: 'Эцсийн дүн гаргах' }).count() === 1, 'score 2: confirm → finalize available');
  await page.locator('.main button', { hasText: 'Эцсийн дүн гаргах' }).click(); await confirm('Эцсийн дүн гаргах');
  t = await txt();
  ok(/Эцсийн дүн гарсан/.test(t) && /92\.5/.test(t) && await page.locator('.main button', { hasText: 'СИСИ-д оруулсан' }).count() === 1, 'score 2: finalized 92.5, SISI available');
  await page.locator('.main button', { hasText: 'СИСИ-д оруулсан' }).click(); await confirm('СИСИ-д оруулсан');
  ok(/Дүн СИСИ-д орсон/.test(await txt()), 'score 2: closed');
  await go('/supervisor/students/2');
  ok(/Дүн СИСИ-д орсон/.test(await txt()), 'student 2 → completed');
  // mark on 4 (ready)
  await go('/supervisor/scores/4');
  await page.locator('.main button', { hasText: 'Тэмдэглэх' }).click(); await page.waitForTimeout(300);
  ok(/Шалтгаанаа бичнэ үү/.test(await txt()), 'score 4: mark w/o reason → error');
  await page.selectOption('select[name=mark]', 'W'); await page.fill('textarea[name=reason]', 'Өвчтэй байсан.');
  await page.locator('.main button', { hasText: 'Тэмдэглэх' }).click(); await page.waitForTimeout(600);
  ok(await page.locator('.main button', { hasText: 'Эцсийн дүн гаргах' }).count() === 1, 'score 4: marked → finalize');
  await page.locator('.main button', { hasText: 'Эцсийн дүн гаргах' }).click(); await confirm('Эцсийн дүн гаргах');
  t = await txt();
  ok(/Эцсийн дүн гарсан/.test(t) && /Хамгаалаагүй/.test(t), 'score 4: finalized with W');
  await go('/supervisor/scores');
  ok(/Шийдэх/.test(await txt()), 'scores list ok');

  // --- Plans advice
  await go('/supervisor/plans/8');
  await page.locator('.main button', { hasText: 'Зөвлөгөө хадгалах' }).click(); await page.waitForTimeout(300);
  ok(/Зөвлөгөөгөө бичнэ үү/.test(await txt()), 'plan: advice empty → error');
  await page.fill('textarea[name=advice]', 'Долоо хоног бүрийн ажлыг нарийвчил.');
  await page.locator('.main button', { hasText: 'Зөвлөгөө хадгалах' }).click(); await page.waitForTimeout(600);
  ok(await page.locator('textarea[name=advice]').inputValue() === 'Долоо хоног бүрийн ажлыг нарийвчил.', 'plan: advice saved');

  // --- Announcements
  await go('/supervisor/announcements');
  const before = await page.locator('article.announcement').count();
  await page.locator('.main button[type=submit]', { hasText: 'Нийтлэх' }).click(); await page.waitForTimeout(300);
  ok(/Гарчгаа бичнэ үү/.test(await txt()), 'announce: empty → errors');
  await page.fill('input[name=title]', 'Шинэ сануулга'); await page.fill('textarea[name=body]', 'Тайлангаа цагтаа өгнө үү.');
  await page.locator('.main button[type=submit]', { hasText: 'Нийтлэх' }).click(); await page.waitForTimeout(600);
  ok((await page.locator('article.announcement').count()) === before + 1, 'announce: published');
  // student sees it
  await as('student1@gmail.com'); await go('/student/guide');
  ok(/Шинэ сануулга/.test(await txt()), 'student guide shows supervisor announcement');
  ok(/Шинэ зарлал: Шинэ сануулга/.test(await page.evaluate(async () => JSON.stringify(await (await fetch('/api/notifications')).json()))), 'student notified of announcement');
  await as('supervisor1@gmail.com'); await go('/supervisor/announcements');
  await page.locator('article.announcement', { hasText: 'Шинэ сануулга' }).locator('button', { hasText: 'Устгах' }).click(); await confirm('Устгах');
  ok((await page.locator('article.announcement').count()) === before, 'announce: deleted');

  // --- Notifications + grade sheets
  await go('/supervisor/notifications');
  ok(/Уянга/.test(await txt()), 'notifications page');
  await go('/supervisor/grade-sheets');
  ok(/PDF/.test(await txt()) && /Excel/.test(await txt()), 'grade sheets');
  const csv = await page.evaluate(async () => { const r = await fetch('/api/supervisor/grade-sheets/2/csv'); return [r.status, await r.text()]; });
  ok(csv[0] === 200 && /Алтангэрэл Хулан/.test(csv[1]) && /W/.test(csv[1]), 'grade sheet CSV with finalized grades');
  const pr = await page.evaluate(async () => (await fetch('/api/supervisor/grade-sheets/2/print')).status);
  ok(pr === 200, 'grade sheet printable');
  const rf = await page.evaluate(async () => { const r = await (await fetch('/api/supervisor/internships/6/report')).json(); const id = r.submission.files[0].id; return (await fetch(`/api/files/${id}`)).status; });
  ok(rf === 404 || rf === 200, `student report file access by supervisor (${rf})`);
  // --- role guard: student path while supervisor
  await go('/student/home'); await page.waitForTimeout(300);
  ok(/#\/supervisor\/home/.test(await page.evaluate(() => location.hash)), 'role guard redirects');
  await as('admin@gmail.com'); await go('/admin/reports?status=accepted');
  ok(/Энхбаяр|Уянга/.test(await txt()), 'admin sees report accepted by supervisor (shared data)');
  const other = await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } });
    await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'pm2' }, body: JSON.stringify({ email: 'supervisor2@gmail.com', password: 'q123456' }) });
    return [(await fetch('/api/supervisor/internships/6')).status, (await fetch('/api/supervisor/internships')).status]; });
  ok(other[0] === 404 && other[1] === 200, 'other supervisor cannot see my student');
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  console.log(fails ? `FAILS ${fails}` : 'ALL OK');
  await b.close();
})();
