// Өгөгдлийн сангийн анхны өгөгдөл.
//   node scripts/seed.mjs --file .data/seed.sql                → демо өгөгдөл (scripts/demo.sql, нууц үг бүгдэд Demo1234)
//   node scripts/seed.mjs --admin <и-мэйл> <нууц үг> [овог] [нэр] → production-д зөвхөн анхны админ
// Нууц үгийн хэшийн давталт: PASSWORD_ITERATIONS орчны хувьсагч (wrangler.toml-ийн [vars]-тай ижил; `npm run cf:setup` өөрөө дамжуулна).
// Cloudflare-д: `npm run cf:setup` (эсвэл wrangler d1 execute pm2-db --remote --file .data/seed.sql).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hashPassword, iterationsOf } from '../server/lib/auth.js';

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const ITER = iterationsOf(process.env);

export async function adminSql(email, password, last = 'Админ', first = 'Тэнхим', iterations = ITER) {
  const mail = q(email.toLowerCase());
  return [`INSERT INTO users (email, password_hash, last_name, first_name, status, consent_at) VALUES (${mail}, ${q(await hashPassword(password, iterations))}, ${q(last)}, ${q(first)}, 'active', ${q(new Date().toISOString())});`,
    `INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM users WHERE email = ${mail};`].join('\n');
}

/** Демо өгөгдөл. Нээлттэй зарууд өнөөдрөөс хойш 14 хоног нээлттэй. demo.sql-ийн хэш 100000 давталттай — өөр тоо бол Demo1234-ийг дахин хэшилнэ. */
export async function seedSql(iterations = ITER) {
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  let sql = await readFile(new URL('./demo.sql', import.meta.url), 'utf8');
  if (iterations !== 100000) { const hash = q(await hashPassword('Demo1234', iterations)); sql = sql.replace(/'pbkdf2\$100000\$[^']+'/g, () => hash); }
  return `${sql}
UPDATE postings SET apply_deadline = ${q(soon)} WHERE status = 'open' AND apply_deadline < ${q(soon)};`;
}

if (process.argv[1]?.endsWith('seed.mjs')) {
  const args = process.argv.slice(2);
  if (args[0] === '--admin') {
    if (!args[1] || !args[2]) { console.error('Хэрэглээ: node scripts/seed.mjs --admin <и-мэйл> <нууц үг> [овог] [нэр]'); process.exit(1); }
    console.log(await adminSql(args[1], args[2], args[3], args[4]));
  } else if (args[0] === '--file' && args[1]) {
    await mkdir(dirname(args[1]), { recursive: true });
    await writeFile(args[1], await seedSql());
  } else console.log(await seedSql());
}
