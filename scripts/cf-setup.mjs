// Cloudflare-д нэг командаар байршуулах: `npm run cf:setup`
// Дахин ажиллуулахад аюулгүй — хийгдсэн алхмыг алгасна (D1, R2 байгаа бол ашиглана, өгөгдөлтэй бол өгөгдөл оруулахгүй, secret байгаа бол солихгүй).
// Алхам: wrangler суулгах → нэвтрэх → D1 + R2 → тохиргоо (асуулт) → migration → өгөгдөл → deploy → SIGNING_SECRET → дүгнэлт.
// Туршилтад: WRANGLER_BIN=<хуурамч wrangler> бол npx-ийн оронд түүнийг дуудна.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const root = new URL('..', import.meta.url);
const TOML = new URL('wrangler.toml', root);
const WIN = process.platform === 'win32';
const DB_NAME = 'pm2-db';
const BUCKET = 'pm2-files';
const SECRET = 'SIGNING_SECRET';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const say = (text) => console.log(text);
const step = (n, text) => say(`\n[${n}/8] ${text}`);
function fail(text) { console.error(`\n✗ ${text}`); process.exit(1); }

/** wrangler-ийг дуудна. Аргументэд зай байх ёсгүй (Windows-д shell-ээр дамждаг). */
function wrangler(args, { input, show = false } = {}) {
  const [cmd, full] = process.env.WRANGLER_BIN ? [process.env.WRANGLER_BIN, args] : ['npx', ['wrangler', ...args]];
  const r = spawnSync(cmd, full, { cwd: root, encoding: 'utf8', input, shell: WIN, stdio: show ? 'inherit' : 'pipe',
    env: show ? process.env : { ...process.env, CI: '1' } }); // CI=1 — wrangler асуулт асуухгүй (migration-ийг шууд батална)
  if (r.error) fail(`wrangler ажиллуулж чадсангүй: ${r.error.message}`);
  return { ok: r.status === 0, stdout: r.stdout ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
/** Гаралтаас JSON хэсгийг олно (өмнө нь «[WARNING]» гэх мэт мөр байж болно). */
function jsonOf(text) {
  const ends = [...text.matchAll(/[\]}]/g)].map((m) => m.index).reverse();
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '[' && text[i] !== '{') continue;
    for (const j of ends) { if (j <= i) break; try { return JSON.parse(text.slice(i, j + 1)); } catch { /* дараагийнх */ } }
  }
  return null;
}

// Асуулт: мөрүүдийг дарааллаар уншина (pipe-ээр хариулт өгсөн ч алдагдахгүй). Оролт дууссан бол анхдагч утга.
let rl = null;
let lines = null;
async function ask(q, def = '') {
  if (!rl) { rl = createInterface({ input: process.stdin }); lines = rl[Symbol.asyncIterator](); }
  process.stdout.write(`  ${q}${def ? ` [${def}]` : ''}: `);
  const { value, done } = await lines.next();
  if (done) process.stdout.write('\n');
  return (done ? '' : value).trim() || def;
}
const yes = async (q, def = false) => /^(y|yes|т|тийм)$/i.test(await ask(`${q} (y/n)`, def ? 'y' : 'n'));

say('Cloudflare-д байршуулах тохиргоо (pm2). Ctrl+C — зогсооно.');

step(1, 'wrangler');
if (!process.env.WRANGLER_BIN && !existsSync(new URL('node_modules/wrangler', root))) {
  say('  wrangler суулгаж байна (npm install)...');
  const r = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit', shell: WIN });
  if (r.status !== 0) fail('npm install амжилтгүй. Интернэт холболтоо шалгаад дахин оролдоно уу.');
}

step(2, 'Cloudflare бүртгэлд нэвтрэх');
let who = wrangler(['whoami']);
if (!who.ok || /not authenticated|You are not logged in/i.test(who.out)) {
  say('  Хөтөч нээгдэнэ — Cloudflare бүртгэлээрээ нэвтэрч «Allow» дарна.');
  wrangler(['login'], { show: true });
  who = wrangler(['whoami']);
  if (!who.ok || /not authenticated|You are not logged in/i.test(who.out)) fail('Нэвтэрч чадсангүй. `npx wrangler login`-ийг гараар ажиллуулаад дахин оролдоно уу.');
}
say(`  ✓ ${(/associated with the email\s+(\S+)/i.exec(who.out)?.[1] ?? 'нэвтэрсэн').replace(/\.$/, '')}`);

step(3, `Өгөгдлийн сан (D1: ${DB_NAME}), файлын сан (R2: ${BUCKET})`);
let toml = await readFile(TOML, 'utf8');
let dbId = /database_id\s*=\s*"([^"]+)"/.exec(toml)?.[1];
if (!UUID.test(dbId ?? '')) {
  const list = jsonOf(wrangler(['d1', 'list', '--json']).stdout);
  dbId = Array.isArray(list) ? list.find((d) => d.name === DB_NAME)?.uuid : null;
  if (!dbId) {
    const created = wrangler(['d1', 'create', DB_NAME]);
    dbId = UUID.exec(created.out)?.[0];
    if (!created.ok || !dbId) fail(`D1 үүсгэж чадсангүй:\n${created.out}`);
    say(`  ✓ D1 үүслээ`);
  } else say('  ✓ D1 өмнө нь үүссэн — ашиглана');
  toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`);
  await writeFile(TOML, toml);
} else say('  ✓ D1 (wrangler.toml-д бичигдсэн)');
const bucket = wrangler(['r2', 'bucket', 'create', BUCKET]);
if (bucket.ok) say('  ✓ R2 bucket үүслээ');
else if (/already exists|already own/i.test(bucket.out)) say('  ✓ R2 bucket өмнө нь үүссэн');
else if (/enable R2|R2 is not enabled|10042|purchase/i.test(bucket.out)) fail('R2 идэвхжээгүй. Dashboard → R2 Object Storage → «Enable / Purchase R2» (карт бүртгэнэ, 10 GB үнэгүй) хийгээд дахин ажиллуулна уу.');
else fail(`R2 bucket үүсгэж чадсангүй:\n${bucket.out}`);

step(4, 'Тохиргоо');
const paid = await yes('Workers Paid ($5/сар) төлөвлөгөөтэй юу? Үгүй бол Free-д тохирох нууц үгийн тохиргоо ашиглана', false);
const iterations = paid ? 100000 : 50000;
toml = toml.replace(/PASSWORD_ITERATIONS\s*=\s*"[^"]*"/, `PASSWORD_ITERATIONS = "${iterations}"`);
const mailFrom = /MAIL_FROM\s*=\s*"([^"]*)"/.exec(toml)?.[1] ?? '';
if (/example\.com/.test(mailFrom)) {
  const from = await ask('Имэйл илгээгчийн хаяг (Resend-д баталгаажуулсан домэйн, жишээ нь Дадлагын систем <no-reply@domain.mn>). Одоохондоо алгасах бол Enter', '');
  if (from) toml = toml.replace(/MAIL_FROM\s*=\s*"[^"]*"/, `MAIL_FROM = "${from.replace(/"/g, '')}"`);
}
await writeFile(TOML, toml);

step(5, 'Migration (хүснэгтүүд)');
const mig = wrangler(['d1', 'migrations', 'apply', DB_NAME, '--remote']);
if (!mig.ok) fail(`Migration амжилтгүй:\n${mig.out}`);
say(`  ✓ ${/No migrations to apply/i.test(mig.out) ? 'шинэ migration алга' : 'хийгдлээ'}`);

step(6, 'Өгөгдөл');
await mkdir(new URL('.data/', root), { recursive: true });
const countRun = wrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', WIN ? '"SELECT COUNT(*) AS n FROM users"' : 'SELECT COUNT(*) AS n FROM users']);
const counted = jsonOf(countRun.stdout);
let users = Number((Array.isArray(counted) ? counted[0] : counted)?.results?.[0]?.n ?? NaN);
if (Number.isNaN(users)) { const m = /\bn\W+(\d+)/.exec(countRun.out.replace(/[│┌┐└┘├┤┬┴┼─]/g, ' ')); if (m) users = Number(m[1]); }
if (Number.isNaN(users)) fail('Хэрэглэгчийн тоог уншиж чадсангүй (өгөгдлийг давхар оруулахгүйн тулд зогслоо). wrangler-ийн гаралт:\n' + countRun.out.slice(0, 1500));
let accounts = '';
if (users > 0) say(`  ✓ Өгөгдөлтэй (${users} хэрэглэгч) — алгаслаа`);
else {
  process.env.PASSWORD_ITERATIONS = String(iterations);
  const { adminSql, seedSql } = await import('./seed.mjs');
  const demo = await yes('Демо өгөгдөл оруулах уу? (туршилтад: бүх дүрийн жишээ хэрэглэгч, нууц үг Demo1234). Үгүй бол зөвхөн админ үүснэ', true);
  let sql;
  if (demo) { sql = await seedSql(iterations); accounts = 'Демо хэрэглэгчид: admin@university.example, head@…, tsetseg@…, ganbaatar@narlag.example гэх мэт — нууц үг Demo1234 (README §2)'; }
  else {
    const email = await ask('Админы и-мэйл');
    let password = '';
    while (password.length < 8) password = await ask('Админы нууц үг (8+ тэмдэгт)');
    sql = await adminSql(email, password, 'Админ', 'Тэнхим', iterations);
    accounts = `Админ: ${email}`;
  }
  await writeFile(new URL('.data/seed.sql', root), sql);
  const seeded = wrangler(['d1', 'execute', DB_NAME, '--remote', '--file', '.data/seed.sql']);
  if (!seeded.ok) fail(`Өгөгдөл оруулж чадсангүй:\n${seeded.out}`);
  say('  ✓ Өгөгдөл орлоо');
}
rl?.close();

step(7, 'Deploy');
const deployed = wrangler(['deploy']);
if (!deployed.ok && /workers\.dev subdomain/i.test(deployed.out)) fail('Cloudflare бүртгэлд workers.dev дэд домэйн хараахан үүсээгүй. Dashboard → Workers & Pages хуудсыг нэг удаа нээж дэд домэйнээ сонгоод `npm run cf:setup`-ийг дахин ажиллуулна.');
if (!deployed.ok) fail(`Deploy амжилтгүй:\n${deployed.out}`);
const url = /https:\/\/[^\s]+\.workers\.dev/.exec(deployed.out)?.[0] ?? '(Cloudflare Dashboard → Workers → pm2)';
say(`  ✓ ${url}`);

step(8, `Гарын үсгийн түлхүүр (${SECRET})`);
if (wrangler(['secret', 'list']).out.includes(SECRET)) say('  ✓ Өмнө нь тохируулсан — солихгүй (сольвол өмнөх гарын үсгийн шалгалт алдаа заана)');
else {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  const value = Buffer.from(bytes).toString('base64url');
  const put = wrangler(['secret', 'put', SECRET], { input: `${value}\n` });
  if (!put.ok) fail(`${SECRET} тавьж чадсангүй:\n${put.out}`);
  say('  ✓ Санамсаргүй түлхүүр үүсгэж тавилаа');
}

say(`
✓ Бэлэн: ${url}
${accounts ? `  ${accounts}\n` : ''}  Log (имэйл түлхүүргүй үед урилга, нууц үг сэргээх холбоос, гарын үсгийн код энд): npm run cf:logs
  Шалгах (демо өгөгдөлтэй үед, өгөгдлийг бага зэрэг өөрчилнө): npm run cf:smoke -- ${url}
  Дараагийн шинэчлэл: npm run cf:deploy
  Заавал биш: жинхэнэ имэйл — npx wrangler secret put MAIL_API_KEY; CAPTCHA — README §7.`);
