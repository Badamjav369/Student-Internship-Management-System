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
  const confirm = async (name) => { await page.locator('dialog[open].confirm button', { hasText: name }).click(); await page.waitForTimeout(900); };
  const as = async (email) => {
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    await page.evaluate(async () => { await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-requested-with': 'pm2' } }); localStorage.clear(); });
    await page.goto(`${B}/#/login`, { waitUntil: 'load' }); await page.waitForTimeout(700);
    await page.fill('input[name=email]', email); await page.fill('input[name=password]', 'q123456'); await page.click('button[type=submit]'); await page.waitForTimeout(1500);
  };
  const api = (path, method = 'GET', body) => page.evaluate(async ([p, m, b2]) => { const r = await fetch(p, { method: m, headers: { 'x-requested-with': 'pm2', 'content-type': 'application/json' }, body: b2 ? JSON.stringify(b2) : undefined }); const t = await r.text(); return [r.status, t ? JSON.parse(t) : null]; }, [path, method, body]);

  // ===== Дадлага удирдагч =====
  await as('mentor1@gmail.com');
  ok(page.url().includes('/mentor/home') && /Хийх ажил/.test(await txt()), 'mentor home');
  await go('/mentor/students'); ok(/5 оюутан/.test(await txt()) || (await page.locator('.row-card').count()) === 5, 'mentor: 5 interns');
  ok((await api('/api/mentor/internships/2'))[0] === 404, 'mentor cannot see other org intern');
  let t = await txt();
  ok((await page.locator('.sidebar a', { hasText: 'Гэрээ' }).count()) >= 1, 'mentor: contract nav');
  ok((await api('/api/mentor/contracts'))[0] === 200, 'mentor: contract API');
  ok((await page.evaluate(async () => (await fetch('/api/contracts/9/document')).status)) === 404, 'no shared contract document route');
  // plan 8: return w/o comment, then approve
  await go('/mentor/plans/8');
  await page.locator('.main button', { hasText: 'Буцаах' }).click(); await page.waitForTimeout(400);
  ok(/засахыг бичнэ|бичнэ үү/.test(await txt()), 'plan return requires comment');
  await page.fill('textarea[name=comment]', 'Сайн байна.');
  await page.locator('.main button', { hasText: 'Батлах' }).click(); await confirm('Батлах');
  ok((await api('/api/mentor/internships/8'))[1].status === 'in_progress', 'plan approved → in_progress');
  // logbook review (temuulen)
  const lb = (await api('/api/mentor/internships/1/logbook'))[1];
  const pend = lb.days.filter((d) => d.entry && !d.entry.reviewed_at).map((d) => ({ date: d.date, comment: 'Сайн' }));
  ok(lb.reviewable && pend.length > 0, `logbook has ${pend.length} unreviewed`);
  await go('/mentor/logbook?student=1');
  const rv = page.locator('.main button', { hasText: /хянасан|Хянах/i }).first();
  if (await rv.count()) { await rv.click(); await page.waitForTimeout(400); const d = page.locator('dialog[open].confirm button.primary, dialog[open].confirm button:not(:has-text("Болих"))').last(); if (await d.count()) await d.click(); await page.waitForTimeout(1000); }
  let lb2 = (await api('/api/mentor/internships/1/logbook'))[1];
  if (lb2.days.some((d) => d.entry && !d.entry.reviewed_at)) await api('/api/mentor/internships/1/logbook/review', 'POST', lb2.days.filter((d) => d.entry && !d.entry.reviewed_at).map((d) => ({ date: d.date })));
  lb2 = (await api('/api/mentor/internships/1/logbook'))[1];
  ok(!lb2.days.some((d) => d.entry && !d.entry.reviewed_at), 'logbook reviewed');
  ok((await api('/api/mentor/internships/1/logbook/review', 'POST', [{ date: pend[0].date }]))[0] === 409, 'double review rejected');
  // score 6 (uyanga, reporting): submit with letter via UI
  await go('/mentor/scores/6');
  const inputs = page.locator('.main input[name^=score-]'); const n = await inputs.count();
  for (let k = 0; k < n; k += 1) await inputs.nth(k).fill('5');
  await page.locator('.main input[name=letter]').setInputFiles({ name: 'tod.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await page.locator('.main button', { hasText: 'Үнэлгээ илгээх' }).click(); await page.waitForTimeout(1300);
  const sc = (await api('/api/mentor/internships/6/score'))[1];
  ok(sc.org_status === 'unconfirmed' && sc.org_scores.length === n && sc.org_letter === 'tod.pdf', 'org score submitted with letter');
  ok((await page.evaluate(async (id) => (await fetch(`/api/files/${id}`)).status, sc.org_letter_file_id)) === 200, 'mentor downloads own letter');

  // ===== Байгууллагын төлөөлөгч =====
  await as('org1@gmail.com');
  ok(page.url().includes('/org_rep/home'), 'org rep home');
  let ps = (await api('/api/org/postings'))[1];
  ok(ps.length === 3 && ps.every((p) => p.organization_id === 1), 'org: own 3 postings');
  const bad = await api('/api/org/postings', 'POST', { title: '', positions: 0, start_date: '2026-12-01', end_date: '2026-11-01', apply_deadline: '2020-01-01' });
  ok(bad[0] === 422 && bad[1].fields.title && bad[1].fields.positions && bad[1].fields.end_date, 'posting validation');
  await go('/org_rep/postings/new');
  await page.fill('input[name=title]', 'QA дадлага'); await page.fill('input[name=positions]', '3');
  await page.fill('input[name=start_date]', '2027-01-10'); await page.fill('input[name=end_date]', '2027-02-10'); await page.fill('input[name=apply_deadline]', '2026-12-20');
  await page.fill('textarea[name=requirements]', 'Туршилт хийх сонирхолтой.').catch(() => {});
  await page.locator('.main button[type=submit]').last().click(); await page.waitForTimeout(1300);
  ps = (await api('/api/org/postings'))[1];
  const qa = ps.find((p) => p.title === 'QA дадлага');
  ok(Boolean(qa) && /\/org_rep\/postings\/\d+/.test(page.url()), 'posting created via UI');
  ok((await api(`/api/org/postings/${qa.id}`, 'PUT', { ...qa, positions: 4 }))[0] === 204, 'posting updated');
  ok((await api(`/api/org/postings/${qa.id}/close`, 'POST'))[0] === 204 && (await api(`/api/org/postings/${qa.id}`, 'PUT', { ...qa }))[0] === 409, 'posting closed, no edit');
  // applications: accept anu (posting 1), reject tengis
  const apps = (await api('/api/org/applications'))[1];
  const anu1 = apps.find((a) => a.student.first_name === 'Ану' && a.posting.id === 1 && a.status === 'pending');
  const teng = apps.find((a) => a.student.first_name === 'Тэнгис' && a.status === 'pending');
  ok(anu1 && teng, 'pending applications listed');
  await go(`/org_rep/applications/${anu1.id}`);
  await page.locator('.main button', { hasText: 'Хүлээн авах' }).click(); await confirm('Хүлээн авах');
  const apps2 = (await api('/api/org/applications'))[1];
  ok(apps2.find((a) => a.id === anu1.id).status === 'accepted' && !apps2.some((a) => a.student.first_name === 'Ану' && a.status === 'pending'), 'accepted; other pending cancelled');
  ok((await api(`/api/org/applications/${teng.id}/reject`, 'POST'))[0] === 204, 'tengis rejected');
  const interns = (await api('/api/org/interns'))[1];
  const anuI = interns.find((i) => i.student.first_name === 'Ану');
  ok(anuI && anuI.status === 'contracting' && anuI.assignable, 'anu now intern (contracting)');
  await go(`/org_rep/interns/${anuI.id}`);
  ok(/Дадлага удирдагч/.test(await txt()), 'intern detail');
  const cand = (await api('/api/org/mentor-candidates'))[1];
  ok(cand.some((c) => c.self) && cand.some((c) => c.first_name === 'Ганбаатар'), 'mentor candidates incl. self');
  ok((await api(`/api/org/interns/${anuI.id}/mentor`, 'POST', { mentor_id: cand.find((c) => c.first_name === 'Ганбаатар').id }))[0] === 200, 'assign existing mentor');
  const inv = await api(`/api/org/interns/${anuI.id}/mentor`, 'POST', { person: { last_name: 'Дорж', first_name: 'Сараа', email: 'saraa@narlag.example', position: 'Ахлах инженер' } });
  ok(inv[0] === 200 && inv[1].invited, 'invite new mentor');
  ok((await api('/api/org/interns/1/mentor', 'POST', { mentor_id: cand[0].id }))[0] === 409, 'cannot change mentor after start');

  // ===== Оюутан Ану: шинэ гэрээ (filled) → скан =====
  await as('student11@gmail.com');
  await go('/student/contract'); t = await txt();
  ok(/Гэрээ байгуулах хэлбэр/.test(t), 'anu contract filled → mode picker');
  await page.locator('.main label.kind-card', { hasText: 'Цаасан' }).click(); await page.locator('.main button', { hasText: 'Үргэлжлүүлэх' }).click(); await page.waitForTimeout(1000); t = await txt();
  ok(/Скан байршуулах/.test(t), 'anu paper → upload form');
  const ac = (await api('/api/student/contract'))[1];
  ok(ac.status === 'filled' && ac.scan_name === null && ac.scan_file_id === null && ac.can_upload, 'no scan file before upload');
  ok(await page.locator('.doc-tile', { hasText: 'Скан хувь' }).locator('button').count() === 0, 'scan tile has no download before upload');
  await page.locator('.main input[name=file]').setInputFiles({ name: 'gereenii_scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await page.locator('.main button', { hasText: 'Скан байршуулах' }).click(); await page.waitForTimeout(1300);
  t = await txt();
  ok(/Байршуулсан/.test(t) && /gereenii_scan\.pdf/.test(t) && !/Скан байршуулах\n/.test(t), 'scan uploaded');
  const ac2 = (await api('/api/student/contract'))[1];
  ok(ac2.status === 'scanned' && ac2.scan_name === 'gereenii_scan.pdf' && ac2.scan_file_id && !ac2.can_upload, 'scan file exists after upload');
  ok((await api('/api/student/dashboard'))[1].internship.status === 'contracting', 'upload does not advance stage (head approves)');
  await as('head@gmail.com');
  ok((await api('/api/head/contracts'))[1].some((c) => c.student.last_name && c.contract.scan_name === 'gereenii_scan.pdf'), 'head sees Ану scan');
  await go('/head/notifications'); ok(/гэрээний скан байршууллаа/.test(await txt()), 'head notified of upload');
  console.log('errs', JSON.stringify(errs)); console.log(fails ? `FAILS ${fails}` : 'ALL OK');
  await b.close();
})();
