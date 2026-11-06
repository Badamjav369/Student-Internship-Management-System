// <confirm-dialog> — баталгаажуулах цонх (native <dialog>: фокус, Escape, backdrop хөтлөгдөнө).
// const ok = await confirmAction({ title, body: ['...'], confirmLabel, danger })
import { h } from '../core/dom.js';

class ConfirmDialog extends HTMLElement {
  open({ title, body = [], confirmLabel = 'Тийм', cancelLabel = 'Болих', danger = false }) {
    return new Promise((resolve) => {
      const dialog = h('dialog', { class: 'confirm', 'aria-labelledby': 'cd-title' },
        h('form', { method: 'dialog' },
          h('h2', { id: 'cd-title' }, title),
          ...body.map((text) => h('p', {}, text)),
          h('div', { class: 'actions' },
            h('button', { class: 'button quiet', type: 'submit', value: 'cancel', formnovalidate: true }, cancelLabel),
            h('button', { class: ['button', danger && 'danger'], type: 'submit', value: 'ok', autofocus: true }, confirmLabel))));
      dialog.addEventListener('close', () => { resolve(dialog.returnValue === 'ok'); dialog.remove(); });
      this.append(dialog);
      dialog.showModal();
    });
  }
}
customElements.define('confirm-dialog', ConfirmDialog);

export function confirmAction(options) {
  const host = document.createElement('confirm-dialog');
  document.body.append(host);
  return host.open(options).finally(() => host.remove());
}
