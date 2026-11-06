// Дадлагын зарын карт: оюутан болон байгууллагын төлөөлөгчийн жагсаалтад нэг загвар.
// postCard(p, { href, today, closed, footer, extra }) — footer: баруун доод тал (хүсэлтийн төлөв, зарын төлөв гэх мэт), extra: нэмэлт мөр.
import { h } from '../core/dom.js';
import { formatRange } from '../core/format.js';
import { icon } from '../core/icons.js';
import { capacity, deadlineChip, orgAvatar } from '../pages/student/postings/parts.js';

export function postCard(p, { href, today, closed = false, footer = null, extra = null }) {
  const programs = p.programs?.length ? p.programs : ['Бүх хөтөлбөр'];
  return h('article', { class: ['post-card', closed && 'is-closed'] },
    h('header', { class: 'post-card-top' }, orgAvatar(p.organization_name, 'md', p),
      h('div', { class: 'post-org' },
        h('p', { class: 'post-org-name', title: p.organization_name }, p.organization_name),
        h('p', { class: 'post-field', title: p.field ?? '' }, icon('tag', 13), h('span', {}, p.field ?? '—')))),
    h('h2', {}, h('a', { href }, p.title)),
    h('p', { class: 'post-req' }, p.requirements),
    h('ul', { class: 'post-programs', 'aria-label': 'Хөтөлбөр' },
      h('li', { class: 'chip', title: programs.join(', ') }, programs[0]),
      programs.length > 1 ? h('li', { class: 'chip more', title: programs.slice(1).join(', ') }, `+${programs.length - 1}`) : null),
    h('ul', { class: 'post-meta' },
      h('li', {}, icon('calendar', 15), formatRange(p.start_date, p.end_date)),
      h('li', {}, capacity(p)),
      extra),
    h('footer', { class: 'post-card-foot' },
      deadlineChip(p.apply_deadline, today),
      footer ?? h('span', { class: 'go', 'aria-hidden': 'true' }, icon('arrow-up-right', 18))));
}
