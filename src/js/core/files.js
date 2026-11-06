// Файл татах товч: файлын id → /api/files/:id, «/api/...» хаяг → тэр хуудас шинэ цонхонд (гэрээ, дэвтрийн хэвлэх хувилбар).
import { config } from '../config.js';
import { h } from './dom.js';
import { sizeLabel } from './format.js';
import { icon } from './icons.js';

const VIEWABLE = /\.(pdf|png|jpe?g)$/i;
/** PDF, зургийг хуудас эргүүлдэг үзэгчээр нээнэ (үзэгч зөвхөн энд ачаалагдана). */
export const view = (id, name) => import('../components/doc-viewer.js').then((m) => m.openViewer({ id, name }));
const viewable = (id, name) => Number.isInteger(id) && VIEWABLE.test(String(name ?? ''));

const download = (ref) => {
  if (Number.isInteger(ref)) location.assign(`${config.apiBase}/files/${ref}`);
  else if (typeof ref === 'string' && ref.startsWith(`${config.apiBase}/`)) window.open(ref, '_blank', 'noopener');
};

export function fileButton({ id = null, name, size = null }) {
  const can = viewable(id, name);
  return h('button', { class: 'file-link', type: 'button', title: can ? 'Үзэх' : 'Татах', on: { click: () => (can ? view(id, name) : download(id)) } },
    icon(can ? 'eye' : 'download', 16), h('span', {}, name), size ? h('span', { class: 'muted' }, sizeLabel(size)) : null);
}

/** PDF/зураг бол «Үзэх» товч хамт гарна. */
export function downloadButton(label, fileName, cls = 'button secondary', id = null) {
  const save = h('button', { class: cls, type: 'button', on: { click: () => download(id) } }, icon('download', 18), label);
  if (!viewable(id, fileName)) return save;
  return h('span', { class: 'file-actions' }, h('button', { class: cls, type: 'button', on: { click: () => view(id, fileName) } }, icon('eye', 18), 'Үзэх'), save);
}
