// Тэнхмийн эрхлэгчийн нүүр: мэндчилгээний карт + «Хийх ажил». Мэдээлэл тус тусын хуудсанд.
import { h } from '../../core/dom.js';
import { todayLabel } from '../../core/format.js';
import { semesterName } from '../../core/labels.js';
import { getActiveSemester, headToday, listContracts, listRequests } from '../../data/head-api.js';
import { getSession } from '../../data/session-api.js';
import { hero } from '../../components/hero.js';
import { todoPanel } from '../../components/todo-panel.js';
import { todoItems } from './shared.js';

export async function render() {
  const [{ user }, semester, contracts, requests] = await Promise.all([getSession(), getActiveSemester(), listContracts(), listRequests()]);
  return h('div', { class: 'stack' }, hero({ date: todayLabel(headToday()), name: user.first_name, sub: semester ? semesterName(semester) : null }), todoPanel(todoItems(contracts, requests)));
}
