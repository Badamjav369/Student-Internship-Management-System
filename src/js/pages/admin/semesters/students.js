// «Оюутан, удирдагч багш» таб: улирлын оюутны жагсаалт, шүүлт, удирдагч оноох, оюутан нэмэх/хасах.
import { h, replace } from '../../../core/dom.js';
import { fullName } from '../../../core/format.js';
import { busy } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { INTERNSHIP_LABELS, studentLine } from '../../../core/labels.js';
import { addStudents, assignSupervisors, listCandidates, listInternships, listSupervisors, removeStudent } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { emptyState } from '../../../components/empty-state.js';
import { filterSelect, searchBox } from '../../../components/filters.js';
import { liveList, rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { statusBadge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';

const ASSIGNABLE = ['searching', 'applied'];

// ---------- Оюутан нэмэх ----------
function addPanel(semester, supervisors, onAdded) {
  const picked = new Map();
  const list = h('ul', { class: 'pick-list', 'aria-label': 'Нэмэх боломжтой оюутнууд' });
  const summary = h('p', { class: 'result-count', role: 'status' });
  const supervisor = h('select', { id: 'add-supervisor', 'aria-label': 'Удирдагч багш' }, h('option', { value: '' }, 'Удирдагчгүй'),
    supervisors.map((u) => h('option', { value: String(u.id) }, `${u.last_name[0]}. ${u.first_name}`)));
  const submit = h('button', { class: 'button', type: 'button' }, icon('plus', 18), 'Нэмэх');
  let seq = 0;

  const sync = () => { summary.textContent = picked.size ? `${picked.size} оюутан сонгосон` : ''; submit.disabled = picked.size === 0; };
  async function load(q = '') {
    const mine = ++seq;
    const rows = await listCandidates(semester.id, q);
    if (mine !== seq) return;
    replace(list, rows.length ? rows.map((u) => h('li', {}, h('label', { class: 'pick-row' },
      h('input', { type: 'checkbox', checked: picked.has(u.id), on: { change: (e) => { if (e.target.checked) picked.set(u.id, u); else picked.delete(u.id); sync(); } } }),
      personAvatar(u), h('span', { class: 'pick-text' }, h('strong', {}, `${u.last_name} ${u.first_name}`), h('span', { class: 'muted' }, studentLine(u)))))) : h('li', { class: 'muted pick-empty' }, 'Нэмэх оюутан олдсонгүй.'));
  }
  submit.addEventListener('click', () => busy(submit, async () => {
    try {
      await addStudents(semester.id, [...picked.keys()].map((student_id) => ({ student_id, supervisor_id: supervisor.value ? Number(supervisor.value) : null })));
      toast(`${picked.size} оюутан нэмэгдлээ.`);
      onAdded();
    } catch (error) { toast(error.message, 'error'); }
  }));
  const root = h('section', { class: 'panel', hidden: true, 'aria-label': 'Оюутан нэмэх' },
    h('h2', {}, 'Оюутан нэмэх'),
    searchBox({ label: 'Оюутан хайх', placeholder: 'Нэр, код, и-мэйл', onSearch: load }), list, summary,
    h('div', { class: 'add-bar' }, h('label', { class: 'picker', for: 'add-supervisor' }, h('span', {}, 'Удирдагч'), supervisor), submit));
  sync();
  root.open = () => { root.hidden = false; load(); root.querySelector('input[type="search"]').focus(); };
  return root;
}

// ---------- Жагсаалт ----------
export async function studentsPanel(semester, { query, refresh, editable }) {
  const supervisors = await listSupervisors();
  const filters = { status: query.get('status') ?? '', supervisor: query.get('supervisor') ?? '', q: '' };
  const selected = new Set();
  const root = h('div', { class: 'stack students' });
  let selectMode = false;
  let list;

  const bulkSupervisor = h('select', { id: 'bulk-supervisor', 'aria-label': 'Удирдагч багш' }, supervisors.map((u) => h('option', { value: String(u.id) }, `${u.last_name[0]}. ${u.first_name}`)));
  const bulkGo = h('button', { class: 'button', type: 'button' }, 'Оноох');
  const bulkBar = h('div', { class: 'bulk-bar', hidden: true, role: 'group', 'aria-label': 'Багцаар оноох' },
    h('span', { class: 'bulk-count', role: 'status' }), bulkSupervisor, bulkGo,
    h('button', { class: 'button quiet', type: 'button', on: { click: () => setMode(false) } }, 'Болих'));
  const bulkCount = bulkBar.querySelector('.bulk-count');
  const syncBulk = () => { bulkCount.textContent = `${selected.size} сонгосон`; bulkGo.disabled = selected.size === 0; };

  function setMode(on) {
    selectMode = on;
    selected.clear();
    root.dataset.select = String(on);
    bulkBar.hidden = !on;
    toggle.setAttribute('aria-pressed', String(on));
    syncBulk();
    list.reload();
  }
  const toggle = h('button', { class: 'button secondary', type: 'button', 'aria-pressed': 'false', on: { click: () => setMode(!selectMode) } }, icon('users', 18), 'Багцаар оноох');
  bulkGo.addEventListener('click', () => busy(bulkGo, async () => {
    try {
      await assignSupervisors([...selected].map((internship_id) => ({ internship_id, supervisor_id: Number(bulkSupervisor.value) })));
      toast(`${selected.size} оюутанд удирдагч оноолоо.`);
      refresh();
    } catch (error) { toast(error.message, 'error'); }
  }));

  const add = editable ? addPanel(semester, supervisors, refresh) : null;
  const addButton = editable ? h('button', { class: 'button', type: 'button', on: { click: () => add.open() } }, icon('plus', 18), 'Оюутан нэмэх') : null;

  list = liveList({
    label: 'Улирлын оюутнууд', noun: 'оюутан',
    load: ({ limit, offset }) => listInternships(semester.id, { ...filters, limit, offset }),
    empty: () => emptyState('Оюутан олдсонгүй', filters.q || filters.status || filters.supervisor ? 'Шүүлтээ өөрчилж үзнэ үү.' : null, { icon: 'users' }),
    row: (i) => {
      const assignable = ASSIGNABLE.includes(i.status);
      const removable = editable && i.status === 'searching' && !i.organization;
      return rowCard({
        lead: h('div', { class: 'row-lead' },
          assignable ? h('input', { class: 'row-check', type: 'checkbox', checked: selected.has(i.id), 'aria-label': `${i.student.last_name} ${i.student.first_name}-г сонгох`, on: { change: (e) => { if (e.target.checked) selected.add(i.id); else selected.delete(i.id); syncBulk(); } } }) : null,
          personAvatar(i.student)),
        title: `${i.student.last_name} ${i.student.first_name}`, href: `/admin/internships/${i.id}`,
        lines: [studentLine(i.student), [i.organization?.name, i.supervisor ? `Удирдагч: ${fullName(i.supervisor)}` : 'Удирдагч оноогоогүй'].filter(Boolean).join(' · ')],
        side: statusBadge(i.status),
        actions: removable ? actionButton('Хасах', { variant: 'quiet', small: true, iconName: 'trash',
          confirm: { title: 'Оюутныг улирлаас хасах уу?', body: [`${i.student.last_name} ${i.student.first_name}`], confirmLabel: 'Хасах' }, run: () => removeStudent(i.id), done: 'Оюутан хасагдлаа.', after: refresh }) : null,
      });
    },
  });
  const reload = () => list.reload();
  const statuses = [['', 'Бүх төлөв'], ...Object.entries(INTERNSHIP_LABELS)];
  const who = [['', 'Бүх удирдагч'], ['none', 'Удирдагчгүй'], ...supervisors.map((u) => [String(u.id), fullName(u)])];

  replace(root,
    h('div', { class: 'toolbar' }, addButton, h('span', { class: 'spacer' }), toggle),
    add,
    bulkBar,
    searchBox({ label: 'Оюутан хайх', placeholder: 'Нэр, код, и-мэйл', onSearch: (q) => { filters.q = q; reload(); } }),
    h('div', { class: 'filter-bar' },
      filterSelect('Төлөв', statuses, filters.status, (v) => { filters.status = v; reload(); }),
      filterSelect('Удирдагч', who, filters.supervisor, (v) => { filters.supervisor = v; reload(); })),
    list);
  return root;
}
