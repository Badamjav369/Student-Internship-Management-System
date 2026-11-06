// Ажлын төлөвлөгөөг харах хэсгүүд: шийдвэрийн зурвас, ажлын хуваарь. Оюутан, удирдагч багш хоёулаа ашиглана.
import { h } from '../core/dom.js';
import { formatDate, formatRange } from '../core/format.js';
import { icon } from '../core/icons.js';

const VERDICTS = {
  approved: ['done', 'circle-check', 'Батлагдсан'],
  returned: ['attention', 'circle-x', 'Санал бичиж буцаасан'],
  submitted: ['pending', 'clock', 'Хянагдаж байна'],
};

// Шийдвэрийн зурвас: хувилбарын төлвийг өнгө, дүрс, том бичвэрээр харуулна.
export function planVerdict(plan) {
  const [tone, iconName, title] = VERDICTS[plan.status];
  const sent = `Илгээсэн ${formatDate(plan.submitted_at.slice(0, 10))}`;
  const sub = plan.decided_at ? `${formatDate(plan.decided_at.slice(0, 10))} · ${sent.toLowerCase()}` : sent;
  return h('div', { class: 'verdict', dataset: { tone } },
    h('span', { class: 'verdict-icon', 'aria-hidden': 'true' }, icon(iconName, 26)),
    h('div', { class: 'verdict-body' }, h('strong', { class: 'verdict-title' }, title), h('span', { class: 'verdict-sub' }, sub)));
}

// Ажлын хуваарийн хайрцаг: дээд талд төлөвлөгөөний мэдээлэл, зураасаар заагласан доор нь хуваарь.
export function planTimeline(plan, planFields) {
  const tasks = plan.fields.tasks;
  const values = plan.fields.values;
  const show = (f) => {
    const v = values[f.key];
    if (v === undefined || v === '') return '—';
    return f.type === 'date' ? formatDate(v) : String(v);
  };
  return h('section', { class: 'timeline-card', 'aria-labelledby': 'h-schedule' },
    planFields.length ? h('dl', { class: 'plan-facts' }, planFields.map((f) => h('div', {}, h('dt', {}, f.label), h('dd', { class: 'prose' }, show(f))))) : null,
    h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title', id: 'h-schedule' }, 'Ажлын хуваарь'), h('span', { class: 'chip' }, `${tasks.length} ажил`)),
    h('ol', { class: 'timeline' }, tasks.map((t, n) => h('li', { class: 'tl-item' },
      h('span', { class: 'plan-no', 'aria-hidden': 'true' }, n + 1),
      h('strong', { class: 'tl-range' }, formatRange(t.from, t.to)),
      h('p', { class: 'prose' }, t.task)))));
}
