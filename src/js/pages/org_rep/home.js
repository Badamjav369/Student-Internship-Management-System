// Байгууллагын төлөөлөгчийн нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { getSession } from '../../data/session-api.js';
import { getMyOrganization, listApplications, listInterns, orgRepToday } from '../../data/org-rep-api.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import { todoItems } from './shared.js';

export async function render() {
  const [{ user }, { organization, semester }, applications, interns] = await Promise.all([getSession(), getMyOrganization(), listApplications(), listInterns()]);
  const sub = [organization?.name, semester ? semesterName(semester) : null].filter(Boolean).join(' · ');
  return h('div', { class: 'stack' }, hero({ date: todayLabel(orgRepToday()), name: user.first_name, sub: sub || null }), todoPanel(todoItems(applications, interns)));
}
