// Баримтын хавтан: дүрс, нэр, огноо, татах товч; буланд төлөв. Оюутны хуудсууд, гуравласан гэрээ (бүх тал) хуваалцана.
import { h } from '../core/dom.js';
import { formatDate } from '../core/format.js';
import { icon } from '../core/icons.js';
import { badge } from './status-badge.js';

/** Файлыг өгсөн огноо: жижиг хуанлийн дүрс + он сар өдөр. */
export const fileDate = (iso) => h('span', { class: 'file-date' }, icon('calendar', 14), formatDate(iso.slice(0, 10)));

/** state — буланд бичих төлөв {text, tone}; name байхгүй бол empty бичвэр, үйлдэлгүй. */
export function docTile({ iconName, tone, label, name, empty = 'Бэлтгэгдэж байна', wide = false, action, state = null, date = null }) {
  return h('div', { class: ['fact-tile', 'doc-tile', wide && 'wide', !name && 'is-empty'] },
    h('span', { class: ['tile', `tile-${name ? tone : 'violet'}`], 'aria-hidden': 'true' }, icon(iconName, 22)),
    h('div', {},
      state ? h('div', { class: 'doc-head' }, h('span', { class: 'fact-label' }, label), badge(state.text, state.tone)) : h('span', { class: 'fact-label' }, label),
      h('strong', {}, name ?? empty), name && date ? fileDate(date) : null, name ? action : null));
}
