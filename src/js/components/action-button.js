// Баталгаажуулалттай үйлдлийн товч: confirm → run → toast → after.
import { h } from '../core/dom.js';
import { busy } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { confirmAction } from './confirm-dialog.js';
import { toast } from './toast-region.js';

export function actionButton(label, { confirm = null, run, done, after = null, variant = 'secondary', small = false, iconName = null }) {
  const button = h('button', { class: ['button', variant === 'danger' ? 'danger' : variant === 'primary' ? null : variant, small && 'small'], type: 'button' }, iconName ? icon(iconName, 18) : null, label);
  button.addEventListener('click', async () => {
    if (confirm && !(await confirmAction({ confirmLabel: label, danger: variant === 'danger', ...confirm }))) return;
    await busy(button, async () => {
      try {
        await run();
        if (done) toast(done);
        after?.();
      } catch (error) { toast(error.message, 'error'); }
    });
  });
  return button;
}
