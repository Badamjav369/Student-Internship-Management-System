// Дадлагын дэвтрийн өдрийн карт: огноо, төлөв, цаг, товч агуулга; дарахад нээгдэнэ. Оюутан, дадлага удирдагч хоёр ашиглана.
import { h } from '../core/dom.js';
import { hoursText, shortDate, weekday } from '../core/format.js';
import { icon } from '../core/icons.js';
import { badge } from './status-badge.js';

export const DAY_LABELS = { reviewed: 'Хянагдсан', written: 'Бичсэн', missing: 'Бичигдээгүй', today: 'Бичигдээгүй', future: 'Ирээдүй' };
export const DAY_TONES = { reviewed: 'done', written: 'active', missing: 'attention', today: 'pending', future: 'none' };

export function dayState(day, today) {
  if (day.entry?.reviewed_at) return 'reviewed';
  if (day.entry) return 'written';
  if (day.date > today) return 'future';
  return day.date === today ? 'today' : 'missing';
}

/** Төлөвлөгөөнд бичсэн тухайн өдрийн ажил. */
export const plannedNote = (task) => (task ? h('div', { class: 'planned-note' }, icon('plan', 18), h('div', {}, h('span', {}, 'Төлөвлөсөн ажил'), h('p', {}, task))) : null);

/** body — нээгдсэн үеийн агуулга; onToggle — толгойг дарахад. */
export function dayCard(day, state, { open, onToggle, body = null }) {
  const date = h('span', { class: 'day-date', dataset: { state }, 'aria-hidden': 'true' }, h('strong', {}, shortDate(day.date)), h('span', {}, weekday(day.date)));
  const label = `${shortDate(day.date)}, ${weekday(day.date)}`;
  if (state === 'future') {
    return h('li', { class: 'day-card future', dataset: { date: day.date } }, h('div', { class: 'day-card-button' }, date,
      h('span', { class: 'day-main' }, h('strong', { class: 'sr-only' }, label), h('span', { class: 'muted' }, 'Ирээдүй'))));
  }
  const preview = day.entry ? day.entry.work_done : day.planned_task;
  const head = h('button', { type: 'button', class: 'day-card-button', 'aria-expanded': String(open), 'aria-label': `${label}, ${DAY_LABELS[state]}`, on: { click: onToggle } },
    date,
    h('span', { class: 'day-main' },
      h('span', { class: 'day-meta' }, badge(DAY_LABELS[state], DAY_TONES[state]), day.entry ? h('span', { class: 'muted small' }, hoursText(Number(day.entry.hours))) : null),
      !open && preview ? h('span', { class: ['excerpt', !day.entry && 'planned'] }, preview) : null),
    h('span', { class: 'day-chevron', 'aria-hidden': 'true' }, icon('chevron', 18)));
  return h('li', { class: ['day-card', state === 'missing' && 'missing', open && 'open'], dataset: { date: day.date } }, head, open ? h('div', { class: 'day-body' }, body) : null);
}
