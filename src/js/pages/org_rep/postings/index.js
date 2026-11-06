// Дадлагын зар: нээлттэй болон хаагдсан зарууд (оюутны зартай ижил карт), шийдэх хүсэлтийн тоо. Шинэ зар нийтлэх.
import { h, pageHead, replace } from '../../../core/dom.js';
import { isoDate } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { listPostings } from '../../../data/org-rep-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { chipRow } from '../../../components/filters.js';
import { postCard } from '../../../components/post-card.js';
import { badge } from '../../../components/status-badge.js';
import { POSTING_LABELS, POSTING_TONES } from '../shared.js';

const today = isoDate(Date.now() + 8 * 36e5); // Улаанбаатарын өнөөдөр

const card = (p) => postCard(p, {
  href: `#/org_rep/postings/${p.id}`, today, closed: p.status === 'closed',
  extra: p.pending_count ? h('li', {}, icon('inbox', 15), `Шийдэх хүсэлт ${p.pending_count}`) : null,
  footer: badge(POSTING_LABELS[p.status], POSTING_TONES[p.status]),
});

export async function render() {
  const postings = await listPostings();
  const add = h('a', { class: 'button', href: '#/org_rep/postings/new' }, icon('plus', 18), 'Шинэ зар');
  if (!postings.length) return h('div', { class: 'stack' }, pageHead('Дадлагын зар', add), emptyState('Зар алга', 'Нийтэлсэн зар оюутнуудад харагдана.', { icon: 'megaphone' }));
  const groups = [['open', 'Нээлттэй', (p) => p.status === 'open'], ['closed', 'Хаагдсан', (p) => p.status === 'closed'], ['all', 'Бүгд', () => true]];
  let key = (groups.find(([, , test]) => postings.some(test)) ?? groups.at(-1))[0];
  const body = h('div', { class: 'live-list' });
  const draw = () => {
    const shown = postings.filter(groups.find(([k]) => k === key)[2]);
    replace(body, shown.length ? h('div', { class: 'post-grid' }, shown.map(card)) : emptyState('Зар алга', null, { icon: 'megaphone' }));
  };
  draw();
  return h('div', { class: 'stack' }, pageHead('Дадлагын зар', add),
    chipRow('Төлөв', groups.map(([k, label, test]) => [k, label, postings.filter(test).length]), key, (v) => { key = v; draw(); }), body);
}
