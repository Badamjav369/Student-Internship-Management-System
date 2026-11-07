// Хамгийн энгийн .xlsx уншигч (dependency-гүй): эхний хуудасны мөрүүдийг текстээр. ZIP-ийг DecompressionStream-ээр задална.
const td = new TextDecoder();
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflate(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** ZIP-ийн доторх файлууд: { нэр: Uint8Array } (зөвхөн хэрэгтэйг нь задална). */
async function unzip(buf, wanted) {
  const b = new Uint8Array(buf);
  let end = b.length - 22;
  while (end >= 0 && u32(b, end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('XLSX_INVALID');
  const out = {};
  for (let p = u32(b, end + 16), n = u16(b, end + 10); n > 0; n -= 1) {
    const method = u16(b, p + 10); const size = u32(b, p + 20); const nameLen = u16(b, p + 28); const extra = u16(b, p + 30); const comment = u16(b, p + 32); const local = u32(b, p + 42);
    const name = td.decode(b.subarray(p + 46, p + 46 + nameLen));
    if (wanted.test(name)) {
      const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      const raw = b.subarray(start, start + size);
      out[name] = method === 0 ? raw : await inflate(raw);
    }
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
// XML entity: &lt; &gt; &quot; &apos; &amp; ба тооны хэлбэр (&#1043; &#x413;) — зарим программ (жишээ нь Python openpyxl) кирилл үсгийг ингэж бичдэг.
const unescape = (s) => s.replace(/&#(\d+);|&#x([0-9a-f]+);/gi, (_, d, h) => String.fromCodePoint(d ? Number(d) : parseInt(h, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** → [[cell, ...], ...] (эхний хуудас). */
export async function readXlsx(buf) {
  const files = await unzip(buf, /^xl\/(sharedStrings\.xml|worksheets\/sheet1\.xml)$/);
  const sheet = files['xl/worksheets/sheet1.xml'];
  if (!sheet) throw new Error('XLSX_INVALID');
  const shared = files['xl/sharedStrings.xml'] ? [...td.decode(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))) : [];
  return [...td.decode(sheet).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells = [];
    for (const c of row[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const type = /t="(\w+)"/.exec(c[2])?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] ?? '')?.[1] ?? '';
      cells[colIndex(c[1])] = type === 's' ? shared[Number(v)] ?? '' : unescape(v);
    }
    return Array.from(cells, (x) => (x ?? '').trim());
  });
}
/** CSV (таслал эсвэл цэг таслал, хашилттай утга дэмжинэ). */
export function readCsv(text) {
  const sep = (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) > (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()).map((line) => {
    const cells = []; let cur = ''; let q = false;
    for (let k = 0; k < line.length; k += 1) {
      const ch = line[k];
      if (q) { if (ch === '"' && line[k + 1] === '"') { cur += '"'; k += 1; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { cells.push(cur.trim()); cur = ''; } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}
