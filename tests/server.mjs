// Тестийн локал сервер: демо өгөгдөлтэйгээр шинээр асаах/зогсоох (PID файлаар).
// CLI: node tests/server.mjs restart | stop
import { spawn } from 'node:child_process';
import { existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PORT = 5174;
// .data-г сервер --reset үед цэвэрлэдэг тул log, PID-ийг түр хавтсанд хадгална.
export const LOG = join(tmpdir(), 'pm2-test-server.log');
const PID = join(tmpdir(), 'pm2-test-server.pid');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function stop() {
  const pid = existsSync(PID) ? Number(readFileSync(PID, 'utf8')) : 0;
  if (!(pid > 0)) return;            // 0 бол process.kill бүх бүлгийг зогсооно
  try { process.kill(pid, 'SIGTERM'); } catch { /* аль хэдийн зогссон */ }
  writeFileSync(PID, '');
  for (let k = 0; k < 50; k += 1) {
    try { await fetch(`http://localhost:${PORT}/api/health`); } catch { return; }
    await sleep(100);
  }
}

export async function restart() {
  await stop();
  const srv = spawn(process.execPath, ['dev-server.mjs', '--api', '--reset'], {
    cwd: root, env: { ...process.env, PORT: String(PORT) }, detached: true, stdio: ['ignore', openSync(LOG, 'w'), openSync(LOG, 'a')],
  });
  srv.unref();
  writeFileSync(PID, String(srv.pid));
  for (let k = 0; k < 100; k += 1) {
    try { if ((await fetch(`http://localhost:${PORT}/api/health`)).ok) return; } catch { /* асаагүй */ }
    await sleep(200);
  }
  throw new Error('Сервер асахгүй байна.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  await (cmd === 'stop' ? stop() : restart());
}
