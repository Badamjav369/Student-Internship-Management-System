// Гуравласан гэрээ: системийн загвараар үүссэн гэрээг татах, гарын үсэг тамгатай скан хувийг байршуулах (тэнхмийн эрхлэгч баталгаажуулмагц төлөвлөгөөний шат руу шилжинэ).
import { h, pageHead } from '../../core/dom.js';
import { busy, checkFile, clearErrors, field, onSubmit, showErrors } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { hasPrevious, replaceHash } from '../../core/router.js';
import { chooseContractMode, getContract, getDashboard, uploadContractScan } from '../../data/student-api.js';
import { backLink } from '../../components/back-link.js';
import { signingApi, signingPanel } from '../../components/contract-signing.js';
import { kindCards } from '../../components/kind-cards.js';
import { contractView } from '../../components/contract-view.js';
import { emptyState } from '../../components/empty-state.js';
import { toast } from '../../components/toast-region.js';
import { noInternship } from './shared.js';

function scanForm(maxMb, reload) {
  const submit = h('button', { class: 'button', type: 'submit' }, icon('upload', 18), 'Скан байршуулах');
  const form = h('form', { class: 'form', novalidate: true },
    field({ label: 'Гарын үсэг, тамгатай скан', name: 'file', type: 'file', required: true, accept: '.pdf,application/pdf', hint: `PDF · ${maxMb} МБ хүртэл` }),
    h('div', {}, submit));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const file = form.elements.file.files[0];
    const error = file ? checkFile(file, { test: /\.pdf$/i, typeText: 'PDF', maxMb }) : 'Скан файлаа сонгоно уу.';
    if (error) return showErrors(form, { file: error });
    await busy(submit, async () => {
      await uploadContractScan(file);
      toast('Скан хувь байршлаа.');
      reload();
    });
  });
  return form;
}

const MODES = [
  { value: 'paper', icon: 'upload', tone: 'blue', label: 'Цаасан', hint: 'Татаж, гарын үсэг зуруулаад скан байршуулна' },
  { value: 'touch', icon: 'pen', tone: 'violet', label: 'Дэлгэцэнд зурах', hint: 'Гарын үсгээ дэлгэцэнд зурна' },
  { value: 'digital', icon: 'shield', tone: 'green', label: 'Тоон гарын үсэг', hint: 'И-мэйл кодоор баталгаажуулна' },
];

function modePicker(current, refresh, cancel = null) {
  const submit = h('button', { class: 'button', type: 'submit' }, 'Үргэлжлүүлэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Гэрээ байгуулах хэлбэр' }, kindCards('Гэрээ байгуулах хэлбэр', MODES, { name: 'mode', value: current ?? 'paper' }),
    h('div', { class: 'actions' }, submit, cancel));
  onSubmit(form, submit, async () => {
    await chooseContractMode(new FormData(form).get('mode'));
    if (!location.hash.includes('?')) refresh(); else if (hasPrevious()) history.back(); else replaceHash('#/student/contract');
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-mode' }, h('h2', { id: 'h-mode' }, 'Гэрээ байгуулах'), form);
}

export async function render({ refresh, query }) {
  const dash = await getDashboard();
  const i = dash.internship;
  if (!i) return noInternship('Гуравласан гэрээ', 'contract');
  const contract = await getContract();
  if (!contract) return h('section', {}, pageHead('Гуравласан гэрээ'), emptyState('Гэрээ хараахан үүсээгүй', null, { icon: 'contract' }));
  const online = contract.status === 'signing';
  const choosing = contract.can_choose && (!contract.mode || query.get('mode') === '1');
  if (choosing) return h('section', {}, query.get('mode') === '1' ? backLink('/student/contract') : null, pageHead('Гуравласан гэрээ'), h('div', { class: 'stack' }, contract.status === 'returned' ? contractView(contract)[0] : null, modePicker(contract.mode, refresh)));
  const switcher = contract.can_choose ? h('a', { class: 'button secondary small', href: '#/student/contract?mode=1' }, 'Хэлбэр солих') : null;
  if (online || contract.mode === 'touch' || contract.mode === 'digital') {
    const panel = signingPanel({ contract, api: signingApi('/student/contract'), onChange: refresh, reload: getContract });
    return h('section', {}, pageHead('Гуравласан гэрээ'), h('div', { class: 'stack' }, contract.status === 'approved' ? contractView(contract)[0] : null, panel, switcher));
  }
  return h('section', {}, pageHead('Гуравласан гэрээ'), h('div', { class: 'stack' },
    ...contractView(contract),
    contract.can_upload ? h('section', { class: 'panel', 'aria-labelledby': 'h-scan' }, h('h2', { id: 'h-scan' }, 'Скан байршуулах'), scanForm(i.info.max_file_mb, refresh)) : null,
    switcher));
}
