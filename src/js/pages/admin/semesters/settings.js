// Улирлын тохиргооны гурван самбар: тохиргоо (хугацаа, дүрэм, баяр), үнэлгээний шалгуур, загвар.
import { h, replace } from '../../../core/dom.js';
import { formatDate, num } from '../../../core/format.js';
import { field, checkbox, clearErrors, setFieldError, showErrors, values, dateOrNull, formRow, ISO_DATE, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { addTemplate, criteriaTotal, deleteCriterion, deleteTemplate, saveCriterion, updateSemester } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { badge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { TEMPLATE_ICONS, TEMPLATE_LABELS } from '../shared.js';

const RANGES = [['register', 'Бүртгэл'], ['work', 'Дадлага'], ['report', 'Тайлан'], ['defense', 'Хамгаалалт']];

// ---------- Баярын өдрүүд ----------
function holidayEditor(list, disabled) {
  const days = new Set(list);
  const chips = h('ul', { class: 'chips holiday-list', 'aria-label': 'Баярын өдрүүд' });
  const input = h('input', { type: 'date', id: 'holiday-add', disabled, 'aria-label': 'Баярын өдөр нэмэх' });
  const draw = () => replace(chips, [...days].sort().map((d) => h('li', { class: 'chip removable' }, formatDate(d),
    disabled ? null : h('button', { class: 'chip-x', type: 'button', 'aria-label': `${formatDate(d)}-г хасах`, on: { click: () => { days.delete(d); draw(); } } }, icon('close', 14)))));
  draw();
  const add = () => { if (ISO_DATE.test(input.value)) { days.add(input.value); input.value = ''; draw(); } };
  const root = h('div', { class: 'field holiday' },
    h('label', { for: 'holiday-add' }, 'Баярын өдөр'),
    disabled ? null : h('div', { class: 'inline-add' }, input, h('button', { class: 'button secondary', type: 'button', on: { click: add } }, icon('plus', 18), 'Нэмэх')),
    chips, days.size || !disabled ? null : h('p', { class: 'muted' }, 'Баярын өдөр алга.'));
  root.value = () => [...days].sort();
  return root;
}

// ---------- Тохиргоо ----------
export function settingsPanel(s, { editable, onSaved }) {
  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), 'Хадгалах');
  const holidays = holidayEditor(s.holidays, !editable);
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Улирлын тохиргоо' },
    h('fieldset', { class: 'form-body', disabled: !editable },
      h('section', { class: 'panel' }, h('h2', {}, 'Хугацаа'),
        h('div', { class: 'range-grid' }, RANGES.map(([key, label]) => h('fieldset', { class: 'range' },
          h('legend', {}, label),
          formRow(field({ label: 'Эхлэх', name: `${key}_from`, type: 'date', value: s[`${key}_from`] ?? '' }), field({ label: 'Дуусах', name: `${key}_to`, type: 'date', value: s[`${key}_to`] ?? '' })))))),
      h('section', { class: 'panel' }, h('h2', {}, 'Дүрэм'),
        h('div', { class: 'form' },
          h('div', { class: 'form-row rules' },
            field({ label: 'Сануулга илгээх цаг', name: 'reminder_time', type: 'time', value: s.reminder_time }),
            field({ label: 'Тайлангийн сануулга', name: 'report_remind_days', type: 'number', min: 0, max: 30, value: String(s.report_remind_days), unit: 'хоногийн өмнө' }),
            field({ label: 'Тасалж болох өдөр', name: 'max_missing_days', type: 'number', min: 0, max: 20, value: String(s.max_missing_days), unit: 'өдөр' }),
            field({ label: 'Файлын дээд хэмжээ', name: 'max_file_mb', type: 'number', min: 1, max: 200, value: String(s.max_file_mb), unit: 'МБ' }),
            field({ label: 'Комиссын дүн', name: 'committee_method', type: 'select', value: s.committee_method,
              options: [{ value: 'average', label: 'Гишүүдийн дундаж' }, { value: 'consensus', label: 'Хамтарсан шийдвэр' }] })),
          holidays),
        h('fieldset', { class: 'form-section' }, h('legend', {}, 'Оюутнаас шаардах'),
          checkbox({ label: 'Ажлын төлөвлөгөө', name: 'plan_enabled', checked: Boolean(s.plan_enabled), disabled: s.status !== 'draft' }),
          checkbox({ label: 'Дадлагын дэвтэр', name: 'logbook_enabled', checked: Boolean(s.logbook_enabled), disabled: s.status !== 'draft' }),
          s.status === 'draft' ? null : h('p', { class: 'muted' }, 'Улирал эхэлсний дараа өөрчлөх боломжгүй.'))),
      editable ? h('div', { class: 'form-submit' }, submit) : null));

  if (editable) {
    onSubmit(form, submit, async () => {
      clearErrors(form);
      const v = values(form);
      const errors = {};
      const body = { ...(s.status === 'draft' ? { plan_enabled: 'plan_enabled' in v, logbook_enabled: 'logbook_enabled' in v } : {}), reminder_time: v.reminder_time || '17:00', committee_method: v.committee_method, holidays: holidays.value() };
      for (const [key, min, max, label] of [['report_remind_days', 0, 30, 'Сануулга'], ['max_missing_days', 0, 20, 'Тасалж болох өдөр'], ['max_file_mb', 1, 200, 'Файлын хэмжээ']]) {
        const n = Number(v[key]);
        if (v[key] === '' || !Number.isInteger(n) || n < min || n > max) errors[key] = `${label} ${min}–${max} хооронд бүхэл тоо байна.`;
        else body[key] = n;
      }
      let last = '';
      for (const [key] of RANGES) {
        const from = dateOrNull(v[`${key}_from`]);
        const to = dateOrNull(v[`${key}_to`]);
        body[`${key}_from`] = from; body[`${key}_to`] = to;
        if (from && to && from > to) errors[`${key}_to`] = 'Дуусах өдөр эхлэх өдрөөс өмнө байна.';
        else if (from && last && from < last) errors[`${key}_from`] = 'Өмнөх үе шатаас эрт эхэлж болохгүй.';
        if (from) last = from;
      }
      if (Object.keys(errors).length) { showErrors(form, errors); return; }
      await updateSemester(s.id, body);
      toast('Тохиргоо хадгалагдлаа.');
      onSaved();
    });
  }
  return form;
}

// ---------- Үнэлгээний шалгуур ----------
const GROUPS = [['org', 'Байгууллагын үнэлгээ', 'building'], ['committee', 'Комиссын үнэлгээ', 'users']];

function criterionRow(s, c, refresh) {
  const name = h('input', { type: 'text', name: 'name', value: c.name, maxlength: 120, 'aria-label': 'Шалгуурын нэр', required: true });
  const score = h('input', { type: 'number', name: 'max_score', value: String(c.max_score), min: 1, max: 100, step: 'any', 'aria-label': 'Дээд оноо', required: true });
  const form = h('form', { class: 'crit-row', novalidate: true },
    name, h('span', { class: 'input-unit' }, score, h('span', { class: 'unit', 'aria-hidden': 'true' }, 'оноо')),
    h('button', { class: 'icon-button', type: 'submit', 'aria-label': 'Хадгалах' }, icon('check', 18)),
    actionButton('', { variant: 'quiet', small: true, iconName: 'trash', confirm: { title: 'Шалгуурыг устгах уу?', body: [c.name], confirmLabel: 'Устгах' }, run: () => deleteCriterion(s.id, c.id), done: 'Шалгуур устгагдлаа.', after: refresh }));
  form.lastElementChild.setAttribute('aria-label', 'Устгах');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const n = Number(score.value);
    if (name.value.trim().length < 2 || !(n > 0 && n <= 100)) { toast('Нэр бичиж, оноог 0–100 хооронд өгнө үү.', 'error'); return; }
    await saveCriterion(s.id, { id: c.id, component: c.component, name: name.value.trim(), max_score: n });
    toast('Шалгуур хадгалагдлаа.');
    refresh();
  });
  return form;
}

function addCriterion(s, component, refresh) {
  const submit = h('button', { class: 'button secondary', type: 'submit' }, icon('plus', 18), 'Нэмэх');
  const form = h('form', { class: 'crit-row add', novalidate: true, 'aria-label': 'Шалгуур нэмэх' },
    h('input', { type: 'text', name: 'name', placeholder: 'Шинэ шалгуур', maxlength: 120, 'aria-label': 'Шалгуурын нэр' }),
    h('span', { class: 'input-unit' }, h('input', { type: 'number', name: 'max_score', min: 1, max: 100, step: 'any', placeholder: '0', 'aria-label': 'Дээд оноо' }), h('span', { class: 'unit', 'aria-hidden': 'true' }, 'оноо')), submit);
  onSubmit(form, submit, async () => {
    const v = values(form);
    const n = Number(v.max_score);
    if (v.name.trim().length < 2 || !(n > 0 && n <= 100)) { toast('Нэр бичиж, оноог 0–100 хооронд өгнө үү.', 'error'); return; }
    await saveCriterion(s.id, { component, name: v.name.trim(), max_score: n });
    toast('Шалгуур нэмэгдлээ.');
    refresh();
  });
  return form;
}

export function criteriaPanel(s, { editable, refresh }) {
  const total = criteriaTotal(s);
  const ok = Math.abs(total - 100) < 1e-9;
  return h('div', { class: 'stack' },
    h('section', { class: 'panel crit-total', 'aria-label': 'Нийт оноо' },
      h('div', { class: 'crit-total-head' }, h('strong', {}, `Нийт ${num(total)} / 100`), badge(ok ? 'Бүрэн' : total > 100 ? 'Хэтэрсэн' : 'Дутуу', ok ? 'done' : 'attention')),
      h('div', { class: 'meter', role: 'img', 'aria-label': `${num(total)} оноо` }, h('span', { style: { width: `${Math.min(100, total)}%` } }))),
    GROUPS.map(([component, title, iconName]) => {
      const list = s.criteria.filter((c) => c.component === component);
      const sum = list.reduce((a, c) => a + Number(c.max_score), 0);
      return h('section', { class: 'panel', 'aria-label': title },
        h('div', { class: 'panel-head' }, h('h2', {}, icon(iconName, 20), title), h('span', { class: 'chip' }, `${num(sum)} оноо`)),
        list.length === 0 ? h('p', { class: 'muted' }, 'Шалгуур алга.') : h('ul', { class: 'crit-list' }, list.map((c) => h('li', {},
          editable ? criterionRow(s, c, refresh) : h('div', { class: 'crit-row read' }, h('span', {}, c.name), h('strong', {}, `${num(c.max_score)} оноо`))))),
        editable ? addCriterion(s, component, refresh) : null);
    }));
}

// ---------- Загвар ----------
const SINGLE = ['guide', 'plan', 'report'];

function planFieldsEditor() {
  let n = 0;
  const rows = h('div', { class: 'stack-tight' });
  const add = (init = {}) => {
    const k = ++n;
    const row = h('div', { class: 'tpl-row' },
      h('input', { type: 'text', name: `pf-label-${k}`, placeholder: 'Талбарын нэр', value: init.label ?? '', maxlength: 100, 'aria-label': 'Талбарын нэр' }),
      h('select', { name: `pf-type-${k}`, 'aria-label': 'Төрөл' }, h('option', { value: 'text' }, 'Богино'), h('option', { value: 'textarea', selected: true }, 'Урт')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: `pf-req-${k}`, checked: true }), 'Заавал'),
      h('button', { class: 'icon-button flat', type: 'button', 'aria-label': 'Талбар хасах', on: { click: () => row.remove() } }, icon('close', 16)));
    rows.append(row);
    return row;
  };
  add();
  const root = h('div', { class: 'field' }, h('span', { class: 'label' }, 'Төлөвлөгөөний талбарууд'), rows,
    h('button', { class: 'button quiet small', type: 'button', on: { click: () => add().querySelector('input').focus() } }, icon('plus', 16), 'Талбар нэмэх'));
  root.collect = () => [...rows.children].map((row, i) => ({ key: `field_${i + 1}`, label: row.querySelector('input[type="text"]').value.trim(), type: row.querySelector('select').value, required: row.querySelector('[type="checkbox"]').checked })).filter((f) => f.label);
  return root;
}

function reportFilesEditor() {
  const rows = h('div', { class: 'stack-tight' });
  const add = () => {
    const row = h('div', { class: 'tpl-row' },
      h('input', { type: 'text', placeholder: 'Файлын нэр', maxlength: 100, 'aria-label': 'Шаардлагатай файлын нэр' }),
      h('span', { class: 'chip' }, 'PDF'),
      h('button', { class: 'icon-button flat', type: 'button', 'aria-label': 'Файл хасах', on: { click: () => row.remove() } }, icon('close', 16)));
    rows.append(row);
    return row;
  };
  add();
  const root = h('div', { class: 'field' }, h('span', { class: 'label' }, 'Илгээх файлууд'), rows,
    h('button', { class: 'button quiet small', type: 'button', on: { click: () => add().querySelector('input').focus() } }, icon('plus', 16), 'Файл нэмэх'));
  root.collect = () => [...rows.children].map((row, i) => ({ key: `file_${i + 1}`, label: row.querySelector('input[type="text"]').value.trim(), types: ['pdf'] })).filter((f) => f.label);
  return root;
}

function templateAdd(s, refresh) {
  const free = Object.keys(TEMPLATE_LABELS).filter((k) => (k !== 'plan' || s.plan_enabled) && (!SINGLE.includes(k) || !s.templates.some((t) => t.kind === k)));
  const submit = h('button', { class: 'button', type: 'submit' }, icon('upload', 18), 'Нэмэх');
  const extra = h('div', { class: 'stack-tight' });
  const kind = field({ label: 'Төрөл', name: 'kind', type: 'select', value: free[0], options: free.map((k) => ({ value: k, label: TEMPLATE_LABELS[k] })) });
  let editor = null;
  const sync = () => {
    const k = kind.querySelector('select').value;
    editor = k === 'plan' ? planFieldsEditor() : k === 'report' ? reportFilesEditor() : null;
    replace(extra, editor);
  };
  kind.querySelector('select').addEventListener('change', sync);
  sync();
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Загвар нэмэх' },
    formRow(kind, field({ label: 'Файл', name: 'file', type: 'file', accept: '.pdf,.doc,.docx', required: true })), extra, h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const file = form.elements.file.files[0];
    if (!file) { setFieldError(form, 'file', 'Файл сонгоно уу.'); return; }
    if (!/\.(pdf|docx?)$/i.test(file.name)) { setFieldError(form, 'file', 'PDF эсвэл Word файл сонгоно уу.'); return; }
    const k = form.elements.kind.value;
    const tpl = { kind: k, file, file_name: file.name, file_size: file.size };
    if (k === 'plan') {
      tpl.plan_fields = editor.collect();
      if (!tpl.plan_fields.length) { toast('Төлөвлөгөөнд ядаж нэг талбар нэмнэ үү.', 'error'); return; }
    }
    if (k === 'report') {
      tpl.required_files = editor.collect();
      if (!tpl.required_files.length) { toast('Ядаж нэг файл, түүний төрлийг сонгоно уу.', 'error'); return; }
    }
    await addTemplate(s.id, tpl);
    toast('Загвар нэмэгдлээ.');
    refresh();
  });
  return free.length ? h('section', { class: 'panel', 'aria-label': 'Загвар нэмэх' }, h('h2', {}, 'Загвар нэмэх'), form) : null;
}

export function templatesPanel(s, { editable, refresh }) {
  const rows = s.templates.map((t) => {
    const [iconName, tone] = TEMPLATE_ICONS[t.kind] ?? ['contract', 'violet'];
    const notes = [t.plan_fields?.length ? `${t.plan_fields.length} талбар` : null, t.required_files?.length ? t.required_files.map((f) => f.label).join(', ') : null].filter(Boolean);
    return h('li', { class: 'row-card' },
      h('span', { class: ['org-avatar', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 22)),
      h('div', { class: 'row-main' }, h('h3', {}, TEMPLATE_LABELS[t.kind] ?? t.kind), h('p', { class: 'row-sub' }, t.file_name), notes.length ? h('p', { class: 'row-line' }, notes.join(' · ')) : null),
      editable ? h('div', { class: 'row-side' }, actionButton('Устгах', { variant: 'quiet', small: true, iconName: 'trash', confirm: { title: 'Загварыг устгах уу?', body: [t.file_name], confirmLabel: 'Устгах' }, run: () => deleteTemplate(s.id, t.id), done: 'Загвар устгагдлаа.', after: refresh })) : null);
  });
  return h('div', { class: 'stack' },
    h('section', { class: 'panel', 'aria-label': 'Загварууд' }, h('h2', {}, 'Загварууд'),
      rows.length ? h('ul', { class: 'row-list plain' }, rows) : h('p', { class: 'muted' }, 'Загвар нэмээгүй байна.')),
    editable ? templateAdd(s, refresh) : null);
}
