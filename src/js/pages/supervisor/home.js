// Удирдагч багшийн нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { getSession } from '../../data/session-api.js';
import { getActiveSemester, listMyInternships, supervisorToday } from '../../data/supervisor-api.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import { noStudents, todoItems } from './shared.js';

export async function render() {
  const [{ user }, semester, interns] = await Promise.all([getSession(), getActiveSemester(), listMyInternships()]);
  const card = hero({ date: todayLabel(supervisorToday()), name: user.first_name, sub: semester ? semesterName(semester) : null });
  return h('div', { class: 'stack' }, card, interns.length ? todoPanel(todoItems(interns)) : noStudents());
}
