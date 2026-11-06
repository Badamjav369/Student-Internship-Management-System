// Зөвхөн комиссын гишүүний хуудсуудад хэрэгтэй: миний хувьд оюутны төлөв, хамгаалалтын цаг, «хийх ажил», оюутан байхгүй үеийн тайлбар.
import { h } from '../../core/dom.js';
import { formatDate, fullName } from '../../core/format.js';
import { emptyState } from '../../components/empty-state.js';
import { factTile } from '../../components/facts.js';
import { badge } from '../../components/status-badge.js';

export const STATE_LABELS = { todo: 'Оноо өгнө', entered: 'Оноо оруулсан', done: 'Баталгаажсан', waiting: 'Материал бэлэн болоогүй', observe: 'Дарга оноо оруулна' };
export const STATE_TONES = { todo: 'pending', entered: 'active', done: 'done', waiting: 'none', observe: 'none' };
/** Миний хувьд төлвийн шошго (0 / W тэмдэглэсэн бол тусад нь). */
export const stateBadge = (s) => (s.lock === 'marked' ? badge('0 / W тэмдэглэсэн', 'attention') : badge(STATE_LABELS[s.state], STATE_TONES[s.state]));

const hm = (t) => (t ? String(t).slice(0, 5) : '');
/** «2026.12.08 10:40» */
export const whenText = (d) => [formatDate(d.date), hm(d.time)].filter(Boolean).join(' ');

/** Хамгаалалтын байршил (эсвэл онлайн холбоос)-ын хавтан. */
export const placeTile = (format, place) => factTile(format === 'online' ? 'link' : 'building', 'violet', format === 'online' ? 'Онлайн холбоос' : 'Байршил',
  h('strong', {}, format === 'online' && /^https?:/.test(place) ? h('a', { href: place, target: '_blank', rel: 'noopener noreferrer' }, place) : place));

export const NO_STUDENTS = 'Тэнхим комиссын хуваарийг нийтэлсний дараа таны үнэлэх оюутнууд энд харагдана.';
export const noStudents = () => emptyState('Хуваарилагдсан оюутан алга', NO_STUDENTS, { icon: 'users' });

/** Нүүрний «Хийх ажил»: оноо оруулаагүй оюутнууд хамгаалалтын цагаар. */
export function todoItems(students) {
  return students.filter((s) => s.state === 'todo').map((s) => ({
    icon: 'award', tone: 'violet', text: `${fullName(s.student)}: оноо оруулна уу (${s.committee.name}, ${whenText(s.defense)}).`, href: `/committee/students/${s.id}`, action: 'Оноо өгөх',
  }));
}
