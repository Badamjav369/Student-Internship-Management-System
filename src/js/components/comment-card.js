// Санал, зөвлөгөө бичсэн хүний карт (оюутан, удирдагч багш, админ бүгд харна).
import { h } from '../core/dom.js';

const letter = (name) => [...(name?.trim().split(/\s+/).at(-1) ?? '?')][0].toUpperCase();

/** Нэрний үсэгтэй дугуй, үүрэг, бичвэр. attention — засвар шаардсан (улаан), advice — удирдагч багшийн зөвлөгөө (бүдэг шар). */
export function commentCard({ role, name, text, attention = false, quiet = false, advice = false }) {
  return h('div', { class: ['contact-card', 'comment', attention && 'attention', quiet && 'quiet', advice && 'advice'] },
    h('span', { class: 'contact-avatar', 'aria-hidden': 'true' }, letter(name ?? role)),
    h('div', { class: 'contact-body' }, h('strong', {}, name ?? role), name ? h('span', { class: 'contact-role' }, role) : null, h('p', {}, text)));
}
