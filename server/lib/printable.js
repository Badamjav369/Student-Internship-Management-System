// Хэвлэх хуудас (HTML): гэрээ, дадлагын дэвтэр. Хөтчийн «Хэвлэх → PDF болгох»-оор PDF болгоно (Cyrillic фонт, PDF сан шаардлагагүй).
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** sections: [{ title, rows?: [[label, value]], paragraphs?: [text], table?: { head: [], rows: [[]] } }] */
/** signatures: тэмдэгт мөр (хоосон мөр) эсвэл { label, image?, mark?, seal?, lines?: [] } (зурсан/цахим гарын үсэг). footer — доод тайлбар мөрүүд. */
export function printable(title, sections, { signatures = [], footer = [] } = {}) {
  const body = sections.map((s) => `<section>${s.title ? `<h2>${esc(s.title)}</h2>` : ''}
    ${s.rows ? `<dl>${s.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl>` : ''}
    ${(s.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${s.table ? `<table><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
  </section>`).join('');
  const signs = signatures.length ? `<section class="signs">${signatures.map((s) => (typeof s === 'string' ? `<div><span></span><p>${esc(s)}</p></div>`
    : `<div><span class="done">${s.image ? `<img src="${s.image}" alt="">` : `<b>${esc(s.mark ?? '')}</b>`}${s.seal ? `<img class="seal" src="${s.seal}" alt="">` : ''}</span><p>${esc(s.label)}</p>${(s.lines ?? []).map((l) => `<small>${esc(l)}</small>`).join('')}</div>`)).join('')}</section>` : '';
  return new Response(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font:15px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#111}h1{font-size:1.4rem;text-align:center}h2{font-size:1.05rem;margin-top:1.5rem}
dl{display:grid;grid-template-columns:14rem 1fr;gap:.3rem 1rem}dt{color:#555}dd{margin:0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:.35rem .5rem;text-align:left;vertical-align:top}
.signs{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;margin-top:3rem}.signs span{display:block;border-bottom:1px solid #111;height:2.5rem}.signs p{text-align:center;margin:.3rem 0 0;font-size:.85rem}
span.done{position:relative;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #111;height:5rem}.signs img{max-height:4.6rem;max-width:100%}.signs img.seal{position:absolute;right:0;bottom:.2rem;max-height:4rem;opacity:.85}.signs small{display:block;text-align:center;color:#555;font-size:.75rem}footer{margin-top:2rem;border-top:1px solid #bbb;font-size:.72rem;color:#555;word-break:break-all}footer p{margin:.15rem 0}@media print{button{display:none}body{margin:0}}</style></head><body><button onclick="print()">Хэвлэх / PDF</button><h1>${esc(title)}</h1>${body}${signs}${footer.length ? `<footer>${footer.map((l) => `<p>${esc(l)}</p>`).join('')}</footer>` : ''}</body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'" } });
}
