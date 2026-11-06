// Үнэлгээ: байгууллага ба комиссын онооны явц, эцсийн дүн, шалгуур. Баталгаажаагүй оноог харуулахгүй — эцсийн дүн гарсны дараа
// нийт оноо, бүрэлдэхүүн тус бүрийн оноо, шалгуур тус бүрийн оноо харагдана; тэр болтол оноо «—». Оноо бүрийн дээр жижиг төлөв.
// Хамгаалаагүй бол 0 эсвэл W. Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй: тоон хавтан, шалгуурын карт.
import { h, pageHead } from '../../core/dom.js';
import { num } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { getDashboard, getEvaluation } from '../../data/student-api.js';
import { emptyState } from '../../components/empty-state.js';
import { badge, toneOf } from '../../components/status-badge.js';
import { noInternship } from './shared.js';

const TITLES = { org: 'Байгууллагын үнэлгээ', committee: 'Комиссын үнэлгээ' };
const ICONS = { org: 'building', committee: 'users' };
const maxOf = (criteria, component) => criteria.filter((c) => c.component === component).reduce((a, c) => a + c.max_score, 0);

// Оноо бүрийн хавтан: дээр нь жижиг төлөв, дунд оноо, доор нэр.
function scoreTile({ title, value, state, tone, iconName, accent = false }) {
  return h('div', { class: ['stat', accent && 'accent'] },
    h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 20)),
    h('div', {}, h('span', { class: 'stat-state' }, badge(state.label, toneOf(state.status))), h('strong', {}, value), h('span', {}, title)));
}

function stats(e) {
  const max = { org: maxOf(e.criteria, 'org'), committee: maxOf(e.criteria, 'committee') };
  const own = { label: e.status_label, status: e.status };
  if (e.mark !== null && e.mark !== undefined && e.mark !== '') {
    const w = String(e.mark) === 'W';
    return h('div', { class: 'stat-row text' }, scoreTile({ title: w ? 'Хамгаалалт хойшлогдсон' : 'Хангалтгүй', value: String(e.mark), state: own, tone: w ? 'amber' : 'rose', iconName: 'award', accent: true }));
  }
  const final = e.final;
  const of = (value, top) => `${value === null || value === undefined ? '—' : num(value)} / ${num(top)}`;
  return h('div', { class: 'stat-row text' },
    scoreTile({ title: 'Нийт оноо', value: of(final?.total, max.org + max.committee), state: own, tone: 'violet', iconName: 'award', accent: true }),
    ...['org', 'committee'].map((key) => scoreTile({
      title: TITLES[key], value: of(final?.[`${key}_score`], max[key]), state: e[key], tone: key === 'org' ? 'blue' : 'green', iconName: ICONS[key],
    })));
}

function criterion(c, got) {
  const has = got?.has(c.id);
  const value = has ? Number(got.get(c.id)) : 0;
  return h('li', { class: 'criterion' },
    h('div', { class: 'criterion-head' }, h('strong', {}, c.name),
      got ? h('span', { class: 'criterion-score' }, `${has ? num(value) : '—'} / ${num(c.max_score)}`) : h('span', { class: 'chip' }, `${num(c.max_score)} оноо`)),
    got ? h('div', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: { width: `${c.max_score ? Math.min(100, (value / c.max_score) * 100) : 0}%` } })) : null);
}

function group(e, key, got) {
  const list = e.criteria.filter((c) => c.component === key);
  if (!list.length) return null;
  return h('section', { class: 'stack', 'aria-labelledby': `h-${key}` },
    h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title', id: `h-${key}` }, TITLES[key]), h('span', { class: 'chip' }, `${num(maxOf(e.criteria, key))} оноо`)),
    h('ul', { class: 'criteria' }, list.map((c) => criterion(c, got))));
}

export async function render() {
  const dash = await getDashboard();
  if (!dash.internship) return noInternship('Үнэлгээ', 'award');
  const e = await getEvaluation();
  const got = e.final && e.final.total !== null && e.final.total !== undefined ? new Map((e.final.criteria ?? []).map((r) => [r.criterion_id, r.value])) : null;
  return h('section', {}, pageHead('Үнэлгээ'),
    h('div', { class: 'stack' }, stats(e), e.criteria.length === 0 ? emptyState('Шалгуур тохируулаагүй байна', null, { icon: 'award' }) : [group(e, 'org', got), group(e, 'committee', got)]));
}
