// Хүн, байгууллагын дугуй тэмдэг: нэрийн үсэг эсвэл барилгын дүрс. Өнгө нь id-аас хамаарна.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

const TONES = ['violet', 'blue', 'green', 'amber', 'rose'];
export const initials = (p) => `${p?.last_name?.[0] ?? ''}${p?.first_name?.[0] ?? ''}`.toUpperCase();
export const personAvatar = (p, size = '') => h('span', { class: ['org-avatar', size, `tile-${TONES[(p?.id ?? 0) % TONES.length]}`], 'aria-hidden': 'true' }, initials(p));
export const logoImg = (id, version) => h('img', { src: `/api/organizations/${id}/logo/${version}`, alt: '', loading: 'lazy', decoding: 'async' });
export const orgAvatar = (o, size = '') => (o?.logo_file_id
  ? h('span', { class: ['org-avatar', size, 'has-logo'], 'aria-hidden': 'true' }, logoImg(o.id, o.logo_file_id))
  : h('span', { class: ['org-avatar', size, `tile-${TONES[(o?.id ?? 0) % TONES.length]}`], 'aria-hidden': 'true' }, icon('building', size ? 26 : 22)));
