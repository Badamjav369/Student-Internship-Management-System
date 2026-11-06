// Мэдээллийн жижиг хэсгүүд: нэр-утгын жагсаалт, тоон үзүүлэлтийн хавтан.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

export const infoList = (pairs) => h('dl', { class: 'facts' }, pairs.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value || h('span', { class: 'muted' }, '—'))]));
export const stat = (tone, iconName, value, label) => h('div', { class: 'stat' }, h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 22)), h('div', {}, h('strong', {}, String(value)), h('span', {}, label)));
/** Дэлгэрэнгүй хуудасны мэдээллийн хавтан: өнгөт дүрс, шошго, утга. */
export const factTile = (iconName, tone, label, ...value) => h('div', { class: 'fact-tile' },
  h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 22)), h('div', {}, h('span', { class: 'fact-label' }, label), ...value));
/** Тоон үзүүлэлтийн хавтан (жижиг дүрстэй): дээр нь утга, доор нь шошго. */
export const statTile = (label, value, tone, iconName) => h('div', { class: 'stat' },
  h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 20)),
  h('div', {}, h('strong', {}, value), h('span', {}, label)));
