// Таб 1 — Зар: хайлт, чиглэлийн chip, хөтөлбөрийн шүүлт, зарын картууд.
// Хайлт бичих үед 250 мс хүлээж хүсэлт илгээнэ; хуучин хүсэлтийн хариу шинэ үр дүнг дарахгүй (seq-ээр хамгаална).
import { h, replace } from '../../../core/dom.js';
import { busy } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { listPostingFacets, listPostings } from '../../../data/student-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { APPLICATION_STATUSES, applicationBadge } from '../shared.js';
import { postCard } from '../../../components/post-card.js';

const PAGE = 6;
const SEARCHING = ['searching', 'applied'];
const APP_LABELS = { ...APPLICATION_STATUSES, pending: 'Хүсэлт илгээсэн' };

function banner(i) {
  if (i && SEARCHING.includes(i.status)) return null;
  const text = i ? `Таны дадлагын газар тогтсон (${i.status_label}). Зарыг үзэж болно, шинэ хүсэлт илгээх боломжгүй.`
    : 'Танд энэ улиралд бүртгэлтэй дадлага алга. Зарыг үзэж болно, хүсэлт илгээх боломжгүй.';
  return h('div', { class: ['org-banner', i ? 'info' : 'warning'] }, icon(i ? 'info' : 'alert', 20), h('p', {}, text));
}

export function createPostsTab(ctx) {
  const state = { q: '', field: '', mineOnly: true, items: [], total: 0, facets: [], loading: false };
  let seq = 0;
  let timer = 0;

  const input = h('input', { id: 'f-q', name: 'q', type: 'search', placeholder: 'Зарын нэр, байгууллага, шаардлагаар хайх', autocomplete: 'off', 'aria-label': 'Зар хайх' });
  const clear = h('button', { class: 'icon-button flat', type: 'button', 'aria-label': 'Хайлтыг арилгах', hidden: true, on: { click: () => { input.value = ''; input.focus(); onInput(); } } }, icon('close', 16));
  const search = h('form', { class: 'search-card', role: 'search', 'aria-label': 'Зарын хайлт', on: { submit: (e) => { e.preventDefault(); clearTimeout(timer); load(true); } } },
    h('label', { class: 'search-input', for: 'f-q' }, icon('search', 20), input, clear),
    h('button', { class: 'button', type: 'submit' }, 'Хайх'));
  const chips = h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Чиглэлээр шүүх' });
  const status = h('p', { class: 'result-count', role: 'status' });
  const mineSlot = h('div', { class: 'mine-slot' });
  const bar = h('div', { class: 'result-bar' }, status, mineSlot);
  const grid = h('div', { class: 'post-grid', 'aria-live': 'polite' });
  const more = h('button', { class: 'button secondary', type: 'button', hidden: true, on: { click: () => busy(more, () => load(false)) } }, 'Цааш үзэх');
  const top = h('div', { class: 'stack' });
  const el = h('div', { class: 'stack posts' }, top, search, chips, bar, grid, h('div', { class: 'pager' }, more));

  function onInput() {
    clear.hidden = input.value === '';
    clearTimeout(timer);
    timer = setTimeout(() => { if (el.isConnected) load(true); }, 250);
  }
  input.addEventListener('input', onInput);

  function reset() { input.value = ''; clear.hidden = true; state.q = ''; state.field = ''; drawChips(); load(true); }

  function chip(label, pressed, onClick, extra = null, title = null) {
    return h('button', { class: 'filter-chip', type: 'button', 'aria-pressed': String(pressed), title, on: { click: onClick } }, label, extra);
  }
  function drawChips() {
    replace(chips,
      chip('Бүгд', state.field === '', () => { state.field = ''; drawChips(); load(true); }),
      ...state.facets.map((f) => chip(f.name, state.field === f.name, () => { state.field = state.field === f.name ? '' : f.name; drawChips(); load(true); }, h('span', { class: 'chip-count' }, f.count))));
    replace(mineSlot,
      chip([icon(state.mineOnly ? 'check' : 'sliders', 15), 'Зөвхөн миний хөтөлбөрт'], state.mineOnly, async () => {
        state.mineOnly = !state.mineOnly;
        await loadFacets();
        drawChips();
        load(true);
      }, null, `«${ctx.user.program}» хөтөлбөрт тохирох зарууд`));
  }

  async function loadFacets() {
    state.facets = await listPostingFacets({ program: state.mineOnly ? ctx.user.program : '' });
    if (state.field && !state.facets.some((f) => f.name === state.field)) state.field = '';
  }

  const applied = () => new Map(ctx.apps.map((a) => [a.posting_id, a]));

  function card(p, application) {
    const closed = Math.max(0, p.positions - p.accepted_count) === 0;
    return postCard(p, { href: `#/student/postings/${p.id}`, today: ctx.today, closed, footer: application ? applicationBadge(application.status, APP_LABELS) : null });
  }

  function draw() {
    const map = applied();
    const filtered = state.q.trim() !== '' || state.field !== '';
    status.textContent = state.total ? `${state.total} зараас ${state.items.length}-г харуулж байна` : '';
    more.hidden = state.items.length >= state.total;
    grid.toggleAttribute('aria-busy', state.loading);
    grid.dataset.loading = String(state.loading);
    replace(top, banner(ctx.internship));
    if (state.items.length === 0 && !state.loading) {
      replace(grid, emptyState('Тохирох зар олдсонгүй',
        state.mineOnly ? `Хайлтын үгээ өөрчлөх эсвэл «Зөвхөн миний хөтөлбөрт» сонголтыг арилгаж үзнэ үү.` : 'Одоогоор хүсэлт хүлээн авч буй зар алга.',
        { icon: 'search', action: filtered ? h('button', { class: 'button secondary', type: 'button', on: { click: reset } }, 'Шүүлтүүр цэвэрлэх') : null }));
    } else replace(grid, state.items.map((p) => card(p, map.get(p.id))));
  }

  async function load(resetList) {
    const mine = ++seq;
    state.q = input.value;
    state.loading = true;
    grid.dataset.loading = 'true';
    try {
      const page = await listPostings({ q: state.q, field: state.field, program: state.mineOnly ? ctx.user.program : '', limit: PAGE, offset: resetList ? 0 : state.items.length });
      if (mine !== seq) return; // илүү шинэ хайлт эхэлсэн — хуучин хариуг ашиглахгүй
      state.items = resetList ? page.items : state.items.concat(page.items);
      state.total = page.total;
      if (resetList && !state.q && !state.field) ctx.postsTotal = page.total;
    } finally {
      if (mine === seq) { state.loading = false; draw(); ctx.updateCounts?.(); }
    }
  }

  const ready = (async () => { await loadFacets(); drawChips(); await load(true); })();
  return { el, ready, refresh: draw };
}
