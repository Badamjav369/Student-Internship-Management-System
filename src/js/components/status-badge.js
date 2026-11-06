// <status-badge tone="done|pending|attention|active|none">Текст</status-badge> — төлвийг өнгө + цэг + БИЧВЭРЭЭР харуулна
// (өнгөнөөс дангаар хамаарахгүй). Өнгөний дүрэм CSS-д.
import { h } from '../core/dom.js';
import { INTERNSHIP_LABELS } from '../core/labels.js';

class StatusBadge extends HTMLElement {}
customElements.define('status-badge', StatusBadge);

const TONES = {
  done: ['approved', 'accepted', 'confirmed', 'defended', 'completed', 'finalized'],
  pending: ['submitted', 'scanned', 'in_review', 'pending', 'evaluating', 'ready', 'applied'],
  attention: ['returned', 'revision', 'rejected', 'overdue', 'failed', 'void', 'stopped', 'deferred'],
  active: ['filled', 'in_progress', 'reporting', 'planning', 'contracting', 'searching', 'open'],
};
export function toneOf(status) {
  for (const [tone, list] of Object.entries(TONES)) if (list.includes(status)) return tone;
  return 'none';
}
export const badge = (text, tone = 'none') => h('status-badge', { tone }, text);

const STATUS_TONES = { completed: 'done', ready: 'pending', evaluating: 'pending', applied: 'pending', stopped: 'attention', failed: 'attention', deferred: 'attention',
  revision: 'attention', overdue: 'attention', accepted: 'done', submitted: 'pending', not_submitted: 'none' };
/** Дадлага (эсвэл labels-аар өгсөн өөр) төлвийн шошго. */
export const statusBadge = (status, labels = INTERNSHIP_LABELS) => badge(labels[status] ?? status, STATUS_TONES[status] ?? 'active');
