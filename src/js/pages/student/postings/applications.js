// Таб 2 — Хүсэлт: илгээсэн хүсэлтүүд (тоо хураангуй, явцын зураг, цуцлах).
import { h, replace } from '../../../core/dom.js';
import { fileButton } from '../../../core/files.js';
import { formatDate } from '../../../core/format.js';
import { busy } from '../../../core/forms.js';
import { cancelApplication } from '../../../data/student-api.js';
import { confirmAction } from '../../../components/confirm-dialog.js';
import { emptyState } from '../../../components/empty-state.js';
import { statTile } from '../../../components/facts.js';
import { toneOf } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { APPLICATION_STATUSES, applicationBadge } from '../shared.js';
import { orgAvatar } from './parts.js';

const STATUS_ICONS = { pending: 'clock', accepted: 'circle-check', rejected: 'circle-x' };
// Хураангуйн хавтангийн өнгө нь доорх картын төлвийн тэмдэглэгээтэй (status-badge) үргэлж ижил байхын тулд нэг эх сурвалжаас гарна.
const TILE_TONES = { done: 'green', pending: 'amber', attention: 'rose', active: 'violet', none: 'gray' };
const statusTile = (items, status) => statTile(APPLICATION_STATUSES[status], items.filter((a) => a.status === status).length, TILE_TONES[toneOf(status)], STATUS_ICONS[status]);

export function createApplicationsTab(ctx) {
  const el = h('div', { class: 'stack org-apps' });

  function item(a) {
    const cancel = a.status === 'pending' ? h('button', { class: 'button secondary small', type: 'button' }, 'Хүсэлт цуцлах') : null;
    cancel?.addEventListener('click', async () => {
      const ok = await confirmAction({ title: 'Хүсэлтийг цуцлах уу?', body: [`«${a.posting_title}» (${a.organization_name}) зарт илгээсэн хүсэлт цуцлагдана. Дахин илгээх боломжгүй.`], confirmLabel: 'Хүсэлт цуцлах', danger: true });
      if (!ok) return;
      await busy(cancel, async () => {
        await cancelApplication(a.id);
        toast('Хүсэлт цуцлагдлаа.');
        await ctx.reload();
        el.querySelector('[data-focus]')?.focus();
      });
    });
    return h('li', { class: 'app-card', dataset: { status: a.status } },
      h('div', { class: 'app-card-top' }, orgAvatar(a.organization_name, 'lg', a),
        h('div', { class: 'app-card-title' }, h('h3', {}, h('a', { href: `#/student/postings/${a.posting_id}` }, a.posting_title)),
          h('p', { class: 'muted' }, a.organization_name, ' · илгээсэн ', h('time', { datetime: a.submitted_at }, formatDate(a.submitted_at.slice(0, 10))),
            a.decided_at ? [' · шийдсэн ', h('time', { datetime: a.decided_at }, formatDate(a.decided_at.slice(0, 10)))] : null)),
        applicationBadge(a.status)),
      cancel || a.cv_name ? h('div', { class: 'row-actions' }, a.cv_name ? fileButton({ id: a.cv_file_id ?? null, name: a.cv_name }) : null, cancel) : null);
  }

  function refresh() {
    const items = ctx.apps;
    if (items.length === 0) {
      replace(el, emptyState('Хүсэлт илгээгээгүй байна', 'Илгээсэн хүсэлтүүд энд харагдана.', {
        icon: 'send', action: h('button', { class: 'button', type: 'button', on: { click: () => ctx.show('posts', { focus: true }) } }, 'Зар үзэх') }));
      return;
    }
    replace(el,
      h('h3', { class: 'sr-only', tabindex: '-1', dataset: { focus: '' } }, 'Миний хүсэлтүүд'),
      h('div', { class: 'stat-row' }, statTile('Нийт хүсэлт', items.length, 'violet', 'send'), Object.keys(APPLICATION_STATUSES).map((status) => statusTile(items, status))),
      h('ul', { class: 'app-cards' }, items.map(item)));
  }

  refresh();
  return { el, refresh };
}
