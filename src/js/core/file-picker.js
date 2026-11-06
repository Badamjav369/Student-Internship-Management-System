// Монгол хэл дээрх файл сонгогч. Браузерийн өөрийн <input type="file"> нь «Choose File / No file chosen» гэж
// хэрэглэгчийн браузерийн хэлээр харагддаг тул жинхэнэ input-ийг нууж (фокус авдаг хэвээр), харагдах товч, нэрийг өөрсдөө зурна.
import { h } from './dom.js';

/**
 * @returns {{ root: HTMLElement, input: HTMLInputElement, sync: () => void, reset: () => void }}
 * root — талбарт оруулах элемент; input — жинхэнэ файлын талбар (form.elements-д name-ээрээ орно).
 */
export function filePicker({ id, name, accept = '', multiple = false, describedBy = '' }) {
  const nameId = `${id}-name`;
  const input = h('input', { id, name, type: 'file', class: 'file-picker-input', accept: accept || null, multiple, 'aria-describedby': `${nameId} ${describedBy}`.trim() });
  const empty = 'Файл сонгоогүй';
  const label = h('span', { class: 'file-picker-name', id: nameId, 'aria-live': 'polite' }, empty);
  const button = h('span', { class: 'file-picker-button', 'aria-hidden': 'true' }, multiple ? 'Файлууд сонгох' : 'Файл сонгох');
  const root = h('div', { class: 'file-picker' }, input, button, label);

  const sync = () => {
    const files = [...(input.files ?? [])];
    root.dataset.empty = files.length === 0 ? 'true' : 'false';
    label.textContent = files.length === 0 ? empty : files.length === 1 ? files[0].name : `${files.length} файл сонгосон`;
    label.title = files.map((f) => f.name).join(', ');
  };
  const reset = () => { input.value = ''; sync(); };

  // Товч нь зөвхөн дүрслэл (aria-hidden): хулгана/хурууны даралтыг жинхэнэ input руу дамжуулна; гар нь input дээр шууд очно.
  button.addEventListener('click', () => input.click());
  label.addEventListener('click', () => input.click());
  input.addEventListener('change', sync);
  root.addEventListener('dragover', (event) => { event.preventDefault(); root.dataset.drag = 'true'; });
  for (const type of ['dragleave', 'drop']) root.addEventListener(type, () => { delete root.dataset.drag; });
  root.addEventListener('drop', (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer?.files;
    if (!dropped?.length) return;
    const transfer = new DataTransfer();
    for (const file of multiple ? dropped : [dropped[0]]) transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  queueMicrotask(() => input.form?.addEventListener('reset', () => queueMicrotask(sync)));
  sync();
  return { root, input, sync, reset };
}
