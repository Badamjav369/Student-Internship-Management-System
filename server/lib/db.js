// D1 туслахууд: SQL-ийг модуль бүрт энгийн байдлаар бичнэ, давтагдах хэсгийг энд.
export const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
export const today = () => new Date().toISOString().slice(0, 10);

export function database(d1) {
  const prep = (sql, args) => d1.prepare(sql).bind(...args.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v)));
  return {
    all: async (sql, ...args) => (await prep(sql, args).all()).results,
    one: async (sql, ...args) => (await prep(sql, args).first()) ?? null,
    value: async (sql, ...args) => { const row = await prep(sql, args).first(); return row ? Object.values(row)[0] : null; },
    run: async (sql, ...args) => prep(sql, args).run(),
    /** INSERT ... — шинэ мөрийн id-г буцаана. */
    insert: async (sql, ...args) => (await prep(sql, args).run()).meta.last_row_id,
    stmt: (sql, ...args) => prep(sql, args),
    /** Хэд хэдэн өөрчлөлтийг нэг transaction-аар (D1 batch). */
    batch: (statements) => d1.batch(statements.filter(Boolean)),
  };
}

/** UPDATE-ийн SET хэсэг: зөвхөн зөвшөөрсөн, ирсэн түлхүүрүүд. */
export function setClause(data, allowed) {
  const keys = allowed.filter((k) => k in data);
  return { sql: keys.map((k) => `${k} = ?`).join(', '), args: keys.map((k) => (Array.isArray(data[k]) ? JSON.stringify(data[k]) : data[k])) };
}
