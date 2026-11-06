// Маягтын туслах функцууд: талбар, алдаа, ачаалж буй товч. Frontend шалгалт нь зөвхөн хэрэглэгчид
// хурдан хариу өгөх зориулалттай — сервер дээр дахин шалгана.
import { h } from './dom.js';
import { filePicker } from './file-picker.js';

let uid = 0;

export function field({ label, name, type = 'text', hint = null, value = '', rows = 4, options = [], required = false, unit = null, ...attrs }) {
  const id = `f-${name.replaceAll('.', '-')}-${++uid}`;
  const common = { id, name, 'aria-describedby': `${id}-hint ${id}-error` };
  let control;
  if (type === 'textarea') control = h('textarea', { ...common, rows, ...attrs }, value ?? '');
  else if (type === 'select') {
    control = h('select', { ...common, ...attrs }, options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  } else if (type === 'file') {
    control = filePicker({ id, name, accept: attrs.accept, multiple: Boolean(attrs.multiple), describedBy: common['aria-describedby'] }).root;
  } else control = h('input', { ...common, type, value, ...attrs });
  return h('div', { class: ['field', type === 'file' && 'field-file'], dataset: { field: name } },
    h('label', { for: id }, label, required ? h('span', { class: 'req-mark', 'aria-hidden': 'true' }, ' *') : null),
    unit ? h('div', { class: 'input-unit' }, control, h('span', { class: 'unit', 'aria-hidden': 'true' }, unit)) : control,
    hint ? h('p', { class: 'hint', id: `${id}-hint` }, hint) : null,
    h('p', { class: 'error', id: `${id}-error`, hidden: true }));
}

export const values = (form) => Object.fromEntries(new FormData(form).entries());

export function checkbox({ label, name, checked = false, disabled = false }) {
  const id = `f-${name}-${++uid}`;
  return h('div', { class: 'field', dataset: { field: name } },
    h('div', { class: 'check' }, h('input', { type: 'checkbox', id, name, checked, disabled, 'aria-describedby': `${id}-error` }), h('label', { for: id }, label)),
    h('p', { class: 'error', id: `${id}-error`, hidden: true }));
}

export function setFieldError(root, name, message) {
  const box = root.querySelector(`[data-field="${CSS.escape(name)}"]`);
  if (!box) return;
  const error = box.querySelector('.error');
  const control = box.querySelector('input, textarea, select');
  if (message) {
    box.dataset.invalid = 'true';
    error.textContent = message;
    error.hidden = false;
    control?.setAttribute('aria-invalid', 'true');
  } else {
    delete box.dataset.invalid;
    error.hidden = true;
    error.textContent = '';
    control?.removeAttribute('aria-invalid');
  }
}

export function clearErrors(root) {
  for (const box of root.querySelectorAll('[data-field]')) setFieldError(root, box.dataset.field, null);
  root.querySelector(':scope > .form-alert')?.remove();
}

export function formAlert(form, message) {
  form.querySelector(':scope > .form-alert')?.remove();
  form.prepend(h('div', { class: 'alert error form-alert', role: 'alert' }, h('p', {}, message)));
}

export function showErrors(form, errors) {
  clearErrors(form);
  for (const [name, message] of Object.entries(errors)) setFieldError(form, name, message);
  formAlert(form, 'Тэмдэглэсэн талбарыг засаад дахин илгээнэ үү.');
  form.querySelector('[data-invalid] input, [data-invalid] textarea, [data-invalid] select')?.focus();
}

/** Үйлдэл дуустал товчийг идэвхгүй болгож давхар дарахаас сэргийлнэ. */
export async function busy(button, fn) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

/** Файлын төрөл, хэмжээний шалгалт. Алдаа байвал мессеж, үгүй бол null. */
export function checkFile(file, { test, typeText, maxMb }) {
  if (!file) return null;
  if (!test.test(file.name)) return `${typeText} файл сонгоно уу.`;
  if (file.size > maxMb * 1024 * 1024) return `Файлын хэмжээ ${maxMb} МБ-аас хэтэрсэн байна.`;
  return null;
}

/** Маягтын submit: алдааг цэвэрлэж, товчийг түгжиж, API-н алдааг маягтад харуулна. */
export function onSubmit(form, button, handler) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    await busy(button, async () => {
      try { await handler(); } catch (error) { if (error.fields) showErrors(form, error.fields); else formAlert(form, error.message); }
    });
  });
}
export const formRow = (...fields) => h('div', { class: 'form-row' }, ...fields);
export const dateOrNull = (v) => (v ? v : null);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE = /^[0-9+() -]{6,30}$/;
