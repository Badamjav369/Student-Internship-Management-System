// Админы нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { adminTodo, adminToday, listSemesters } from '../../data/admin-api.js';
import { getSession } from '../../data/session-api.js';
import { emptyState } from '../../components/empty-state.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';

function todoItems(semester, t) {
  const base = `/admin/semesters/${semester.id}`;
  const items = [];
  const add = (icon, tone, text, href, action) => items.push({ icon, tone, text, href, action });
  if (t.students === 0) add('users', 'violet', 'Улиралд оюутан нэмээгүй байна.', `${base}?tab=students`, 'Оюутан нэмэх');
  if (t.no_supervisor) add('users', 'amber', `${t.no_supervisor} оюутанд удирдагч багш оноогоогүй байна.`, `${base}?tab=students&supervisor=none`, 'Удирдагч оноох');
  if (t.places_to_register) add('building', 'blue', `${t.places_to_register} оюутны санал болгосон газрыг эрхлэгч зөвшөөрсөн. Газрыг бүртгэнэ үү.`, `${base}?tab=students&status=searching`, 'Газар бүртгэх');
  if (t.no_defense_slot) add('calendar', 'rose', `${t.no_defense_slot} оюутан хамгаалалтын хуваарьт ороогүй байна.`, '/admin/committees', 'Хуваарь гаргах');
  if (t.sisi_pending) add('award', 'green', `${t.sisi_pending} оюутны дүнг СИСИ-д оруулахыг хүлээж байна.`, '/admin/summary?status=evaluating', 'Дүн харах');
  return items;
}

export async function render() {
  const [{ user }, semesters] = await Promise.all([getSession(), listSemesters()]);
  const active = semesters.find((s) => s.status === 'active');
  const todo = active ? await adminTodo(active.id) : null;
  const card = hero({ date: todayLabel(adminToday()), name: user.first_name, sub: active ? semesterName(active) : 'Идэвхтэй улирал алга' });
  if (!active) {
    return h('section', {}, card, emptyState('Идэвхтэй улирал алга', 'Улирлаа тохируулж идэвхжүүлнэ үү.', { icon: 'settings', action: h('a', { class: 'button', href: '#/admin/semesters' }, 'Улирлын тохиргоо') }));
  }
  return h('div', { class: 'stack' }, card, todoPanel(todoItems(active, todo)));
}
