import { readFileSync } from 'node:fs';
const base = 'http://localhost:5174';
class C { jar = {};
  async send(method, path, json) { const headers = { 'x-requested-with': 'pm2', cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ') }; let body; if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
    const res = await fetch(base + path, { method, headers, body }); for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); this.jar[k] = v.join('='); }
    const t = await res.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; } return { s: res.status, d }; }
  async login(e) { const r = await this.send('POST', '/api/auth/login', { email: e, password: 'Demo1234' }); if (r.s !== 200) throw new Error('login ' + e + r.s); await this.send('POST', '/api/me/consent', {}); } }
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
const otp = (email) => { const log = readFileSync(process.env.SERVER_LOG, 'utf8'); const re = new RegExp(`\\[mail\\] → ${email}[^\\n]*\\n[^\\n]*?(\\d{6})`, 'g'); let m, last; while ((m = re.exec(log))) last = m[1]; return last; };
const st = new C(), head = new C(), men = new C();
await st.login('tsetseg@university.example'); await head.login('head@university.example'); await men.login('ganbaatar@narlag.example');
let r = await head.send('POST', '/api/head/contracts/9/return', { reason: 'digital' }); ok(r.s === 204, 'return');
r = await st.send('POST', '/api/student/contract/mode', { mode: 'digital' }); ok(r.s === 204, 'mode digital ' + r.s);
r = await st.send('GET', '/api/student/contract'); ok(r.d.status === 'signing' && r.d.mode === 'digital', 'signing/digital');
r = await st.send('POST', '/api/student/contract/sign', { code: '123456', consent: true }); ok(r.s >= 400 && r.s < 500, 'sign without requested code rejected ' + r.s);
r = await st.send('POST', '/api/student/contract/sign/code'); ok(r.s === 204 || r.s === 200, 'code requested ' + r.s);
const c = otp('tsetseg@university.example'); ok(/^\d{6}$/.test(c ?? ''), 'otp in mail log ' + c);
r = await st.send('POST', '/api/student/contract/sign', { code: c === '000000' ? '111111' : '000000', consent: true }); ok(r.s === 422 || r.s === 400, 'wrong code rejected ' + r.s + JSON.stringify(r.d));
r = await st.send('POST', '/api/student/contract/sign', { code: c }); ok(r.s === 422, 'no consent rejected ' + r.s);
r = await st.send('POST', '/api/student/contract/sign', { code: c, consent: true }); ok(r.s === 200, 'student signs with OTP ' + r.s + JSON.stringify(r.d));
r = await st.send('POST', '/api/student/contract/sign', { code: c, consent: true }); ok(r.s === 409, 'double sign 409 ' + r.s);
r = await men.send('POST', '/api/mentor/contracts/9/sign/code'); const c2 = otp('ganbaatar@narlag.example');
r = await men.send('POST', '/api/mentor/contracts/9/sign', { code: c, consent: true }); ok(r.s >= 400, 'student OTP not valid for mentor ' + r.s);
r = await men.send('POST', '/api/mentor/contracts/9/sign', { code: c2, consent: true }); ok(r.s === 200, 'mentor signs ' + r.s + JSON.stringify(r.d));
await head.send('POST', '/api/head/contracts/9/sign/code'); const c3 = otp('head@university.example');
r = await head.send('POST', '/api/head/contracts/9/sign', { code: c3, consent: true }); ok(r.s === 200 && r.d.status === 'approved', 'head signs → approved ' + r.s);
r = await st.send('GET', '/api/student/contract/verify'); ok(r.d.valid && r.d.signatures.length === 3 && r.d.signatures.every((x) => x.content_ok), 'verify valid digital ' + JSON.stringify(r.d).slice(0, 200));
let d = await head.send('GET', '/api/head/contracts/9/document'); ok(/цахим|Тоон|OTP|digital/i.test(d.d), 'document mentions e-signature method');
// rate limit on codes
const st2 = new C(); await st2.login('anu@university.example');
console.log(bad ? 'FAILS ' + bad : 'ALL OK');
