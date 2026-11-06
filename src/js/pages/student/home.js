// Оюутны нүүр: мэндчилгээний карт (үе шатны зам) + «Хийх ажил». Өөр юм оруулахгүй — мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { formatDate, daysLeftText, todayLabel } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { getDashboard } from '../../data/student-api.js';
import { getSession } from '../../data/session-api.js';
import { emptyState } from '../../components/empty-state.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import '../../components/progress-path.js';

// Хийх ажлын товчны нэр (key = todo.key).
const ACTIONS = {
  apply: 'Зар үзэх', wait_applications: 'Хүсэлтээ харах', fix_contract: 'Гэрээ засах', upload_contract: 'Гэрээ рүү', wait_contract: 'Гэрээ харах',
  submit_plan: 'Төлөвлөгөө бичих', wait_plan: 'Төлөвлөгөө харах', write_log: 'Тэмдэглэл бичих', missing_days: 'Нөхөж бичих', report_window: 'Тайлан',
  submit_report: 'Тайлан илгээх', wait_report: 'Тайлан харах', defense: 'Хуваарь харах', wait_defense: 'Хамгаалалт', wait_score: 'Үнэлгээ харах', result: 'Дүн харах',
};
// Хийх ажил бүрийн дүрс ба зөөлөн өнгө
const LOOK = {
  write_log: ['book', 'amber'], missing_days: ['book', 'rose'], work_ends: ['clock', 'blue'], report_window: ['report', 'green'],
  apply: ['search', 'violet'], submit_report: ['report', 'green'], defense: ['calendar', 'blue'], result: ['award', 'green'],
};

function dueChip(item) {
  if (!item.due) return null;
  const tone = item.days_left < 0 ? 'late' : item.days_left <= 0 ? 'today' : 'normal';
  return h('p', { class: ['due-chip', tone] }, icon('clock', 13), h('time', { datetime: item.due }, formatDate(item.due)), ` · ${item.days_left === 0 ? 'өнөөдөр' : daysLeftText(item.days_left)}`);
}

function todoItems(todo) {
  return todo.map((item) => {
    const [name, tone] = LOOK[item.key] ?? ['clock', 'violet'];
    return { icon: name, tone, text: item.text, extra: dueChip(item), href: item.link, action: ACTIONS[item.key] ?? 'Нээх' };
  });
}

function heroCard(user, data) {
  const i = data.internship;
  const path = document.createElement('progress-path');
  if (i) { path.stages = i.stage_names; path.current = i.stage_index; }
  const total = i?.stage_names.length ?? 7;
  return hero({
    date: todayLabel(data.today), name: user.first_name, sub: i?.semester.label,
    aside: i ? h('div', { class: 'hero-progress' }, path,
      h('p', { class: 'hero-count', 'aria-hidden': 'true' }, h('strong', {}, Math.min(i.stage_index + 1, total)), `/${total} үе шат`, i.stage_names[i.stage_index] ? ` · ${i.stage_names[i.stage_index]}` : '')) : null,
  });
}

export async function render() {
  const [{ user }, data] = await Promise.all([getSession(), getDashboard()]);
  const i = data.internship;
  if (!i) {
    return h('section', {}, heroCard(user, data),
      emptyState('Бүртгэлтэй дадлага алга', 'Админ таныг улиралд нэмэхэд дадлага тань энд харагдана.'));
  }
  return h('div', { class: 'stack' }, heroCard(user, data), todoPanel(todoItems(i.todo)));
}
