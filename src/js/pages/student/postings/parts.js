// «Дадлагын байгууллага» хуудасны жижиг, давтагдах хэсгүүд: байгууллагын хавтан, хугацааны шошго, орон тооны цэгүүд, тооны хавтан.
import { h } from '../../../core/dom.js';
import { daysBetween } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { logoImg } from '../../../components/person.js';

const TONES = ['violet', 'amber', 'blue', 'green', 'rose'];

// Нэрнээс тогтмол өнгө гаргана (ижил байгууллага үргэлж ижил өнгөтэй).
export function toneFor(text) {
  let n = 0;
  for (const ch of text) n = (n * 31 + ch.codePointAt(0)) >>> 0;
  return TONES[n % TONES.length];
}

export function initials(name) {
  const words = name.replace(/[«»"'()]/g, '').split(/\s+/).filter((w) => w && !/^(ХХК|ХК|ББСБ)$/i.test(w));
  return words.slice(0, 2).map((w) => [...w][0]).join('').toUpperCase();
}

/** row — organization_id, organization_logo талбартай мөр (зар, хүсэлт). Лого байвал зураг, үгүй бол нэрний эхний үсэг. */
export const orgAvatar = (name, size = 'md', row = null) => (row?.organization_logo
  ? h('span', { class: ['org-avatar', size, 'has-logo'], 'aria-hidden': 'true' }, logoImg(row.organization_id, row.organization_logo))
  : h('span', { class: ['org-avatar', size, `tile-${toneFor(name)}`], 'aria-hidden': 'true' }, initials(name)));

// Хүсэлт авах эцсийн өдрөөс хойш/өмнө хэд хоног байгааг өнгө, бичвэрээр харуулна.
export function deadlineChip(deadline, today) {
  const d = daysBetween(today, deadline);
  const tone = d < 0 ? 'closed' : d <= 3 ? 'urgent' : 'ok';
  const text = d < 0 ? 'Хугацаа дууссан' : d === 0 ? 'Өнөөдөр дуусна' : `${d} хоног үлдсэн`;
  return h('span', { class: ['deadline', tone] }, icon('clock', 14), text);
}

// Орон тоог нэг цэг = нэг орон тоо хэлбэрээр: дүүрсэн (taken) ба сул (free).
export function capacity(p) {
  const left = Math.max(0, p.positions - p.accepted_count);
  const dots = Array.from({ length: p.positions }, (_, i) => h('span', { class: i < p.accepted_count ? 'taken' : 'free' }));
  return h('div', { class: ['capacity', left === 0 ? 'full' : left === 1 ? 'low' : null] },
    h('span', { class: 'capacity-dots', role: 'img', 'aria-label': `${p.positions} орон тооноос ${left} сул` }, dots),
    h('span', {}, left === 0 ? 'Орон тоо дүүрсэн' : `${left} сул орон тоо`));
}
