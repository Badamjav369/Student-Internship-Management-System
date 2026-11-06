// Дадлагын дэвтэр хянах: оюутан сонгож, долоо хоногоор өдөр бүрийн төлөвлөсөн ажил, бичсэн тэмдэглэл, хавсралтыг харна.
// Хянаагүй өдөр бүрт санал бичиж болно (заавал биш); долоо хоногийг хянасан болговол оюутан тэдгээрийг засахгүй.
// Дизайн нь оюутны дэвтэртэй нэг хэлтэй (өдрийн карт).
import { h, pageHead, replace } from '../../core/dom.js';
import { fileButton } from '../../core/files.js';
import { formatDate, hoursText, mondayOf, shortDate } from '../../core/format.js';
import { field } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { nameOf, studentLine } from '../../core/labels.js';
import { getLogbook, listMyInternships, mentorToday, reviewDays } from '../../data/mentor-api.js';
import { actionButton } from '../../components/action-button.js';
import { commentCard } from '../../components/comment-card.js';
import { dayCard, dayState, plannedNote } from '../../components/day-card.js';
import { emptyState } from '../../components/empty-state.js';
import { statTile } from '../../components/facts.js';
import { filterSelect } from '../../components/filters.js';
import { badge } from '../../components/status-badge.js';
import { noInterns } from './shared.js';

const OPEN_STATES = ['in_progress', 'reporting', 'ready', 'evaluating', 'deferred', 'failed', 'stopped', 'completed'];

export async function render({ query, navigate, refresh }) {
  const interns = await listMyInternships();
  const head = (...extra) => pageHead('Дадлагын дэвтэр', ...extra);
  if (!interns.length) return h('section', {}, head(), noInterns());
  const wanted = Number(query.get('student'));
  const intern = interns.find((x) => x.id === wanted) ?? interns.find((x) => x.logbook.reviewable && x.logbook.unreviewed) ?? interns.find((x) => x.logbook.days_done) ?? interns[0];
  const picker = filterSelect('Оюутан', interns.map((x) => [String(x.id), `${nameOf(x.student)}${x.logbook.reviewable && x.logbook.unreviewed ? ` · ${x.logbook.unreviewed} хянаагүй` : ''}`]), String(intern.id),
    (id) => navigate(`/mentor/logbook?student=${id}`));
  const top = h('div', { class: 'stack' }, picker, h('p', { class: 'muted' }, studentLine(intern.student)));
  if (!OPEN_STATES.includes(intern.status)) return h('section', {}, head(), top, emptyState('Дэвтэр хараахан нээгдээгүй', 'Ажлын төлөвлөгөө батлагдсаны дараа оюутан өдөр бүр тэмдэглэл бичнэ.', { icon: 'book' }));

  const today = mentorToday();
  const { days, reviewable } = await getLogbook(intern.id);
  const weeks = new Map();
  for (const d of days) if (d.entry || d.date <= today) weeks.set(mondayOf(d.date), null);
  const mondays = [...weeks.keys()].sort().reverse();
  if (!mondays.length) return h('section', {}, head(), top, emptyState('Дэвтэр хараахан нээгдээгүй', null, { icon: 'book' }));
  const sections = new Map(mondays.map((m) => [m, h('section', { class: 'week', 'aria-labelledby': `h-week-${m}` })]));
  const weekDays = (monday) => days.filter((d) => mondayOf(d.date) === monday);
  const comments = new Map(); // date → бичсэн санал (дахин зурахад алдагдахгүй)
  const expanded = new Set(days.filter((d) => reviewable && d.entry && !d.entry.reviewed_at).map((d) => d.date));
  const summary = h('div', { class: 'stat-row text' });

  function body(d, state) {
    const e = d.entry;
    if (!e) return [plannedNote(d.planned_task), h('p', { class: 'muted' }, 'Тэмдэглэл бичигдээгүй.')];
    return [
      plannedNote(d.planned_task),
      h('p', { class: 'prose entry-text' }, e.work_done),
      e.files?.length ? h('ul', { class: 'files', 'aria-label': 'Хавсаргасан файл' }, e.files.map((f) => h('li', {}, fileButton(f)))) : null,
      e.mentor_comment ? commentCard({ role: 'Таны санал', text: e.mentor_comment, advice: true }) : null,
      state === 'reviewed' ? h('p', { class: 'reviewed-note' }, icon('lock', 16), `Хянасан ${formatDate(e.reviewed_at.slice(0, 10))}`) : null,
      reviewable && state === 'written' ? field({ label: 'Санал (заавал биш)', name: `comment-${d.date}`, type: 'textarea', rows: 3, maxlength: 2000, value: comments.get(d.date) ?? '',
        on: { input: (event) => comments.set(d.date, event.target.value) } }) : null,
    ];
  }

  function card(d) {
    const state = dayState(d, today);
    const isOpen = expanded.has(d.date);
    const toggle = () => { if (isOpen) expanded.delete(d.date); else expanded.add(d.date); redraw(mondayOf(d.date)); };
    return dayCard(d, state, { open: isOpen, onToggle: toggle, body: isOpen ? body(d, state) : null });
  }

  function weekContent(monday) {
    const wd = weekDays(monday);
    const written = wd.filter((d) => d.entry);
    const pending = written.filter((d) => !d.entry.reviewed_at);
    const hours = written.reduce((sum, d) => sum + Number(d.entry.hours), 0);
    const review = reviewable && pending.length ? actionButton(`Долоо хоногийг хянасан болгох (${pending.length})`, { variant: 'primary', iconName: 'check',
      confirm: { title: 'Долоо хоногийг хянасан болгох уу?', body: [`${pending.length} өдрийн тэмдэглэл хянагдана. Хянасны дараа оюутан тэдгээрийг засах боломжгүй.`] },
      run: () => reviewDays(intern.id, pending.map((d) => ({ date: d.date, comment: comments.get(d.date) }))), done: `${pending.length} өдрийн тэмдэглэлийг хянаж, оюутанд мэдэгдлээ.`, after: refresh }) : null;
    return [
      h('div', { class: 'tab-summary' },
        h('h2', { class: 'section-title', id: `h-week-${monday}` }, `${formatDate(wd[0].date)} – ${shortDate(wd.at(-1).date)}`),
        h('div', { class: 'chips' }, h('span', { class: 'chip' }, `${written.length} өдөр`), h('span', { class: 'chip' }, hoursText(hours)),
          written.length && !pending.length ? badge('Хянагдсан', 'done') : null)),
      h('ul', { class: 'day-cards' }, wd.map(card)),
      review ? h('div', { class: 'form-submit' }, review) : null,
    ];
  }

  const redraw = (monday) => replace(sections.get(monday), weekContent(monday));
  const written = days.filter((d) => d.entry);
  const missingDays = days.filter((d) => dayState(d, today) === 'missing').length;
  replace(summary,
    statTile('Бичсэн', `${written.length} / ${days.length} өдөр`, 'violet', 'book'),
    statTile('Нийт цаг', hoursText(written.reduce((s, d) => s + Number(d.entry.hours), 0)), 'blue', 'clock'),
    statTile('Хянагдсан', `${written.filter((d) => d.entry.reviewed_at).length} өдөр`, 'green', 'circle-check'),
    missingDays ? statTile('Бичигдээгүй', `${missingDays} өдөр`, 'rose', 'alert') : statTile('Бичигдээгүй', 'Байхгүй', 'green', 'check'));
  for (const m of mondays) redraw(m);
  const closed = reviewable ? null : h('div', { class: 'org-banner info' }, icon('info', 18), h('p', {}, 'Дадлага дууссан. Зөвхөн харах боломжтой.'));
  return h('section', {}, head(), h('div', { class: 'stack' }, top, summary, closed, h('div', { class: 'weeks' }, [...sections.values()])));
}
