// Оюутны дэлгэрэнгүй: хугацаа, удирдагч багш, холбоо барих; төлөвлөгөө, дэвтэр, үнэлгээ рүү орох товч.
import { h } from '../../../core/dom.js';
import { formatRange } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { nameOf, PLAN_LABELS, PLAN_TONES } from '../../../core/labels.js';
import { getMyInternship } from '../../../data/mentor-api.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { leadIcon, rowCard, rowList } from '../../../components/list.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { studentHead } from '../../../components/student-head.js';
import { orgBadge } from '../shared.js';

const dash = (v) => (v ? h('strong', {}, v) : h('strong', { class: 'muted' }, '—'));

function facts(i) {
  return h('div', { class: 'fact-grid' },
    factTile('calendar', 'blue', 'Дадлагын хугацаа', dash(i.start_date ? formatRange(i.start_date, i.end_date) : null)),
    factTile('user', 'violet', 'Удирдагч багш', dash(i.supervisor ? nameOf(i.supervisor) : null)),
    factTile('mail', 'green', 'Оюутны и-мэйл', dash(i.student.email)));
}

function logbookLine(l) {
  if (!l.days_done && !l.reviewable) return 'Дэвтэр хараахан нээгдээгүй байна.';
  return `${l.days_done}/${l.planned_days} өдөр бичсэн${l.missing_days ? `, тэмдэглэлгүй ${l.missing_days} өдөр` : ''}`;
}

function progress(i) {
  const l = i.logbook;
  const started = l.days_done > 0 || l.reviewable;
  const rows = [
    !i.features.plan ? null : rowCard({ lead: leadIcon('plan', 'blue'), title: 'Ажлын төлөвлөгөө', href: i.plan ? `/mentor/plans/${i.id}` : null, lines: [i.plan ? null : 'Оюутан илгээгээгүй байна.'],
      side: i.plan ? badge(PLAN_LABELS[i.plan.status], PLAN_TONES[i.plan.status]) : badge('Илгээгээгүй') }),
    !i.features.logbook ? null : rowCard({ lead: leadIcon('book', 'amber'), title: 'Дадлагын дэвтэр', href: started ? `/mentor/logbook?student=${i.id}` : null, lines: [logbookLine(l)],
      side: !started ? badge('Эхлээгүй') : l.unreviewed ? badge(`Хянаагүй ${l.unreviewed}`, 'pending') : badge('Хянагдсан', 'done') }),
    rowCard({ lead: leadIcon('award', 'violet'), title: 'Байгууллагын үнэлгээ', href: i.score.enterable || i.score.org_status !== 'none' ? `/mentor/scores/${i.id}` : null,
      lines: [i.score.total !== null ? `${i.score.total} / ${i.score.max} оноо` : null], side: orgBadge(i.score) }),
  ].filter(Boolean);
  return h('section', { class: 'panel', 'aria-labelledby': 'h-progress' }, h('h2', { id: 'h-progress' }, 'Явц'), rowList('Явц', rows));
}

export async function render({ params }) {
  let i;
  try { i = await getMyInternship(params.id); } catch { return missing('Оюутан олдсонгүй', '/mentor/students'); }
  return h('div', { class: 'stack' }, backLink('/mentor/students', 'Дадлагажигчид'), studentHead(i.student, statusBadge(i.status)), facts(i),
    i.logbook.alert ? h('div', { class: 'org-banner error' }, icon('alert', 18), h('p', {}, `Тэмдэглэлгүй өдөр ${i.logbook.max_missing_days}-аас хэтэрсэн байна. Оюутанд сануулна уу.`)) : null,
    progress(i));
}
