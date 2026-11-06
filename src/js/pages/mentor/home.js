// Дадлага удирдагчийн нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { getSession } from '../../data/session-api.js';
import { getMyOrganization, listMyInternships, mentorToday } from '../../data/mentor-api.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import { noInterns, todoItems } from './shared.js';

export async function render() {
  const [{ user }, { organization, semester }, interns] = await Promise.all([getSession(), getMyOrganization(), listMyInternships()]);
  const sub = [organization?.name, semester ? semesterName(semester) : null].filter(Boolean).join(' · ');
  const card = hero({ date: todayLabel(mentorToday()), name: user.first_name, sub: sub || null });
  return h('div', { class: 'stack' }, card, interns.length ? todoPanel(todoItems(interns)) : noInterns());
}
