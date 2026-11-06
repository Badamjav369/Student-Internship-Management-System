// ЗӨВХӨН локал хөгжүүлэлтэд: Cloudflare-ийн D1, R2-ийг Node-ийн суурилагдсан SQLite (node:sqlite), файлын системээр орлуулна.
// Worker-ийн код (server/index.js) өөрчлөгдөхгүй — ижил env.DB, env.FILES-ийг авна. Production-д энэ файл ашиглагдахгүй.
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

class Statement {
  constructor(db, sql, args = []) { Object.assign(this, { db, sql, args }); }
  bind(...args) { return new Statement(this.db, this.sql, args.map((a) => (a instanceof ArrayBuffer ? new Uint8Array(a) : a))); }
  #exec(kind) {
    const s = this.db.prepare(this.sql);
    if (kind === 'all') return s.all(...this.args);
    if (kind === 'first') return s.get(...this.args);
    const r = s.run(...this.args);
    return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
  }
  async all() { return { results: this.#exec('all') }; }
  async first() { return this.#exec('first') ?? null; }
  async run() { return this.#exec('run'); }
  runSync() { return this.#exec('run'); }
}

export function d1(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  return {
    raw: db,
    prepare: (sql) => new Statement(db, sql),
    exec: async (sql) => db.exec(sql),
    async batch(statements) {
      db.exec('BEGIN');
      try { const out = statements.map((s) => s.runSync()); db.exec('COMMIT'); return out; } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}

/** migrations/*.sql-ээс хараахан хийгдээгүйг дарааллаар нь (wrangler d1 migrations apply-тай ижил). */
export async function migrate(binding, dir) {
  const db = binding.raw;
  db.exec('CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY, applied_at TEXT)');
  const done = new Set(db.prepare('SELECT name FROM d1_migrations').all().map((r) => r.name));
  for (const name of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(name)) continue;
    db.exec(await readFile(join(dir, name), 'utf8'));
    db.prepare('INSERT INTO d1_migrations VALUES (?, ?)').run(name, new Date().toISOString());
    console.log(`migration: ${name}`);
  }
}

export function r2(root) {
  const path = (key) => join(root, key);
  return {
    async put(key, data) {
      await mkdir(dirname(path(key)), { recursive: true });
      await writeFile(path(key), Buffer.from(data));
    },
    async get(key) {
      try { const buf = await readFile(path(key)); return { body: buf, size: buf.length }; } catch { return null; }
    },
    async delete(key) { await rm(path(key), { force: true }); },
  };
}
