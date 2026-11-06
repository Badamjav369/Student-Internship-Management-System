// Тайлан: засвар шаардсан, илгээгээгүй, хугацаа хэтэрсэн, хүлээн авсан тайлангууд.
import { h, pageHead } from '../../../core/dom.js';
import { formatDate, fullName } from '../../../core/format.js';
import { pickSemester, REPORT_LABELS, studentLine } from '../../../core/labels.js';
import { listInternships, listSemesters, reportCounts } from '../../../data/admin-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { chipRow, searchBox, semesterSelect } from '../../../components/filters.js';
import { liveList, rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { statusBadge } from '../../../components/status-badge.js';

const ORDER = ['revision', 'not_submitted', 'overdue', 'submitted', 'accepted'];

export async function render({ query, navigate }) {
  const semesters = await listSemesters();
  const semester = pickSemester(semesters, query.get('semester'));
  if (!semester) return h('div', { class: 'stack' }, pageHead('Тайлан'), emptyState('Улирал алга', null, { icon: 'report' }));
  const counts = await reportCounts(semester.id);
  const filters = { reportStatus: ORDER.includes(query.get('status')) ? query.get('status') : 'revision', q: '' };

  const list = liveList({
    label: 'Тайлангууд', noun: 'тайлан',
    load: (page) => listInternships(semester.id, { ...filters, ...page }),
    empty: () => emptyState('Тайлан алга', null, { icon: 'report' }),
    row: (i) => rowCard({
      lead: personAvatar(i.student), title: `${i.student.last_name} ${i.student.first_name}`, href: `/admin/reports/${i.id}`,
      lines: [studentLine(i.student), [i.organization?.name, i.supervisor ? `Удирдагч: ${fullName(i.supervisor)}` : null].filter(Boolean).join(' · '),
        i.report.deadline ? `Хугацаа: ${formatDate(i.report.deadline)}${i.report.open ? '' : ' · хаагдсан'}` : null],
      side: statusBadge(i.report.status, REPORT_LABELS),
    }),
  });
  const options = ORDER.map((k) => [k, REPORT_LABELS[k], counts[k]]);
  return h('div', { class: 'stack' },
    pageHead('Тайлан', semesterSelect(semesters, semester, (id) => navigate(`/admin/reports?semester=${id}`))),
    searchBox({ label: 'Оюутан хайх', placeholder: 'Нэр, код, и-мэйл', onSearch: (q) => { filters.q = q; list.reload(); } }),
    chipRow('Тайлангийн төлөв', options, filters.reportStatus, (v) => { filters.reportStatus = v; list.reload(); }),
    list);
}
