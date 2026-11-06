// Хуудасны дээд талын «Буцах» товч: системд өмнө нь нээсэн хуудас руу (history.back) буцна.
// Шууд холбоосоор орсон (өмнөх хуудас байхгүй) үед href (дээд түвшний хуудас) руу очно.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { hasPrevious } from '../core/router.js';

export function backLink(href, label = 'Буцах') {
  const link = h('a', { class: 'back-link', href: `#${href}` }, icon('back', 18), 'Буцах');
  link.title = label;
  link.addEventListener('click', (event) => { if (hasPrevious()) { event.preventDefault(); history.back(); } });
  return link;
}
