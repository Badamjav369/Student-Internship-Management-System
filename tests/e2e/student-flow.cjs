const { chromium } = require('playwright');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const B = 'http://localhost:5174';
(async () => {
  const b = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 300 : 0 });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::|status of 4\d\d/.test(m.text())) errs.push('console ' + m.text()); });
  const txt = () => page.evaluate(() => document.querySelector('.main')?.innerText ?? '');
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(900); };
  const as = async (email) => {
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(500);
    await page.evaluate(async (e) => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } }); localStorage.clear(); }, email);
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(700);
    await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'q123456'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  };
  const api = (path, opts = {}) => page.evaluate(async ([p, o]) => { const r = await fetch(p, { ...o, headers: { 'x-requested-with': 'pm2', 'content-type': 'application/json' } }); return [r.status, await r.text()]; }, [path, opts]);

  // --- Тэмүүлэн: дадлага хийж байна ---
  await as('student1@gmail.com');
  let t = await txt();
  ok(page.url().includes('/student/home') && /Дадлага хийж байна|Өнөөдрийн тэмдэглэл|Хийх ажил/.test(t), 'temuulen home');
  await go('/student/logbook');
  t = await txt();
  ok(/Хянагдсан/.test(t), 'logbook shows reviewed days');
  const today = new Date().toISOString().slice(0, 10);
  const card = page.locator(`.day-card[data-date="${today}"]`);
  if (await card.count()) {
    if (!(await card.locator('form').count())) await card.locator('.day-card-button').click();
    await card.locator('textarea[name=work_done]').fill('Backend API-ийн тест бичив.'); await card.locator('input[name=hours]').fill('7.5');
    await card.locator('input[type=file]').setInputFiles({ name: 'zurag.png', mimeType: 'image/png', buffer: Buffer.from('png') });
    await card.locator('button:has-text("Хадгалах")').click(); await page.waitForTimeout(1200);
    const [st, body] = await api('/api/student/logbook');
    const e = JSON.parse(body).days.find((d) => d.date === today)?.entry;
    ok(st === 200 && e?.hours === 7.5 && e.files.length === 1, 'log entry saved with file');
    const fid = e.files[0].id;
    const dl = await page.evaluate(async (id) => (await fetch(`/api/files/${id}`)).status, fid);
    ok(dl === 200, 'own log file downloadable');
  } else console.log('  (today not a working day — skip write)');
  const [st0] = await api('/api/student/logbook/2026-10-26', { method: 'POST', body: '{}' });
  ok(st0 >= 400, 'reviewed day cannot be edited');
  await go('/student/plan'); ok(/Батлагдсан/.test(await txt()) && /Ажлын хуваарь/.test(await txt()), 'plan approved view');
  await go('/student/contract'); t = await txt();
  ok(/Гуравласан гэрээ/.test(t) && /Скан хувь/.test(t) && /Байршуулсан/.test(t) && !/Зурсан|Гарын үсэг/.test(t), 'contract: two tiles, no signatures');
  const doc = await page.evaluate(async () => { const c = await (await fetch('/api/student/contract')).json(); const r = await fetch(c.pdf_url); return [r.status, (await r.text()).includes('Оюутны дадлагын гуравласан гэрээ')]; });
  ok(doc[0] === 200 && doc[1], 'contract printable document');
  await go('/student/guide'); t = await txt(); ok(/Тайлан илгээх хугацааны сануулга/.test(t), 'guide announcements');
  await go('/student/score'); ok(/Хүлээгдэж буй/.test(await txt()), 'score pending');
  await go('/student/report'); ok(/Тайлан/.test(await txt()), 'report page renders (not open yet)');
  await go('/student/notifications'); ok(/долоо хоногийн тэмдэглэлийг/.test(await txt()), 'student notifications');
  const forbidden = await api('/api/admin/semesters/2/todo');
  ok(forbidden[0] === 403, 'student cannot call admin api');

  // --- Ану: газар хайж байна (хүсэлт, өргөдөл). Бүртгэлийн хугацаа өнгөрсөн тул эхлээд хаалттай эсэх, дараа нь админ сунгана ---
  await as('student11@gmail.com');
  const closed = await page.evaluate(async () => { const fd = new FormData(); fd.append('cv', new File(['%PDF'], 'a.pdf')); const r = await fetch('/api/student/postings/8/apply', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return r.status; });
  ok(closed === 409, 'apply blocked outside registration window');
  await as('admin@gmail.com');
  ok((await api('/api/admin/semesters/2', { method: 'PATCH', body: JSON.stringify({ register_to: '2026-12-31' }) }))[0] === 204, 'admin extends registration');
  await as('student11@gmail.com');
  await go('/student/postings');
  t = await txt(); ok(/Веб хөгжүүлэгч дадлагжигч/.test(t), 'postings list');
  await go('/student/postings?tab=own'); t = await txt();
  ok(/Эрдэнэт Тех/.test(t), 'anu: pending request listed');
  // өргөдөл: шинэ зар руу CV-тэй
  await go('/student/postings/8');
  await page.locator('input[name=cv]').setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await page.fill('textarea[name=cover_letter]', 'Мобайл хөгжүүлэлт сонирхдог.');
  await page.locator('form button[type=submit]').click(); await page.waitForTimeout(1500);
  ok(page.url().includes('tab=mine'), 'application sent → my tab');
  const apps = JSON.parse((await api('/api/student/applications'))[1]);
  ok(apps.some((a) => a.posting_id === 8 && a.status === 'pending' && a.cv_name === 'cv.pdf'), 'application stored with CV');
  const dup = await page.evaluate(async () => { const fd = new FormData(); fd.append('cv', new File(['%PDF'], 'a.pdf')); const r = await fetch('/api/student/postings/8/apply', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return [r.status, (await r.json()).message]; });
  ok(dup[0] === 409, `duplicate application rejected (${dup[1]})`);
  const mine = apps.find((a) => a.posting_id === 8);
  ok((await api(`/api/student/applications/${mine.id}/cancel`, { method: 'POST' }))[0] === 204, 'application cancelled');
  const reqs = JSON.parse((await api('/api/student/requests'))[1]);
  const second = await page.evaluate(async () => { const fd = new FormData(); for (const [k, v] of Object.entries({ kind: 'own', organization_name: 'X', start_date: '2026-11-10', end_date: '2026-11-30', description: 'd' })) fd.append(k, v); const r = await fetch('/api/student/requests', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return r.status; });
  ok(second === 409, 'second pending request blocked');
  ok((await api(`/api/student/requests/${reqs[0].id}/cancel`, { method: 'POST' }))[0] === 204, 'request cancelled');
  await go('/student/postings?tab=own');
  t = await txt();
  if (await page.locator('input[name=kind]').count()) {
    await page.locator('input[name=kind][value=abroad]').check({ force: true });
    await page.fill('input[name=organization_name]', 'Tokyo Soft'); await page.fill('input[name=country]', 'Япон').catch(() => {});
    await page.fill('input[name=start_date]', '2026-11-16'); await page.fill('input[name=end_date]', '2026-12-11');
    await page.fill('textarea[name=description]', 'Токио дахь компанид дадлага хийнэ.');
    await page.locator('input[name=document]').setInputFiles({ name: 'urilga.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
    await page.locator('.tab-panel:not([hidden]) button:has-text("Хүсэлт илгээх")').click(); await page.waitForTimeout(1500);
    const r2 = JSON.parse((await api('/api/student/requests'))[1]);
    ok(r2[0].organization_name === 'Tokyo Soft' && r2[0].status === 'pending' && r2[0].document_name === 'urilga.pdf', 'new abroad request via UI');
  } else ok(false, 'proposal form not found');

  // --- Цэцэг: гэрээ (скан байршуулсан, эрхлэгчийн баталгааг хүлээж буй) ---
  await as('student9@gmail.com');
  await go('/student/contract'); t = await txt();
  ok(/Байршуулсан/.test(t) && !/Скан байршуулах/.test(t) && !/Гарын үсэг/.test(t), 'tsetseg contract: scanned, no upload form');
  const j = async (p) => JSON.parse((await api(p))[1]);
  const c0 = await j('/api/student/contract');
  ok(c0.status === 'scanned' && !c0.can_upload && c0.scan_file_id && c0.scan_name, 'scanned: file exists, cannot re-upload');
  ok((await j('/api/student/dashboard')).internship.status === 'contracting', 'still contracting until head approves');
  const pdf = [37, 80, 68, 70, 45, 49, 46, 52, 10];
  const upload = (name) => page.evaluate(async ([n, bytes]) => { const f = new FormData(); f.append('file', new File([new Uint8Array(bytes)], n, { type: 'application/pdf' })); const r = await fetch('/api/student/contract/scan', { method: 'POST', body: f, headers: { 'x-requested-with': 'pm2' } }); return r.status; }, [name, pdf]);
  ok((await upload('again.pdf')) === 409, 'upload while awaiting head → 409');
  ok((await page.evaluate(async () => (await fetch('/api/student/contract/document')).status)) === 200, 'document at student route');
  ok((await page.evaluate(async (id) => (await fetch('/api/files/' + id)).status, c0.scan_file_id)) === 200, 'student downloads own scan');

  // --- Мөнхжаргал: тайлан засвар (админ хугацаа сунгаад) ---
  await as('admin@gmail.com');
  const ext = await page.evaluate(async () => { const fd = new FormData(); fd.append('kind', 'extend'); fd.append('reason', 'Засвар хийх хугацаа'); fd.append('details', JSON.stringify({ report_due: '2026-12-20' }));
    const r = await fetch('/api/admin/internships/5/changes', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return r.status; });
  ok(ext === 200, 'admin extends report deadline');
  await as('student5@gmail.com');
  await go('/student/report'); t = await txt();
  ok(/Засвар шаардсан|засвар/i.test(t), 'revision report visible');
  let rep = JSON.parse((await api('/api/student/report'))[1]);
  ok(rep.open && rep.draft.files.length === 2 && rep.missing.length === 0, 'revision: previous files copied to draft');
  const up = await page.evaluate(async () => { const fd = new FormData(); fd.append('file', new File(['%PDF'], 'tailan_v2.pdf', { type: 'application/pdf' })); const r = await fetch('/api/student/report/files/report', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return [r.status, (await r.json()).draft.files.find((f) => f.requirement === 'report').name]; });
  ok(up[0] === 200 && up[1] === 'tailan_v2.pdf', 'report file replaced in draft');
  const bad = await page.evaluate(async () => { const fd = new FormData(); fd.append('file', new File(['x'], 'a.exe')); const r = await fetch('/api/student/report/files/review', { method: 'POST', headers: { 'x-requested-with': 'pm2' }, body: fd }); return [r.status, JSON.stringify(await r.json())]; });
  ok(bad[0] === 422, `wrong file type rejected ${bad[1].slice(0, 60)}`);
  await go('/student/report');
  const submitBtn = page.locator('.main button:has-text("Тайлан илгээх")');
  if (await submitBtn.count()) { await submitBtn.click(); await page.waitForTimeout(400); await page.locator('dialog[open] button:has-text("Илгээх")').click().catch(() => {}); await page.waitForTimeout(1200); }
  rep = JSON.parse((await api('/api/student/report'))[1]);
  ok(rep.status === 'submitted' && rep.submission.files.some((f) => f.name === 'tailan_v2.pdf'), 'report submitted via UI');

  // --- Золбоо: хамгаалалтын хуваарь; Эрдэнэ: дүн; Номин: W ---
  await as('student4@gmail.com');
  await go('/student/defense'); t = await txt();
  ok(/13:00/.test(t) && /Бат-Эрдэнэ Сувд/.test(t), 'zolboo defense schedule'); if (!/13:00/.test(t)) console.log(t.slice(0, 400));
  await as('student3@gmail.com');
  await go('/student/score'); t = await txt();
  ok(/84/.test(t) && /Дууссан|Баталгаажсан/.test(t), 'erdene final score 84');
  const ev = JSON.parse((await api('/api/student/evaluation'))[1]);
  ok(ev.final && ev.final.criteria.length === 8 && Math.abs(ev.final.org_score + ev.final.committee_score - 84) < 0.6, `erdene breakdown ${ev.final?.org_score}+${ev.final?.committee_score}`);
  await as('student13@gmail.com');
  await go('/student/score'); ok(/W/.test(await txt()), 'nomin mark W');
  console.log('errs', JSON.stringify(errs)); console.log(fails ? `FAILS ${fails}` : 'ALL OK');
  await b.close();
})();
