// Нэгтгэл, статистик: улирлын оюутнуудын явц, дүн; тоон үзүүлэлт. Админ дэлгэрэнгүй рүү орно, тэнхмийн эрхлэгч (pages/head/summary.js) зөвхөн харна.
import { h, pageHead } from '../../core/dom.js';
import { num, fullName } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { INTERNSHIP_LABELS, pickSemester, studentLine } from '../../core/labels.js';
import { tabs, rememberTab, tabStart } from '../../core/tabs.js';
import { adminStats, adminSummary, listSemesters } from '../../data/admin-api.js';
import { emptyState } from '../../components/empty-state.js';
import { stat } from '../../components/facts.js';
import { filterSelect, searchBox, semesterSelect } from '../../components/filters.js';
import { liveList, rowCard } from '../../components/list.js';
import { personAvatar } from '../../components/person.js';
import { statusBadge } from '../../components/status-badge.js';

const KEYS = ['list', 'stats'];

function progress(p) {
  const pct = p.planned_days ? Math.min(100, Math.round((p.days_done / p.planned_days) * 100)) : 0;
  return h('div', { class: 'progress-line' },
    h('div', { class: 'meter', role: 'img', 'aria-label': `${p.days_done}/${p.planned_days} өдөр` }, h('span', { style: { width: `${pct}%` } })),
    h('span', { class: 'muted' }, `${p.days_done}/${p.planned_days} өдөр · ${num(p.hours_done)} цаг`));
}
const gradeText = (g) => (!g ? null : g.total != null ? `${num(g.total)} оноо` : g.mark === 'W' ? 'W' : g.mark === '0' ? '0 оноо' : null);

function listTab(semester, query, detail) {
  const filters = { status: query.get('status') ?? '', q: '' };
  const list = liveList({
    label: 'Нэгтгэл', noun: 'оюутан',
    load: async ({ limit, offset }) => { const r = await adminSummary(semester.id, filters); return { items: r.items.slice(offset, offset + limit), total: r.total }; },
    empty: () => emptyState('Оюутан олдсонгүй', 'Шүүлтээ өөрчилж үзнэ үү.', { icon: 'users' }),
    row: (i) => {
      const late = [i.lateness.logbook && 'Дэвтэр хоцорсон', i.lateness.report && 'Тайлан хоцорсон', i.progress.missing_days > 0 && `Тасалсан ${i.progress.missing_days} өдөр`].filter(Boolean);
      const grade = gradeText(i.grade);
      return rowCard({
        lead: personAvatar(i.student), title: `${i.student.last_name} ${i.student.first_name}`, href: detail?.(i),
        lines: [studentLine(i.student), [i.organization?.name, i.supervisor ? `Удирдагч: ${fullName(i.supervisor)}` : null].filter(Boolean).join(' · ')],
        chips: late, side: h('div', { class: 'row-stack' }, statusBadge(i.status), grade ? h('strong', { class: 'grade' }, grade) : null),
        extra: i.progress.planned_days && i.progress.days_done ? progress(i.progress) : null,
      });
    },
  });
  return h('div', { class: 'stack' },
    searchBox({ label: 'Оюутан хайх', placeholder: 'Нэр, код, и-мэйл', onSearch: (q) => { filters.q = q; list.reload(); } }),
    h('div', { class: 'filter-bar' }, filterSelect('Төлөв', [['', 'Бүх төлөв'], ...Object.entries(INTERNSHIP_LABELS)], filters.status, (v) => { filters.status = v; list.reload(); })),
    list);
}

// ---------- Статистик ----------
function bars(title, pairs, { labels = {}, empty = 'Мэдээлэл алга.', total = null } = {}) {
  const max = Math.max(1, ...pairs.map(([, n]) => n));
  return h('section', { class: 'panel', 'aria-label': title }, h('h2', {}, title),
    pairs.length ? h('ul', { class: 'bars' }, pairs.map(([key, n]) => h('li', { class: 'bar-row' },
      h('span', { class: 'bar-label' }, labels[key] ?? key ?? 'Тодорхойгүй'),
      h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: { width: `${(n / max) * 100}%` } })),
      h('strong', { class: 'bar-n' }, total ? `${n} · ${Math.round((n / total) * 100)}%` : n)))) : h('p', { class: 'muted' }, empty));
}

async function statsTab(semester) {
  const s = await adminStats(semester.id);
  const dist = s.grades.distribution.map((d) => [d.grade, d.count]);
  return h('div', { class: 'stack' },
    h('div', { class: 'stat-row cols-4' },
      stat('violet', 'users', s.students, 'Нийт оюутан'), stat('green', 'award', s.grades.graded, 'Дүн гарсан'), stat('blue', 'chart', s.grades.average ?? '—', 'Дундаж оноо'),
      stat('amber', 'clock', s.grades.deferred, 'Хойшлогдсон (W)'), stat('rose', 'circle-x', s.grades.failed, 'Хангалтгүй (0)'), stat('gray', 'lock', s.stopped, 'Зогсоосон'),
      stat('amber', 'book', s.lateness.logbook, 'Дэвтэр хоцорсон'), stat('rose', 'report', s.lateness.report, 'Тайлан хоцорсон')),
    h('div', { class: 'split even' },
      bars('Төлвөөр', s.by_status, { labels: INTERNSHIP_LABELS }), bars('Дүнгийн хуваарилалт', dist)),
    h('div', { class: 'split even' }, bars('Байгууллагаар', s.by_organization.map(([k, n]) => [k ?? 'Газаргүй', n])), bars('Хөтөлбөрөөр', s.by_program)));
}

/** base — энэ хуудасны хаяг; detail(i) — оюутны мөрний холбоос (байхгүй бол мөр холбоосгүй). */
export const summaryPage = ({ base, detail = null }) => async function render({ query, navigate }) {
  const semesters = await listSemesters();
  const semester = pickSemester(semesters, query.get('semester'));
  if (!semester) return h('div', { class: 'stack' }, pageHead('Нэгтгэл, статистик'), emptyState('Улирал алга', null, { icon: 'chart' }));
  const t = tabs([
    { label: 'Нэгтгэл', icon: 'report', panel: listTab(semester, query, detail) },
    { label: 'Статистик', icon: 'chart', panel: await statsTab(semester) },
  ], { label: 'Нэгтгэлийн хэсгүүд', start: tabStart(KEYS, query) });
  rememberTab(t, KEYS, base, query.get('semester') ? `semester=${query.get('semester')}&` : '');
  return h('div', { class: 'stack' }, pageHead('Нэгтгэл, статистик', semesterSelect(semesters, semester, (id) => navigate(`${base}?semester=${id}`))), t);
};

export const render = summaryPage({ base: '/admin/summary', detail: (i) => `/admin/internships/${i.id}` });
