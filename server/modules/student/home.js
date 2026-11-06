// Нүүр: үе шат, «хийх ажил», газар/удирдагчдын мэдээлэл, хугацаа.
import { json } from '../../lib/http.js';
import { today } from '../../lib/db.js';
import { daysOf, mine } from './context.js';

export const STATUS_LABELS = {
  searching: 'Газар хайж байна', applied: 'Хүсэлт илгээсэн', contracting: 'Гэрээ байгуулж байна', planning: 'Төлөвлөгөө бичиж байна', in_progress: 'Дадлага хийж байна',
  reporting: 'Тайлан өгч байна', ready: 'Хамгаалалтад бэлэн', evaluating: 'Үнэлгээ хүлээж байна', completed: 'Дууссан', deferred: 'Хойшлогдсон', failed: 'Хангалтгүй', stopped: 'Зогсоосон',
};
// Шат бүрийн нэр; «Ажлын төлөвлөгөө» шатыг улирал шаардаагүй бол хасна.
const STAGES = [['search', 'Газар олох'], ['contract', 'Гэрээ'], ['plan', 'Ажлын төлөвлөгөө'], ['work', 'Дадлага хийх'], ['report', 'Тайлан'], ['defense', 'Хамгаалалт'], ['grade', 'Дүн']];
const STAGE_OF = { searching: 'search', applied: 'search', stopped: 'search', contracting: 'contract', planning: 'plan', in_progress: 'work', reporting: 'report', ready: 'defense', evaluating: 'grade', deferred: 'grade', failed: 'grade' };
function stagesOf(i) {
  const list = STAGES.filter(([key]) => key !== 'plan' || i.plan_enabled);
  return { names: list.map(([, name]) => name), index: i.status === 'completed' ? list.length : Math.max(0, list.findIndex(([key]) => key === STAGE_OF[i.status])) };
}
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const short = (u) => (u ? `${u.last_name[0]}. ${u.first_name}` : null);

async function todoOf(db, i) {
  const now = today();
  const todo = [];
  const add = (key, text, { due = null, link = null } = {}) => todo.push({ key, text, due, days_left: due ? daysBetween(now, due) : null, link });
  const one = (sql) => db.one(sql, i.id);
  switch (i.status) {
    case 'searching': add('apply', 'Зараас сонгож хүсэлт илгээнэ үү.', { due: i.register_to, link: '/student/postings' }); break;
    case 'applied': {
      const n = await db.value("SELECT count(*) FROM applications WHERE internship_id = ? AND status = 'pending'", i.id);
      add('wait_applications', `Байгууллагын хариу хүлээж байна (${n} хүсэлт).`, { link: '/student/postings?tab=mine' });
      break;
    }
    case 'contracting': {
      const c = await one('SELECT status, return_reason, mode FROM contracts WHERE internship_id = ?');
      const signed = c?.mode === 'touch' || c?.mode === 'digital' ? await db.one('SELECT 1 FROM contract_signatures WHERE internship_id = ? AND party = ?', i.id, 'student') : null;
      if (c?.status === 'filled' && (c.mode === 'touch' || c.mode === 'digital')) add(signed ? 'wait_contract' : 'sign_contract', signed ? 'Бусад талын гарын үсгийг хүлээж байна.' : 'Гэрээнд гарын үсэг зурна уу.', { link: '/student/contract' });
      else if (c?.status === 'returned') add('fix_contract', `Гэрээ буцсан: ${c.return_reason}. Засаж байршуулна уу.`, { link: '/student/contract' });
      else if (c?.status === 'scanned') add('wait_contract', 'Гэрээ баталгаажихыг хүлээж байна.', { link: '/student/contract' });
      else add('upload_contract', 'Гэрээг хэвлэж, гарын үсэг зуруулаад скан байршуулна уу.', { link: '/student/contract' });
      break;
    }
    case 'planning': {
      const p = await one('SELECT status FROM work_plans WHERE internship_id = ?');
      if (p?.status === 'submitted') add('wait_plan', 'Төлөвлөгөө батлагдахыг хүлээж байна.', { link: '/student/plan' });
      else add('submit_plan', p?.status === 'returned' ? 'Төлөвлөгөөг засаж дахин илгээнэ үү.' : 'Ажлын төлөвлөгөөгөө илгээнэ үү.', { link: '/student/plan' });
      break;
    }
    case 'in_progress': {
      const days = daysOf(i);
      if (i.logbook_enabled && days.includes(now) && !(await db.one('SELECT 1 FROM log_entries WHERE internship_id = ? AND date = ?', i.id, now))) add('write_log', 'Өнөөдрийн тэмдэглэлээ бичнэ үү.', { due: now, link: '/student/logbook' });
      if (i.logbook_enabled && i.missing_days > 0) add('missing_days', `Тэмдэглэлгүй ${i.missing_days} өдөр байна.`, { link: '/student/logbook' });
      add('work_ends', 'Дадлагын хугацаа дуусна.', { due: i.end_date });
      add('report_window', 'Тайлан илгээх хугацаа.', { due: i.report_to, link: '/student/report' });
      break;
    }
    case 'reporting': {
      const r = await one('SELECT status, deadline FROM reports WHERE internship_id = ?');
      if (!r || ['not_submitted', 'revision'].includes(r.status)) add('submit_report', 'Тайлангаа илгээнэ үү.', { due: r?.deadline ?? i.report_to, link: '/student/report' });
      else add('wait_report', 'Тайлан хянагдаж байна.', { link: '/student/report' });
      break;
    }
    case 'ready': {
      const d = await db.one(`SELECT c.defense_date, c.location, c.online_url, c.format, d.slot_time FROM defense_slots d JOIN committees c ON c.id = d.committee_id
        WHERE d.internship_id = ? AND c.published_at IS NOT NULL`, i.id);
      if (d) add('defense', `Хамгаалалт: ${d.defense_date} ${d.slot_time ?? ''}, ${d.format === 'online' ? 'онлайн' : d.location ?? ''}.`, { due: d.defense_date, link: '/student/defense' });
      else add('wait_defense', 'Хамгаалалтын хуваарь гарахыг хүлээж байна.', { link: '/student/defense' });
      break;
    }
    case 'evaluating': add('wait_score', 'Үнэлгээ гарахыг хүлээж байна.', { link: '/student/score' }); break;
    case 'completed': case 'failed': case 'deferred': add('result', 'Дадлагын эцсийн дүн гарлаа.', { link: '/student/score' }); break;
    default:
  }
  return todo;
}

async function dashboard({ db, user }) {
  const i = await mine(db, user);
  const out = { today: today(), internship: null };
  if (!i) return json(out);
  const [org, mentor, supervisor] = await Promise.all([
    i.organization_id ? db.one('SELECT id, name, field FROM organizations WHERE id = ?', i.organization_id) : null,
    i.mentor_id ? db.one('SELECT last_name, first_name, position, phone, email FROM users WHERE id = ?', i.mentor_id) : null,
    i.supervisor_id ? db.one('SELECT last_name, first_name, phone, email FROM users WHERE id = ?', i.supervisor_id) : null,
  ]);
  out.internship = {
    id: i.id, status: i.status, status_label: STATUS_LABELS[i.status], semester: { label: `${i.academic_year} оны хичээлийн жилийн ${i.season === 'winter' ? 'Өвлийн' : 'Зуны'} дадлага` },
    stage_names: stagesOf(i).names, stage_index: stagesOf(i).index, features: { plan: Boolean(i.plan_enabled), logbook: Boolean(i.logbook_enabled) }, todo: await todoOf(db, i),
    info: {
      organization: org, mentor: mentor ? { name: short(mentor), position: mentor.position, phone: mentor.phone, email: mentor.email } : null,
      supervisor: supervisor ? { name: short(supervisor), phone: supervisor.phone, email: supervisor.email } : null,
      register_from: i.register_from, register_to: i.register_to, start_date: i.start_date ?? i.work_from, end_date: i.end_date ?? i.work_to,
      report_deadline: (await db.value('SELECT deadline FROM reports WHERE internship_id = ?', i.id)) ?? i.report_to, max_file_mb: i.max_file_mb,
    },
  };
  return json(out);
}

export const routes = [['GET', '/api/student/dashboard', dashboard]];
