// Таб 4 — Дадлагын тухай: дадлагын газар (+ үйл ажиллагааны чиглэл), хугацаа, дадлага удирдагч (+ албан тушаал), удирдагч багш — 4 тусдаа хавтан, нэг торонд ойрхон. Нүүр хуудсанд байгаа үе шат, дедлайныг давтаж харуулахгүй.
import { h, replace } from '../../../core/dom.js';
import { daysBetween, formatRange } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { emptyState } from '../../../components/empty-state.js';
import { initials } from './parts.js';

// extra — хавтан доторх нэмэлт нэр–утга хос (жишээ нь байгууллагын үйл ажиллагааны чиглэл).
function fact(iconName, label, value, { hint = null, extra = null } = {}) {
  return h('div', { class: 'fact-tile' }, h('span', { class: ['tile', 'tile-violet'], 'aria-hidden': 'true' }, icon(iconName, 20)),
    h('div', {}, h('span', { class: 'fact-label' }, label), h('strong', {}, value), hint ? h('span', { class: 'muted small' }, hint) : null,
      extra ? h('div', { class: 'fact-extra' }, h('span', { class: 'fact-label' }, extra[0]), h('span', {}, extra[1])) : null));
}

function contact(role, p) {
  if (!p) {
    return h('article', { class: 'contact-card is-empty' }, h('span', { class: 'contact-avatar', 'aria-hidden': 'true' }, icon('user', 22)),
      h('div', { class: 'contact-body' }, h('span', { class: 'contact-role' }, role), h('strong', {}, 'Томилогдоогүй')));
  }
  return h('article', { class: 'contact-card' },
    h('span', { class: 'contact-avatar', 'aria-hidden': 'true' }, initials(p.name)),
    h('div', { class: 'contact-body' }, h('span', { class: 'contact-role' }, role), h('strong', {}, p.name),
      p.position ? h('span', { class: 'contact-position' }, p.position) : null,
      h('div', { class: 'contact-links' },
        h('a', { class: 'button quiet small', href: `tel:${p.phone}` }, icon('phone', 16), p.phone),
        h('a', { class: 'button quiet small', href: `mailto:${p.email}` }, icon('mail', 16), p.email))));
}

export function createAboutTab(ctx) {
  const el = h('div', { class: 'stack org-about' });

  function refresh() {
    const i = ctx.internship;
    if (!i) { replace(el, emptyState('Бүртгэлтэй дадлага алга', 'Танд энэ улиралд бүртгэлтэй дадлага байхгүй.', { icon: 'calendar' })); return; }
    const info = i.info;
    const days = daysBetween(info.start_date, info.end_date) + 1;
    replace(el,
      h('div', { class: 'fact-grid' },
        fact('building', 'Дадлагын газар', info.organization?.name ?? 'Сонгоогүй', { extra: info.organization?.field ? ['Үйл ажиллагааны чиглэл', info.organization.field] : null }),
        fact('calendar', 'Дадлагын хугацаа', formatRange(info.start_date, info.end_date), { hint: `${days} хоног` }),
        contact('Дадлага удирдагч', info.mentor),
        contact('Удирдагч багш', info.supervisor)));
  }

  refresh();
  return { el, refresh };
}
