// Регрессийн тест: улирлын 4 үе шатын огноо дараалалтай бол хадгалагдана, эрт эхэлбэл зөвхөн тухайн үе шат дээр алдаа.
const { request } = require('playwright');
(async () => {
  const api = await request.newContext({ baseURL: 'http://localhost:5174', extraHTTPHeaders: { 'x-requested-with': 'pm2' } });
  const r = (await api.post('/api/auth/login', { data: { email: 'admin@university.example', password: 'Demo1234' } }));
  let fail = 0; const t = (n, ok, extra = '') => { console.log(ok ? 'OK  ' : 'FAIL', n, extra); if (!ok) fail++; };
  t('login', r.ok(), r.status());
  const c = await api.post('/api/admin/semesters', { data: { academic_year: '2031-2032', season: 'winter' } });
  const { id } = await c.json(); t('create', c.status() === 201, c.status());
  const good = { register_from: '2031-11-07', register_to: '2031-11-13', work_from: '2031-11-16', work_to: '2031-12-05', report_from: '2031-12-06', report_to: '2031-12-08', defense_from: '2031-12-09', defense_to: '2031-12-12' };
  let p = await api.patch(`/api/admin/semesters/${id}`, { data: good }); t('ordered dates accepted', p.ok(), p.status() + ' ' + (p.ok() ? '' : await p.text()));
  p = await api.patch(`/api/admin/semesters/${id}`, { data: { ...good, work_from: '2031-11-01' } });
  const body = await p.json().catch(() => ({})); const txt = JSON.stringify(body);
  t('work earlier than register rejected', p.status() === 422 || p.status() === 400, p.status());
  t('error only on work_from', txt.includes('work_from') && !txt.includes('register_from') && !txt.includes('report_from') && !txt.includes('defense_from'), txt.slice(0, 200));
  p = await api.patch(`/api/admin/semesters/${id}`, { data: { ...good, work_to: '2031-11-10' } });
  t('to before from rejected', !p.ok(), p.status());
  console.log(fail ? `FAILED ${fail}` : 'ALL PASSED');
  process.exit(fail ? 1 : 0);
})();
