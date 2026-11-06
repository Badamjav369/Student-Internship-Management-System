// Deploy-ийн өмнөх шалгалт: wrangler.toml бэлэн үү (database_id солигдсон уу)? Алдаа байвал deploy хийхгүй.
import { readFile } from 'node:fs/promises';

const toml = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
const problems = [];
if (/REPLACE_WITH_DATABASE_ID/.test(toml)) problems.push('wrangler.toml: database_id солигдоогүй. Эхлээд `npm run cf:setup` ажиллуулна.');
if (/no-reply@example\.com/.test(toml)) console.warn('! wrangler.toml: MAIL_FROM нь жишээ хаяг хэвээр — MAIL_API_KEY тохируулахаас өмнө Resend-д баталгаажуулсан хаягаар солино (түлхүүргүй үед имэйл зөвхөн Worker log-д бичигдэнэ).');
for (const p of problems) console.error(`✗ ${p}`);
if (problems.length) process.exit(1);
console.log('✓ wrangler.toml бэлэн. (Нууц утга MAIL_API_KEY, SIGNING_SECRET-г `npx wrangler secret list`-ээр шалгана.)');
