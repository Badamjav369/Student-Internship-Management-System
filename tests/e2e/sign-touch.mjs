const base = 'http://localhost:5174';
class C { jar = {};
  async send(method, path, json) { const headers = { 'x-requested-with': 'pm2', cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ') }; let body; if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
    const res = await fetch(base + path, { method, headers, body }); for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, ...v] = kv.split('='); this.jar[k] = v.join('='); }
    const t = await res.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; } return { s: res.status, d, h: res.headers }; }
  async login(e) { const r = await this.send('POST', '/api/auth/login', { email: e, password: 'q123456' }); if (r.s !== 200) throw new Error('login ' + e + r.s); await this.send('POST', '/api/me/consent', {}); } }
let bad = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) bad++; };
// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const st = new C(), head = new C(), men = new C();
await st.login('student9@gmail.com'); await head.login('head@gmail.com'); await men.login('mentor1@gmail.com');
let r = await st.send('GET', '/api/student/contract'); ok(r.d.status === 'scanned', 'start: tsetseg scanned (paper-like) ' + r.d.status);
// tsetseg already scanned → use head return to reopen
r = await head.send('POST', '/api/head/contracts/9/return', { reason: 'онлайн горимд шилжүүлнэ' }); ok(r.s === 204, 'head return ' + r.s);
r = await st.send('GET', '/api/student/contract'); ok(r.d.status === 'returned' && r.d.can_choose, 'returned, can_choose');
r = await st.send('POST', '/api/student/contract/mode', { mode: 'bogus' }); ok(r.s === 422, 'bad mode 422 ' + r.s);
r = await st.send('POST', '/api/student/contract/mode', { mode: 'touch' }); ok(r.s === 204, 'mode touch ' + r.s);
r = await st.send('GET', '/api/student/contract'); ok(r.d.status === 'signing' && r.d.signing.parties.length === 3 && r.d.signing.can_sign && !r.d.can_upload, 'signing state, can_sign, no upload');
r = await st.send('POST', '/api/student/contract/scan'); ok(r.s >= 400, 'scan blocked in touch mode ' + r.s);
r = await head.send('POST', '/api/head/contracts/9/sign', { image: PNG }); ok(r.s === 409, 'head cannot sign first ' + r.s);
r = await st.send('POST', '/api/student/contract/sign', {}); ok(r.s === 422, 'sign without image 422 ' + r.s);
r = await st.send('POST', '/api/student/contract/sign', { image: 'data:image/png;base64,AAAA' }); ok(r.s === 422, 'bad png 422 ' + r.s);
r = await st.send('POST', '/api/student/contract/sign', { image: PNG }); ok(r.s === 200, 'student signs ' + r.s + JSON.stringify(r.d));
r = await st.send('POST', '/api/student/contract/sign', { image: PNG }); ok(r.s === 409, 'double sign 409');
r = await st.send('POST', '/api/student/contract/mode', { mode: 'paper' }); ok(r.s === 409, 'cannot switch after signature ' + r.s);
// live view from mentor
r = await men.send('GET', '/api/mentor/contracts'); ok(r.s === 200 && r.d.length >= 1, 'mentor list ' + r.d.length);
r = await men.send('GET', '/api/mentor/contracts/9'); ok(r.d.contract.signing.parties.find((p) => p.party === 'student').signed, 'mentor sees student signed (live)');
r = await men.send('PUT', '/api/mentor/seal', { image: 'data:image/png;base64,xx' }); ok(r.s === 422, 'bad seal 422');
r = await men.send('PUT', '/api/mentor/seal', { image: PNG }); ok(r.s === 204, 'seal saved ' + r.s);
r = await head.send('POST', '/api/head/contracts/9/sign', { image: PNG }); ok(r.s === 409, 'head still waits for mentor ' + r.s);
r = await men.send('POST', '/api/mentor/contracts/9/sign', { image: PNG }); ok(r.s === 200, 'mentor signs ' + r.s);
r = await head.send('GET', '/api/head/contracts/9'); ok(r.d.contract.signing.can_sign && r.d.contract.signing.count === 2, 'head can sign now');
r = await head.send('GET', '/api/head/contracts'); ok(r.d.some((x) => x.id === 9), 'head list has signing contract');
let doc = await head.send('GET', '/api/head/contracts/9/document'); ok(doc.s === 200 && /<img src="data:image\/png/.test(doc.d) && /SHA-256/.test(doc.d), 'document shows signatures + hash');
r = await head.send('POST', '/api/head/contracts/9/sign', { image: PNG }); ok(r.s === 200 && r.d.status === 'approved', 'head signs → approved ' + r.s);
r = await st.send('GET', '/api/student/contract'); ok(r.d.status === 'approved' && r.d.signing.count === 3, 'student sees approved, 3 signatures');
r = await st.send('GET', '/api/student/dashboard'); ok(['planning', 'in_progress'].includes(r.d.internship.status), 'internship advanced: ' + r.d.internship.status);
r = await st.send('GET', '/api/student/contract/verify'); ok(r.d.valid && r.d.signatures.length === 3, 'verify valid');
r = await st.send('GET', '/api/student/notifications'); 
// tamper → verify fails
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('.data/local.sqlite'); db.prepare("UPDATE contract_signatures SET signed_at='2020-01-01T00:00:00Z' WHERE party='mentor' AND internship_id=9").run();
r = await st.send('GET', '/api/student/contract/verify'); ok(!r.d.valid && r.d.signatures.some((x) => !x.proof_ok), 'tamper detected');
// outsider cannot read
const other = new C(); await other.login('student11@gmail.com'); r = await other.send('GET', '/api/student/contract/document'); ok(r.s !== 200 || !/Tsetseg|Цэцэг/.test(String(r.d)), 'other student gets own contract only');
r = await other.send('GET', '/api/mentor/contracts'); ok(r.s === 403, 'student blocked from mentor routes ' + r.s);
console.log(bad ? bad + ' FAILS' : 'ALL OK'); process.exit(bad ? 1 : 0);
