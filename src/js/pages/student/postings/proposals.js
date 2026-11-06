// Таб 3 — Санал болгох газар: зарт байхгүй байгууллага эсвэл гадаадад дадлага хийх хүсэлт (тэнхмийн эрхлэгч шийднэ).
// Маягт үргэлж харагдана; хүсэлт гаргах боломжгүй үед талбарууд идэвхгүй (disabled) болж шалтгаан нь богино бичигдэнэ.
import { h, replace } from '../../../core/dom.js';
import { fileButton } from '../../../core/files.js';
import { formatRange } from '../../../core/format.js';
import { busy, checkFile, clearErrors, field, showErrors } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { REQUEST_KINDS } from '../../../core/labels.js';
import { cancelPlacementRequest, createPlacementRequest } from '../../../data/student-api.js';
import { confirmAction } from '../../../components/confirm-dialog.js';
import { badge, toneOf } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { orgAvatar } from './parts.js';

const SEARCHING = ['searching', 'applied'];
const LABELS = { pending: 'Эрхлэгч шийдэж байна', approved: 'Зөвшөөрсөн', rejected: 'Татгалзсан', cancelled: 'Цуцалсан' };

function kindCard(value, label, hint, iconName, checked) {
  const input = h('input', { type: 'radio', name: 'kind', value, checked, class: 'sr-only' });
  return h('label', { class: 'kind-card' }, input, h('span', { class: ['tile', 'tile-violet'], 'aria-hidden': 'true' }, icon(iconName, 22)), h('span', { class: 'kind-text' }, h('strong', {}, label), h('span', {}, hint)));
}

export function createProposalsTab(ctx) {
  const el = h('div', { class: 'stack own-page' });

  function form(lockReason) {
    const maxMb = ctx.internship?.info.max_file_mb ?? 20;
    const submit = h('button', { class: 'button', type: 'submit' }, icon('send', 18), 'Хүсэлт илгээх');
    const country = field({ label: 'Улс', name: 'country', maxlength: 100, hint: 'Жишээ нь: Солонгос' });
    const kinds = h('fieldset', { class: 'kind-cards' }, h('legend', {}, 'Төрөл'),
      kindCard('own', REQUEST_KINDS.own, 'Монгол дахь байгууллага', 'building', true), kindCard('abroad', REQUEST_KINDS.abroad, 'Гадаад улсын байгууллага', 'globe', false));
    const body = h('fieldset', { class: 'form-body', disabled: Boolean(lockReason) },
      kinds,
      country,
      h('div', { class: 'form-row' }, field({ label: 'Байгууллагын нэр', name: 'organization_name', required: true, maxlength: 200 }),
        field({ label: 'Холбоо барих', name: 'contact', maxlength: 300, hint: 'Утас, и-мэйл эсвэл хариуцсан хүн. Заавал биш.' })),
      h('div', { class: 'form-row' }, field({ label: 'Эхлэх огноо', name: 'start_date', type: 'date', required: true }), field({ label: 'Дуусах огноо', name: 'end_date', type: 'date', required: true })),
      field({ label: 'Тайлбар', name: 'description', type: 'textarea', rows: 4, maxlength: 3000, required: true, hint: 'Ямар ажил хийх, яагаад энэ газрыг сонгосон.' }),
      field({ label: 'Хавсралт (заавал биш)', name: 'document', type: 'file', accept: '.pdf,application/pdf', hint: `PDF · ${maxMb} МБ хүртэл.` }),
      h('div', {}, submit));
    const form = h('form', { class: 'form', novalidate: true }, lockReason ? h('div', { class: 'org-banner info' }, icon('lock', 20), h('p', {}, lockReason)) : null, body);
    const sync = () => { country.hidden = form.elements.kind.value !== 'abroad'; };
    sync();
    kinds.addEventListener('change', sync);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (lockReason) return;
      clearErrors(form);
      const data = Object.fromEntries(new FormData(form));
      const errors = {};
      for (const [key, text] of [['organization_name', 'Байгууллагын нэрээ бичнэ үү.'], ['start_date', 'Эхлэх огноог оруулна уу.'], ['end_date', 'Дуусах огноог оруулна уу.'], ['description', 'Тайлбар бичнэ үү.']]) {
        if (!String(data[key] ?? '').trim()) errors[key] = text;
      }
      if (data.kind === 'abroad' && !String(data.country ?? '').trim()) errors.country = 'Улсаа бичнэ үү.';
      if (data.start_date && data.end_date && data.start_date > data.end_date) errors.end_date = 'Дуусах огноо эхлэх огнооноос хойш байна.';
      const file = form.elements.document.files[0];
      const fileError = checkFile(file, { test: /\.pdf$/i, typeText: 'PDF', maxMb });
      if (fileError) errors.document = fileError;
      if (Object.keys(errors).length) return showErrors(form, errors);
      return busy(submit, async () => {
        await createPlacementRequest({ kind: data.kind, country: data.kind === 'abroad' ? data.country.trim() : null, organization_name: data.organization_name.trim(), contact: data.contact || null,
          start_date: data.start_date, end_date: data.end_date, description: data.description.trim(), document_name: file?.name ?? null, document: file ?? null });
        toast('Хүсэлт илгээгдлээ.');
        await ctx.reload();
        el.querySelector('#h-list')?.focus({ preventScroll: true });
      });
    });
    return form;
  }

  function request(r) {
    const cancel = r.status === 'pending' ? h('button', { class: 'button quiet small', type: 'button' }, 'Цуцлах') : null;
    cancel?.addEventListener('click', async () => {
      const ok = await confirmAction({ title: 'Хүсэлтээ цуцлах уу?', body: ['Цуцалсны дараа шинэ хүсэлт гаргаж болно.'], confirmLabel: 'Цуцлах', danger: true });
      if (ok) await busy(cancel, async () => { await cancelPlacementRequest(r.id); toast('Хүсэлтийг цуцаллаа.'); await ctx.reload(); });
    });
    return h('li', { class: 'req-card', dataset: { status: r.status } },
      h('div', { class: 'app-card-top' }, orgAvatar(r.organization_name),
        h('div', { class: 'app-card-title' }, h('h3', {}, `${r.organization_name}${r.country ? `, ${r.country}` : ''}`), h('p', { class: 'muted' }, `${REQUEST_KINDS[r.kind]} · ${formatRange(r.start_date, r.end_date)}`)),
        badge(LABELS[r.status], r.status === 'cancelled' ? 'none' : toneOf(r.status))),
      r.status === 'rejected' && r.decision_reason ? h('p', { class: 'req-reason' }, r.decision_reason) : null,
      r.document_name || cancel ? h('div', { class: 'row-actions' }, r.document_name ? fileButton({ id: r.document_file_id ?? null, name: r.document_name }) : null, cancel) : null);
  }

  function refresh() {
    const i = ctx.internship;
    const pending = ctx.requests.some((r) => r.status === 'pending');
    const lock = !i ? 'Бүртгэлтэй дадлага алга.' : !SEARCHING.includes(i.status) ? `Дадлагын газар тогтсон (${i.status_label}).` : pending ? 'Хүлээгдэж буй хүсэлт байна.' : null;
    replace(el,
      h('section', { class: 'panel', 'aria-labelledby': 'h-new' }, h('h2', { id: 'h-new' }, 'Шинэ хүсэлт'), form(lock)),
      ctx.requests.length ? h('section', { class: 'panel', 'aria-labelledby': 'h-list' }, h('h2', { id: 'h-list', tabindex: '-1' }, 'Санал болгосон газрууд'), h('ul', { class: 'req-cards' }, ctx.requests.map(request))) : null);
  }

  refresh();
  return { el, refresh };
}
