// Хэрэглэгчдийн жагсаалт: дүр, төлөв, хайлтаар шүүнэ.
import { h, pageHead } from '../../../core/dom.js';
import { ROLE_LABELS } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { studentLine } from '../../../core/labels.js';
import { listSemesters, listUsers } from '../../../data/admin-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { chipRow, searchBox } from '../../../components/filters.js';
import { liveList, rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { badge } from '../../../components/status-badge.js';
import { roleText, USER_STATUS, USER_TONES } from '../shared.js';

const ROLE_OPTIONS = [['', 'Бүгд'], ...Object.entries(ROLE_LABELS)];
const STATUS_OPTIONS = [['', 'Бүх төлөв'], ...Object.entries(USER_STATUS)];

export async function render({ query }) {
  const semesters = await listSemesters();
  const filters = { role: query.get('role') ?? '', status: query.get('status') ?? '', q: '' };
  const list = liveList({
    label: 'Хэрэглэгчид', noun: 'хэрэглэгч',
    load: (page) => listUsers({ ...filters, ...page }),
    empty: () => emptyState('Хэрэглэгч олдсонгүй', 'Шүүлтээ өөрчилж үзнэ үү.', { icon: 'users' }),
    row: (u) => rowCard({
      lead: personAvatar(u), title: `${u.last_name} ${u.first_name}`, href: `/admin/users/${u.id}`,
      lines: [u.email, studentLine(u)], chips: roleText(u.roles, semesters), side: badge(USER_STATUS[u.status], USER_TONES[u.status]),
    }),
  });
  const reload = () => list.reload();
  const aside = h('div', { class: 'actions' },
    h('a', { class: 'button secondary', href: '#/admin/users/import' }, icon('upload', 18), 'Excel-ээр бүртгэх'),
    h('a', { class: 'button', href: '#/admin/users/new' }, icon('plus', 18), 'Хэрэглэгч нэмэх'));
  return h('div', { class: 'stack' }, pageHead('Хэрэглэгч', aside),
    searchBox({ label: 'Хэрэглэгч хайх', placeholder: 'Нэр, код, и-мэйл', onSearch: (q) => { filters.q = q; reload(); } }),
    chipRow('Эрх', ROLE_OPTIONS, filters.role, (v) => { filters.role = v; reload(); }),
    chipRow('Төлөв', STATUS_OPTIONS, filters.status, (v) => { filters.status = v; reload(); }),
    list);
}
