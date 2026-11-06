// R2-ийн оронд файлыг D1 (file_chunks хүснэгт)-д хадгалах: env.FILES-тэй ижил put / get / delete.
// Cloudflare-д R2 идэвхжүүлээгүй (карт бүртгээгүй) үед ашиглагдана. Том файл Workers Free-ийн 10 мс CPU-д ачаалал өгнө — том файл удаан бол Workers Paid эсвэл R2.
const CHUNK = 1024 * 1024;

const toBytes = (v) => (v instanceof Uint8Array ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : Uint8Array.from(v)); // D1 blob-ыг ArrayBuffer эсвэл тоон массив болгон буцаадаг

export function d1Files(d1) {
  return {
    async put(key, data) {
      const bytes = new Uint8Array(data);
      const statements = [d1.prepare('DELETE FROM file_chunks WHERE storage_key = ?').bind(key)];
      for (let at = 0, n = 0; at < bytes.length; at += CHUNK, n += 1) {
        statements.push(d1.prepare('INSERT INTO file_chunks (storage_key, idx, data) VALUES (?, ?, ?)').bind(key, n, bytes.slice(at, at + CHUNK).buffer));
      }
      await d1.batch(statements);
    },
    async get(key) {
      const { results } = await d1.prepare('SELECT data FROM file_chunks WHERE storage_key = ? ORDER BY idx').bind(key).all();
      if (!results.length) return null;
      const parts = results.map((r) => toBytes(r.data));
      const body = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
      let at = 0;
      for (const p of parts) { body.set(p, at); at += p.length; }
      return { body, size: body.length };
    },
    async delete(key) { await d1.prepare('DELETE FROM file_chunks WHERE storage_key = ?').bind(key).run(); },
  };
}
