// Комиссын гишүүний нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { committeeToday, getActiveSemester, listMyStudents } from '../../data/committee-api.js';
import { getSession } from '../../data/session-api.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import { noStudents, todoItems } from './shared.js';

export async function render() {
  const [{ user }, semester, students] = await Promise.all([getSession(), getActiveSemester(), listMyStudents()]);
  const card = hero({ date: todayLabel(committeeToday()), name: user.first_name, sub: semester ? semesterName(semester) : null });
  return h('div', { class: 'stack' }, card, students.length ? todoPanel(todoItems(students)) : noStudents());
}
