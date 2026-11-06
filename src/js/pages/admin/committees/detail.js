// Комиссын дэлгэрэнгүй: хамгаалалтын хуваарь (оюутан, цаг, дараалал), тохиргоо (өдөр, хэлбэр, гишүүд), нийтлэх.
import { h, pageHead, replace } from '../../../core/dom.js';
import { formatDate, fullName } from '../../../core/format.js';
import { clearErrors, field, showErrors, values, busy, formRow, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { studentLine } from '../../../core/labels.js';
import { deleteCommittee, getCommittee, getSemester, listCommitteeMembers, listCommittees, listInternships, publishCommittee, saveCommittee, saveSlots } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { kindCards } from '../../../components/kind-cards.js';
import { personAvatar } from '../../../components/person.js';
import { badge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { FORMATS } from './index.js';

const STEP = 40;
const toMinutes = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
const fromMinutes = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// ---------- Хуваарь ----------
function slotsPanel(c, candidates, { refresh }) {
  const slots = c.slots.map((s) => ({ internship_id: s.internship_id, slot_time: s.slot_time, student: s.student }));
  const list = h('ol', { class: 'slot-list', 'aria-label': 'Хамгаалалтын дараалал' });
  const pool = h('select', { id: 'slot-add', 'aria-label': 'Оюутан' });
  const addBtn = h('button', { class: 'button secondary', type: 'button' }, icon('plus', 18), 'Нэмэх');
  const save = h('button', { class: 'button', type: 'button' }, icon('check', 18), 'Хуваарь хадгалах');

  const draw = () => {
    replace(list, slots.length ? slots.map((s, k) => h('li', { class: 'slot-row' },
      h('span', { class: 'slot-no', 'aria-hidden': 'true' }, k + 1),
      h('div', { class: 'slot-who' }, h('strong', {}, `${s.student.last_name} ${s.student.first_name}`), h('span', { class: 'muted' }, s.student.student_code)),
      h('input', { class: 'slot-time', type: 'time', value: s.slot_time, 'aria-label': `${s.student.first_name}-ийн цаг`, on: { change: (e) => { s.slot_time = e.target.value; } } }),
      h('div', { class: 'slot-ctl' },
        h('button', { class: 'icon-button flat', type: 'button', disabled: k === 0, 'aria-label': 'Дээш', on: { click: () => { [slots[k - 1], slots[k]] = [slots[k], slots[k - 1]]; draw(); } } }, icon('chevron', 16)),
        h('button', { class: 'icon-button flat', type: 'button', disabled: k === slots.length - 1, 'aria-label': 'Доош', on: { click: () => { [slots[k + 1], slots[k]] = [slots[k], slots[k + 1]]; draw(); } } }, icon('chevron', 16)),
        h('button', { class: 'icon-button flat', type: 'button', 'aria-label': 'Хасах', on: { click: () => { slots.splice(k, 1); draw(); } } }, icon('close', 16)))))
      : h('li', { class: 'muted slot-empty' }, 'Оюутан нэмээгүй байна.'));
    const free = candidates.filter((i) => !slots.some((s) => s.internship_id === i.id));
    replace(pool, free.length ? free.map((i) => h('option', { value: String(i.id) }, `${i.student.last_name} ${i.student.first_name} · ${studentLine(i.student)}`)) : h('option', { value: '' }, 'Нэмэх оюутан алга'));
    pool.disabled = addBtn.disabled = free.length === 0;
  };
  addBtn.addEventListener('click', () => {
    const i = candidates.find((x) => String(x.id) === pool.value);
    if (!i) return;
    const last = slots.at(-1);
    const next = last ? fromMinutes(toMinutes(last.slot_time) + STEP) : (c.start_time ?? '10:00');
    slots.push({ internship_id: i.id, slot_time: next, student: i.student });
    draw();
  });
  save.addEventListener('click', () => busy(save, async () => {
    try {
      await saveSlots(c.id, slots.map((s, k) => ({ internship_id: s.internship_id, order_no: k + 1, slot_time: s.slot_time || '10:00' })));
      toast('Хуваарь хадгалагдлаа.');
      refresh();
    } catch (error) { toast(error.message, 'error'); }
  }));
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'h-slots' }, h('h2', { id: 'h-slots' }, 'Хамгаалалтын хуваарь'), list,
    h('div', { class: 'add-bar' }, h('label', { class: 'picker grow', for: 'slot-add' }, h('span', {}, 'Оюутан'), pool), addBtn),
    h('div', { class: 'form-submit' }, save));
}

// ---------- Тохиргоо ----------
function settingsPanel(c, semester, members, { refresh }) {
  const chair = c.members.find((m) => m.is_chair)?.user_id;
  const picked = new Set(c.members.map((m) => m.user_id));
  const chairInputs = [];
  const memberRows = members.map((u) => {
    const check = h('input', { type: 'checkbox', checked: picked.has(u.id), 'aria-label': `${fullName(u)} гишүүн`, on: { change: (e) => { if (e.target.checked) picked.add(u.id); else picked.delete(u.id); sync(); } } });
    const radio = h('input', { type: 'radio', name: 'chair', value: String(u.id), checked: chair === u.id, 'aria-label': `${fullName(u)} дарга` });
    chairInputs.push([u.id, radio]);
    return h('li', { class: 'member-row' }, h('label', { class: 'check' }, check, personAvatar(u), h('span', { class: 'pick-text' }, h('strong', {}, `${u.last_name} ${u.first_name}`))),
      h('label', { class: 'check chair' }, radio, h('span', {}, 'Дарга')));
  });
  const sync = () => { for (const [id, radio] of chairInputs) { radio.disabled = !picked.has(id); if (radio.disabled) radio.checked = false; } };
  sync();

  const format = kindCards('Хэлбэр', [{ value: 'onsite', label: FORMATS.onsite, hint: 'Байранд', icon: 'building' }, { value: 'online', label: FORMATS.online, hint: 'Холбоосоор', icon: 'globe', tone: 'blue' }], { name: 'format', value: c.format });
  const where = h('div', {}, field({ label: 'Байршил', name: 'location', value: c.location ?? '', maxlength: 150 }), field({ label: 'Онлайн холбоос', name: 'online_url', type: 'url', value: c.online_url ?? '', maxlength: 300, placeholder: 'https://' }));
  const syncWhere = () => {
    const online = form.elements.format.value === 'online';
    where.children[0].hidden = online; where.children[1].hidden = !online;
  };
  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), 'Хадгалах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Комиссын тохиргоо' },
    field({ label: 'Нэр', name: 'name', value: c.name, required: true, maxlength: 60 }),
    formRow(field({ label: 'Хамгаалах өдөр', name: 'defense_date', type: 'date', value: c.defense_date ?? '', hint: semester.defense_from ? `${formatDate(semester.defense_from)} – ${formatDate(semester.defense_to)}` : null }),
      field({ label: 'Эхлэх цаг', name: 'start_time', type: 'time', value: c.start_time ?? '' })),
    format, where,
    h('fieldset', { class: 'role-picker' }, h('legend', {}, 'Гишүүд'), memberRows.length ? h('ul', { class: 'member-list' }, memberRows) : h('p', { class: 'muted' }, 'Комиссын гишүүн алга.')),
    h('div', { class: 'form-submit' }, submit));
  form.addEventListener('change', (e) => { if (e.target.name === 'format') syncWhere(); });
  syncWhere();

  onSubmit(form, submit, async () => {
    clearErrors(form);
    const v = values(form);
    const errors = {};
    if (!v.name.trim()) errors.name = 'Нэр бичнэ үү.';
    if (v.defense_date && ((semester.defense_from && v.defense_date < semester.defense_from) || (semester.defense_to && v.defense_date > semester.defense_to))) errors.defense_date = 'Хамгаалалтын хугацаанд багтаана уу.';
    if (v.format === 'online' && v.online_url && !/^https?:\/\//i.test(v.online_url)) errors.online_url = 'Холбоос http:// эсвэл https://-ээр эхэлнэ.';
    const chairId = Number(v.chair);
    if (picked.size && !chairId) errors.name ??= 'Комиссын даргаа сонгоно уу.';
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    await saveCommittee({
      name: v.name.trim(), defense_date: v.defense_date || null, start_time: v.start_time || null, format: v.format,
      location: v.format === 'onsite' ? v.location.trim() || null : null, online_url: v.format === 'online' ? v.online_url.trim() || null : null,
      members: [...picked].map((user_id) => ({ user_id, is_chair: user_id === chairId })),
    }, c.id);
    toast('Тохиргоо хадгалагдлаа.');
    refresh();
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-set' }, h('h2', { id: 'h-set' }, 'Тохиргоо'), form);
}

export async function render({ params, navigate, refresh }) {
  let c;
  try { c = await getCommittee(params.id); } catch { return missing('Комисс олдсонгүй', '/admin/committees'); }
  const [semester, members, others, ready, reporting] = await Promise.all([
    getSemester(c.semester_id), listCommitteeMembers(c.semester_id), listCommittees(c.semester_id),
    listInternships(c.semester_id, { status: 'ready', limit: 100 }), listInternships(c.semester_id, { status: 'reporting', limit: 100 }),
  ]);
  const taken = new Set(others.filter((o) => o.id !== c.id).flatMap((o) => o.slots.map((s) => s.internship_id)));
  const candidates = [...ready.items, ...reporting.items].filter((i) => !taken.has(i.id));
  const blockers = [!c.defense_date && 'Хамгаалах өдөр тогтоогоогүй', !c.slots.length && 'Хуваарьт оюутан алга'].filter(Boolean);

  const actions = h('div', { class: 'actions' },
    c.published_at ? null : actionButton('Нийтлэх', { iconName: 'send', confirm: { title: 'Хуваарийг нийтлэх үү?', body: [c.name], confirmLabel: 'Нийтлэх' }, run: () => publishCommittee(c.id), done: 'Хуваарь нийтлэгдлээ.', after: refresh }),
    actionButton('Устгах', { variant: 'danger', iconName: 'trash', confirm: { title: 'Комиссыг устгах уу?', body: [c.name], confirmLabel: 'Устгах' }, run: () => deleteCommittee(c.id), done: 'Комисс устгагдлаа.', after: () => navigate('/admin/committees') }));
  return h('div', { class: 'stack' },
    backLink('/admin/committees', 'Комиссууд'),
    pageHead(c.name, h('div', { class: 'head-actions' }, badge(c.published_at ? 'Нийтэлсэн' : 'Нийтлээгүй', c.published_at ? 'done' : 'pending'), actions)),
    !c.published_at && blockers.length ? h('div', { class: 'org-banner warning' }, icon('alert', 18), h('p', {}, `Нийтлэхийн өмнө: ${blockers.join(' · ')}.`)) : null,
    h('div', { class: 'split even' }, slotsPanel(c, candidates, { refresh }), settingsPanel(c, semester, members, { refresh })));
}
