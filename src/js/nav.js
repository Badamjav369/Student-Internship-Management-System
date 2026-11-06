// Дүр бүрийн цэсийн нэг эх сурвалж: sidebar, доод цэс, router, user-menu бүгд эндээс авна.
const item = (key, label, short, href, icon) => ({ key, label, short, href, icon });

export const STUDENT_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/student/home', 'home'),
  item('postings', 'Дадлагын байгууллага', 'Байгууллага', '/student/postings', 'building'),
  item('contract', 'Гуравласан гэрээ', 'Гэрээ', '/student/contract', 'contract'),
  item('plan', 'Ажлын төлөвлөгөө', 'Төлөвлөгөө', '/student/plan', 'plan'),
  item('logbook', 'Дадлагын дэвтэр', 'Дэвтэр', '/student/logbook', 'book'),
  item('report', 'Тайлан', 'Тайлан', '/student/report', 'report'),
  item('defense', 'Хамгаалалт', 'Хамгаалалт', '/student/defense', 'calendar'),
  item('score', 'Үнэлгээ', 'Үнэлгээ', '/student/score', 'award'),
  item('guide', 'Удирдамж', 'Удирдамж', '/student/guide', 'megaphone'),
];

export const SUPERVISOR_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/supervisor/home', 'home'),
  item('students', 'Миний оюутнууд', 'Оюутнууд', '/supervisor/students', 'users'),
  item('plans', 'Ажлын төлөвлөгөө', 'Төлөвлөгөө', '/supervisor/plans', 'plan'),
  item('reports', 'Тайлан', 'Тайлан', '/supervisor/reports', 'report'),
  item('scores', 'Оноо, эцсийн дүн', 'Оноо', '/supervisor/scores', 'award'),
  item('grade-sheets', 'Дүнгийн хуудас', 'Дүнгийн хуудас', '/supervisor/grade-sheets', 'chart'),
  item('announcements', 'Удирдамж', 'Удирдамж', '/supervisor/announcements', 'megaphone'),
];

export const MENTOR_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/mentor/home', 'home'),
  item('students', 'Дадлагажигчид', 'Оюутнууд', '/mentor/students', 'users'),
  item('plans', 'Ажлын төлөвлөгөө', 'Төлөвлөгөө', '/mentor/plans', 'plan'),
  item('logbook', 'Дадлагын дэвтэр', 'Дэвтэр', '/mentor/logbook', 'book'),
  item('contracts', 'Гуравласан гэрээ', 'Гэрээ', '/mentor/contracts', 'contract'),
  item('scores', 'Байгууллагын үнэлгээ', 'Үнэлгээ', '/mentor/scores', 'award'),
];

export const HEAD_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/head/home', 'home'),
  item('contracts', 'Гуравласан гэрээ', 'Гэрээ', '/head/contracts', 'contract'),
  item('requests', 'Газрын хүсэлт', 'Хүсэлт', '/head/requests', 'inbox'),
  item('summary', 'Нэгтгэл, статистик', 'Нэгтгэл', '/head/summary', 'chart'),
];

export const ORG_REP_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/org_rep/home', 'home'),
  item('postings', 'Дадлагын зар', 'Зар', '/org_rep/postings', 'megaphone'),
  item('applications', 'Оюутны хүсэлт', 'Хүсэлт', '/org_rep/applications', 'inbox'),
  item('interns', 'Дадлагажигчид', 'Оюутнууд', '/org_rep/interns', 'users'),
  item('info', 'Байгууллага', 'Байгууллага', '/org_rep/info', 'building'),
];

export const COMMITTEE_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/committee/home', 'home'),
  item('students', 'Оюутан, оноо', 'Оюутнууд', '/committee/students', 'award'),
  item('committees', 'Хамгаалалтын хуваарь', 'Хуваарь', '/committee/committees', 'calendar'),
];

export const ADMIN_NAV = [
  item('home', 'Нүүр', 'Нүүр', '/admin/home', 'home'),
  item('semesters', 'Улирлын тохиргоо', 'Улирал', '/admin/semesters', 'settings'),
  item('users', 'Хэрэглэгч', 'Хэрэглэгч', '/admin/users', 'users'),
  item('organizations', 'Байгууллага', 'Байгууллага', '/admin/organizations', 'building'),
  item('committees', 'Комисс, хуваарь', 'Комисс', '/admin/committees', 'calendar'),
  item('reports', 'Тайлан', 'Тайлан', '/admin/reports', 'report'),
  item('summary', 'Нэгтгэл, статистик', 'Нэгтгэл', '/admin/summary', 'chart'),
];

// bottom — утасны доод цэсэнд гарах 4 (5-р нь «Цэс»).
export const ROLE_NAV = {
  student: { label: 'Оюутан', home: '/student/home', items: STUDENT_NAV, bottom: ['home', 'postings', 'logbook', 'report'] },
  supervisor: { label: 'Удирдагч багш', home: '/supervisor/home', items: SUPERVISOR_NAV, bottom: ['home', 'students', 'reports', 'scores'] },
  mentor: { label: 'Дадлага удирдагч', home: '/mentor/home', items: MENTOR_NAV, bottom: ['home', 'students', 'logbook', 'scores'] },
  head: { label: 'Тэнхмийн эрхлэгч', home: '/head/home', items: HEAD_NAV, bottom: ['home', 'contracts', 'requests', 'summary'] },
  org_rep: { label: 'Байгууллагын төлөөлөгч', home: '/org_rep/home', items: ORG_REP_NAV, bottom: ['home', 'postings', 'applications', 'interns'] },
  committee: { label: 'Комиссын гишүүн', home: '/committee/home', items: COMMITTEE_NAV, bottom: ['home', 'students', 'committees'] },
  admin: { label: 'Админ', home: '/admin/home', items: ADMIN_NAV, bottom: ['home', 'semesters', 'users', 'reports'] },
};
