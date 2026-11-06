// Оюутны дэлгэрэнгүй: газар, хугацаа, дэвтрийн ирц, гэрээ; төлөвлөгөө, тайлан, оноо руу орох товч.
import { h } from '../../../core/dom.js';
import { formatRange, hoursText } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { PLAN_LABELS, PLAN_TONES, REPORT_LABELS } from '../../../core/labels.js';
import { getMyInternship } from '../../../data/supervisor-api.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { leadIcon, rowCard, rowList } from '../../../components/list.js';
import { studentHead } from '../../../components/student-head.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { RECORD_LABELS, RECORD_TONES, scoreAction } from '../shared.js';

function facts(i) {
  const l = i.logbook;
  const pct = l.planned_days ? Math.min(100, Math.round((l.days_done / l.planned_days) * 100)) : 0;
  return h('div', { class: 'fact-grid' }, ...[
    factTile('building', 'violet', 'Байгууллага', i.organization ? h('strong', {}, i.organization.name) : h('strong', { class: 'muted' }, 'Газар тодорхойгүй')),
    factTile('calendar', 'blue', 'Дадлагын хугацаа', h('strong', {}, i.start_date ? formatRange(i.start_date, i.end_date) : '—')),
    !i.features.logbook ? null : factTile('clock', 'amber', 'Дадлагын дэвтэр', h('strong', {}, `${l.days_done}/${l.planned_days} өдөр · ${hoursText(l.hours_done)}`),
      h('div', { class: 'meter', role: 'img', 'aria-label': `${pct}%` }, h('span', { style: { width: `${pct}%` } })),
      l.missing_days ? h('span', { class: 'fact-label' }, `Тэмдэглэлгүй ${l.missing_days} өдөр`) : null)].filter(Boolean));
}

function progress(i) {
  const go = (id, kind) => `/supervisor/${kind}/${id}`;
  const rows = [
    !i.features.plan ? null : rowCard({ lead: leadIcon('plan', 'blue'), title: 'Ажлын төлөвлөгөө', href: i.plan ? go(i.id, 'plans') : null, lines: [i.plan ? null : 'Оюутан илгээгээгүй байна.'],
      side: i.plan ? badge(PLAN_LABELS[i.plan.status], PLAN_TONES[i.plan.status]) : badge('Илгээгээгүй') }),
    rowCard({ lead: leadIcon('report', 'green'), title: 'Тайлан', href: i.report ? go(i.id, 'reports') : null, lines: [i.report ? null : 'Тайлангийн хугацаа эхлээгүй байна.'],
      side: i.report ? statusBadge(i.report.status, REPORT_LABELS) : badge('Эхлээгүй') }),
    rowCard({ lead: leadIcon('award', 'violet'), title: 'Оноо, эцсийн дүн', href: i.score ? go(i.id, 'scores') : null, lines: [i.score ? scoreLine(i) : 'Онооны бүртгэл үүсээгүй байна.'],
      side: i.score ? badge(RECORD_LABELS[i.score.status], RECORD_TONES[i.score.status]) : badge('Эхлээгүй') }),
  ].filter(Boolean);
  return h('section', { class: 'panel', 'aria-labelledby': 'h-progress' }, h('h2', { id: 'h-progress' }, 'Явц'), rowList('Явц', rows));
}
function scoreLine(i) {
  const s = i.score;
  if (s.mark) return `Хамгаалаагүй: ${s.mark}`;
  if (s.total !== null) return `Нийт оноо: ${Number(s.total.toFixed(1))}`;
  return scoreAction(i) ? 'Таны шийдвэр хүлээж байна.' : 'Үнэлгээ хийгдэж байна.';
}

export async function render({ params }) {
  let i;
  try { i = await getMyInternship(params.id); } catch { return missing('Оюутан олдсонгүй', '/supervisor/students'); }
  return h('div', { class: 'stack' }, backLink('/supervisor/students', 'Миний оюутнууд'), studentHead(i.student, statusBadge(i.status)), facts(i),
    i.logbook.alert ? h('div', { class: 'org-banner error' }, icon('alert', 18), h('p', {}, `Тэмдэглэлгүй өдөр ${i.logbook.max_missing_days}-аас хэтэрсэн байна. Оюутанд сануулна уу.`)) : null,
    progress(i));
}
