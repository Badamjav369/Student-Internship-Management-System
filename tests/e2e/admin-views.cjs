const { chromium } = require('playwright');
const probe = () => {
  const vw = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push(`PAGE-HSCROLL ${document.documentElement.scrollWidth}>${vw}`);
  const scrollable = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return p; } return null; };
  const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + (e.textContent ? ` "${e.textContent.trim().slice(0, 30)}"` : '');
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; if (e.closest('.sr-only, [hidden]') || (r.width <= 1 && r.height <= 1)) continue; let hid = false; for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.clipPath !== 'none' || (c.clip && c.clip !== 'auto') || p.getBoundingClientRect().width <= 1) { hid = true; break; } } if (hid) continue;
    if ((r.right > vw + 1 || r.left < -1) && !scrollable(e)) out.push(`OUT ${Math.round(r.left)}..${Math.round(r.right)} ${name(e)}`);
    if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && e.tagName !== 'INPUT' && e.tagName !== 'TEXTAREA' && e.tagName !== 'SELECT') out.push(`CLIP ${name(e)}`);
    if (e.children.length === 0 && /[^\s]/.test(e.textContent) && cs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && cs.display !== 'inline' && e.clientWidth > 0 && !/svg|path/i.test(e.tagName)) out.push(`SPILL ${e.scrollWidth}>${e.clientWidth} ${name(e)}`);
  }
  return [...new Set(out)].slice(0, 15);
};
const PATHS = [
  '/admin/home','/admin/semesters','/admin/semesters/2','/admin/semesters/2?tab=criteria','/admin/semesters/2?tab=templates','/admin/semesters/2?tab=students','/admin/semesters/3','/admin/semesters/1?tab=students',
  '/admin/internships/1','/admin/internships/11','/admin/internships/12','/admin/internships/5','/admin/internships/14',
  '/admin/users','/admin/users/new','/admin/users/import','/admin/users/1','/admin/users/19',
  '/admin/organizations','/admin/organizations/1','/admin/committees','/admin/committees/1','/admin/committees/2',
  '/admin/reports','/admin/reports?status=accepted','/admin/reports/5','/admin/reports/4','/admin/summary','/admin/summary?tab=stats','/admin/notifications','/admin/profile',
];
const widths = (process.argv[2] || '1280,390').split(',').map(Number);
const themes = (process.argv[3] || 'light,dark').split(',');
const shoot = process.argv[4] === 'shots';
(async () => {
  const b = await chromium.launch(); let total = 0;
  for (const w of widths) for (const theme of themes) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    await ctx.addInitScript((t) => { try { localStorage.setItem('pm2.consent', '2026-10-01T09:00:00.000Z'); localStorage.setItem('pm2.session', 'in'); localStorage.setItem('pm2.role', 'admin'); localStorage.setItem('pm2.theme', t); } catch (e) {} }, theme);
    await ctx.request.post('http://localhost:5174/api/auth/login', { data: { email: 'admin@university.example', password: 'Demo1234' }, headers: { 'x-requested-with': 'pm2' } });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::/.test(m.text())) errs.push('console ' + m.text()); });
    await page.goto('http://localhost:5174/#/admin/home', { waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    for (const path of PATHS) {
      errs.length = 0;
      await page.evaluate((p) => { location.hash = p; }, path);
      await page.waitForTimeout(450);
      const info = await page.evaluate(() => ({ h1: document.querySelector('main h1, .main h1')?.textContent?.trim() ?? null, alert: !!document.querySelector('.main [role="alert"]'), len: document.querySelector('.main')?.textContent.length ?? 0 }));
      const r = await page.evaluate(probe);
      const bad = [...r, ...errs];
      if (!info.h1 || info.alert || bad.length) { total += bad.length || 1; console.log('[' + w + ' ' + theme + '] ' + path + ' h1=' + info.h1 + (info.alert ? ' ALERT' : '') + '\n  ' + bad.join('\n  ')); }
      if (shoot) { const n = path.replace(/[^a-z0-9]+/gi, '_'); await page.screenshot({ path: 'adm/' + w + '-' + theme + '-' + n + '.png', fullPage: true }); }
    }
    await ctx.close();
  }
  console.log('PROBLEMS', total); await b.close();
})();
