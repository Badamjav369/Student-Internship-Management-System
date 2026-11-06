// Хамгаалалт: нэг мөрөнд 2 хайрцаг — онцолсон «огноо + цаг» (цаг том) ба «хэлбэр + байршил/холбоос»; дарга/багш/оюутан бүгд нэг хайрцагт.
// Хуваарь гараагүй бол төлвийг нэрлэнэ. Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй.
import { h, pageHead } from '../../core/dom.js';
import { formatDate, weekday } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { getDashboard, getDefense } from '../../data/student-api.js';
import { emptyState } from '../../components/empty-state.js';
import { noInternship } from './shared.js';

const safeUrl = (value) => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };

function waiting(i) {
  const text = {
    reporting: ['Хуваарь хараахан гараагүй'],
    ready: ['Хуваарь хараахан гараагүй'],
    deferred: ['Хамгаалалт хойшлогдсон (W)'],
    failed: ['Хамгаалалт товлогдоогүй', 'Тайлан хугацаандаа хүлээн авагдаагүй эсвэл 0 үнэлгээ тэмдэглэгдсэн.'],
    stopped: ['Дадлага зогссон'],
  }[i.status] ?? ['Хамгаалалт хараахан товлогдоогүй'];
  return emptyState(text[0], text[1] ?? null, { icon: 'calendar' });
}

// Хайрцаг доторх нэг хэсэг: гарчиг, утга, тайлбар. Дүрс нэмэх, холбоос болгох боломжтой.
const part = (label, value, { iconName = null, tone = 'violet', hint = null, href = null } = {}) => h(href ? 'a' : 'div', { class: 'ds-part', ...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}) },
  iconName ? h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 20)) : null,
  h('div', {}, h('span', { class: 'ds-label' }, label), h('strong', {}, value), hint ? h('span', { class: 'ds-hint' }, hint) : null));

function schedule(defense, c) {
  const online = c.format === 'online';
  const url = online ? safeUrl(c.online_url) : null;
  const when = h('div', { class: 'ds-card ds-when' },
    h('div', { class: 'ds-date' }, h('span', { class: 'ds-icon', 'aria-hidden': 'true' }, icon('calendar', 24)),
      h('div', {}, h('span', { class: 'ds-label' }, 'Огноо'), h('strong', {}, formatDate(c.defense_date)), h('span', { class: 'ds-hint' }, `${weekday(c.defense_date)} гараг`))),
    h('div', { class: 'ds-time' }, h('span', { class: 'ds-label' }, defense.slot_time ? 'Таны цаг' : 'Эхлэх цаг'), h('strong', {}, defense.slot_time ?? c.start_time)));
  const where = h('div', { class: 'ds-card ds-where' },
    part('Хэлбэр', online ? 'Онлайн' : 'Танхимд', { iconName: online ? 'globe' : 'building', tone: online ? 'blue' : 'amber' }),
    online
      ? part('Хурлын холбоос', url ? new URL(url).host : (c.online_url ?? 'Тэнхим зарлана'), { iconName: 'link', tone: 'green', href: url, hint: url ? 'Онлайн хуралд нэгдэх' : null })
      : part('Байршил', c.location ?? 'Тэнхим зарлана', { iconName: 'pin', tone: 'green' }));
  return h('div', { class: 'defense-row' }, when, where);
}

const ROLES = { chair: 'Дарга', teacher: 'Багш', student: 'Оюутан' };

// Комиссын бүх гишүүн нэг хайрцагт: дарга, багш нар, дараа нь оюутнууд.
function members(c) {
  const order = Object.keys(ROLES);
  const list = [...c.members].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  return h('section', { class: 'members-box', 'aria-label': 'Комиссын гишүүд' },
    h('ul', { class: 'members' }, list.map((m) => h('li', { class: 'member', dataset: { role: m.role } },
      h('span', { class: 'member-avatar', 'aria-hidden': 'true' }, `${m.last_name[0]}${m.first_name[0]}`),
      h('div', {}, h('strong', {}, `${m.last_name} ${m.first_name}`), h('span', {}, ROLES[m.role]))))));
}

export async function render() {
  const dash = await getDashboard();
  const i = dash.internship;
  if (!i) return noInternship('Хамгаалалт', 'calendar');
  const defense = await getDefense();
  if (!defense.scheduled) return h('section', {}, pageHead('Хамгаалалт'), waiting(i));
  const c = defense.committee;
  return h('section', {}, pageHead('Хамгаалалт'), h('div', { class: 'stack' }, schedule(defense, c), members(c)));
}
