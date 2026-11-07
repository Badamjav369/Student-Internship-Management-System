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

const PAGES = ['/student/home','/student/postings','/student/postings?tab=mine','/student/postings?tab=own','/student/postings/1','/student/contract','/student/plan','/student/logbook','/student/report','/student/defense','/student/score','/student/guide','/student/notifications','/student/profile'];
const USERS = ['student1','student11','student9','student8','student5','student6','student4','student2','student3','student13','student15','student12','student14'];
(async () => {
  const b = await chromium.launch(); let total = 0;
  for (const [w, theme] of [[1280, 'light'], [390, 'dark']]) for (const u of USERS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    await ctx.request.post('http://localhost:5174/api/auth/login', { data: { email: `${u}@gmail.com`, password: 'q123456' }, headers: { 'x-requested-with': 'pm2' } });
    await ctx.addInitScript((t) => { localStorage.setItem('pm2.session', 'in'); localStorage.setItem('pm2.role', 'student'); localStorage.setItem('pm2.consent', 'x'); localStorage.setItem('pm2.theme', t); }, theme);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts|net::/.test(m.text())) errs.push('console ' + m.text()); });
    await page.goto('http://localhost:5174/#/student/home', { waitUntil: 'load' }); await page.waitForTimeout(1200);
    for (const path of PAGES) {
      errs.length = 0;
      await page.evaluate((p) => { location.hash = p; }, path); await page.waitForTimeout(800);
      const info = await page.evaluate(() => ({ h1: document.querySelector('.main h1')?.textContent?.trim() ?? null, alert: !!document.querySelector('.main [role="alert"]') }));
      const bad = [...(await page.evaluate(probe)), ...errs];
      if (!info.h1 || bad.length) { total += bad.length || 1; console.log(`[${w} ${u}] ${path} h1=${info.h1}${info.alert ? ' ALERT' : ''}\n  ${bad.join('\n  ')}`); }
    }
    await ctx.close();
  }
  console.log('PROBLEMS', total); await b.close();
})();
