// Тайлангийн файлын хавтан: дүрс, шаардлагын нэр, файлын нэр, илгээсэн огноо. Админ, удирдагч багш хоёр ашиглана.
import { h } from '../core/dom.js';
import { formatDate } from '../core/format.js';
import { fileButton } from '../core/files.js';
import { icon } from '../core/icons.js';

export function fileTile(label, file) {
  return h('div', { class: ['fact-tile', 'doc-tile', !file && 'is-empty'] },
    h('span', { class: ['tile', `tile-${file ? 'green' : 'violet'}`], 'aria-hidden': 'true' }, icon('paperclip', 22)),
    h('div', {}, h('span', { class: 'fact-label' }, label), file?.id != null ? fileButton(file) : h('strong', {}, file?.name ?? 'Илгээгээгүй'),
      file ? h('span', { class: 'file-date' }, icon('calendar', 14), formatDate(file.uploaded_at.slice(0, 10))) : null));
}
