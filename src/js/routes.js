// Маршрутын хүснэгт. Хуудас бүр шаардлагатай үедээ л (lazy) ачаалагдана.
// Дараалал чухал: '/admin/users/new' нь '/admin/users/:id'-ээс өмнө.

export const studentRoutes = [
  { path: '/student/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/student/home.js') },
  { path: '/student/postings', nav: 'postings', title: 'Дадлагын байгууллага', load: () => import('./pages/student/postings/index.js') },
  { path: '/student/postings/:id', nav: 'postings', title: 'Зарын дэлгэрэнгүй', load: () => import('./pages/student/postings/detail.js') },
  { path: '/student/contract', nav: 'contract', title: 'Гуравласан гэрээ', load: () => import('./pages/student/contract.js') },
  { path: '/student/plan', nav: 'plan', title: 'Ажлын төлөвлөгөө', load: () => import('./pages/student/plan.js') },
  { path: '/student/logbook', nav: 'logbook', title: 'Дадлагын дэвтэр', load: () => import('./pages/student/logbook.js') },
  { path: '/student/report', nav: 'report', title: 'Дадлагын тайлан', load: () => import('./pages/student/report.js') },
  { path: '/student/defense', nav: 'defense', title: 'Хамгаалалт', load: () => import('./pages/student/defense.js') },
  { path: '/student/score', nav: 'score', title: 'Үнэлгээ', load: () => import('./pages/student/score.js') },
  { path: '/student/guide', nav: 'guide', title: 'Удирдамж', load: () => import('./pages/student/guide.js') },
];

export const supervisorRoutes = [
  { path: '/supervisor/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/supervisor/home.js') },
  { path: '/supervisor/students', nav: 'students', title: 'Миний оюутнууд', load: () => import('./pages/supervisor/students/index.js') },
  { path: '/supervisor/students/:id', nav: 'students', title: 'Оюутан', load: () => import('./pages/supervisor/students/detail.js') },
  { path: '/supervisor/plans', nav: 'plans', title: 'Ажлын төлөвлөгөө', load: () => import('./pages/supervisor/plans/index.js') },
  { path: '/supervisor/plans/:id', nav: 'plans', title: 'Ажлын төлөвлөгөө', load: () => import('./pages/supervisor/plans/detail.js') },
  { path: '/supervisor/reports', nav: 'reports', title: 'Тайлан', load: () => import('./pages/supervisor/reports/index.js') },
  { path: '/supervisor/reports/:id', nav: 'reports', title: 'Тайлан хянах', load: () => import('./pages/supervisor/reports/detail.js') },
  { path: '/supervisor/scores', nav: 'scores', title: 'Оноо, эцсийн дүн', load: () => import('./pages/supervisor/scores/index.js') },
  { path: '/supervisor/scores/:id', nav: 'scores', title: 'Оноо, эцсийн дүн', load: () => import('./pages/supervisor/scores/detail.js') },
  { path: '/supervisor/grade-sheets', nav: 'grade-sheets', title: 'Дүнгийн хуудас', load: () => import('./pages/supervisor/grade-sheets.js') },
  { path: '/supervisor/announcements', nav: 'announcements', title: 'Удирдамж', load: () => import('./pages/supervisor/announcements.js') },
];

export const mentorRoutes = [
  { path: '/mentor/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/mentor/home.js') },
  { path: '/mentor/students', nav: 'students', title: 'Дадлагажигчид', load: () => import('./pages/mentor/students/index.js') },
  { path: '/mentor/students/:id', nav: 'students', title: 'Оюутан', load: () => import('./pages/mentor/students/detail.js') },
  { path: '/mentor/plans', nav: 'plans', title: 'Ажлын төлөвлөгөө', load: () => import('./pages/mentor/plans/index.js') },
  { path: '/mentor/plans/:id', nav: 'plans', title: 'Ажлын төлөвлөгөө хянах', load: () => import('./pages/mentor/plans/detail.js') },
  { path: '/mentor/logbook', nav: 'logbook', title: 'Дадлагын дэвтэр', load: () => import('./pages/mentor/logbook.js') },
  { path: '/mentor/contracts', nav: 'contracts', title: 'Гуравласан гэрээ', load: () => import('./pages/mentor/contracts/index.js') },
  { path: '/mentor/contracts/:id', nav: 'contracts', title: 'Гуравласан гэрээ', load: () => import('./pages/mentor/contracts/detail.js') },
  { path: '/mentor/scores', nav: 'scores', title: 'Байгууллагын үнэлгээ', load: () => import('./pages/mentor/scores/index.js') },
  { path: '/mentor/scores/:id', nav: 'scores', title: 'Байгууллагын үнэлгээ', load: () => import('./pages/mentor/scores/detail.js') },
];

export const headRoutes = [
  { path: '/head/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/head/home.js') },
  { path: '/head/contracts', nav: 'contracts', title: 'Гуравласан гэрээ', load: () => import('./pages/head/contracts/index.js') },
  { path: '/head/contracts/:id', nav: 'contracts', title: 'Гэрээ шалгах', load: () => import('./pages/head/contracts/detail.js') },
  { path: '/head/requests', nav: 'requests', title: 'Газрын хүсэлт', load: () => import('./pages/head/requests/index.js') },
  { path: '/head/requests/:id', nav: 'requests', title: 'Газрын хүсэлт', load: () => import('./pages/head/requests/detail.js') },
  { path: '/head/summary', nav: 'summary', title: 'Нэгтгэл, статистик', load: () => import('./pages/head/summary.js') },
];

export const orgRepRoutes = [
  { path: '/org_rep/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/org_rep/home.js') },
  { path: '/org_rep/postings', nav: 'postings', title: 'Дадлагын зар', load: () => import('./pages/org_rep/postings/index.js') },
  { path: '/org_rep/postings/new', nav: 'postings', title: 'Шинэ зар', load: () => import('./pages/org_rep/postings/new.js') },
  { path: '/org_rep/postings/:id', nav: 'postings', title: 'Зар', load: () => import('./pages/org_rep/postings/detail.js') },
  { path: '/org_rep/applications', nav: 'applications', title: 'Оюутны хүсэлт', load: () => import('./pages/org_rep/applications/index.js') },
  { path: '/org_rep/applications/:id', nav: 'applications', title: 'Хүсэлт шийдэх', load: () => import('./pages/org_rep/applications/detail.js') },
  { path: '/org_rep/interns', nav: 'interns', title: 'Дадлагажигчид', load: () => import('./pages/org_rep/interns/index.js') },
  { path: '/org_rep/interns/:id', nav: 'interns', title: 'Дадлагажигч', load: () => import('./pages/org_rep/interns/detail.js') },
  { path: '/org_rep/info', nav: 'info', title: 'Байгууллага', load: () => import('./pages/org_rep/info.js') },
];

export const committeeRoutes = [
  { path: '/committee/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/committee/home.js') },
  { path: '/committee/students', nav: 'students', title: 'Оюутан, оноо', load: () => import('./pages/committee/students/index.js') },
  { path: '/committee/students/:id', nav: 'students', title: 'Оюутан, оноо', load: () => import('./pages/committee/students/detail.js') },
  { path: '/committee/committees', nav: 'committees', title: 'Хамгаалалтын хуваарь', load: () => import('./pages/committee/committees.js') },
];

export const adminRoutes = [
  { path: '/admin/home', nav: 'home', title: 'Нүүр', load: () => import('./pages/admin/home.js') },
  { path: '/admin/semesters', nav: 'semesters', title: 'Улирлын тохиргоо', load: () => import('./pages/admin/semesters/index.js') },
  { path: '/admin/semesters/:id', nav: 'semesters', title: 'Улирал', load: () => import('./pages/admin/semesters/detail.js') },
  { path: '/admin/internships/:id', nav: 'semesters', title: 'Дадлагын дэлгэрэнгүй', load: () => import('./pages/admin/semesters/internship.js') },
  { path: '/admin/users', nav: 'users', title: 'Хэрэглэгч', load: () => import('./pages/admin/users/index.js') },
  { path: '/admin/users/new', nav: 'users', title: 'Хэрэглэгч нэмэх', load: () => import('./pages/admin/users/new.js') },
  { path: '/admin/users/import', nav: 'users', title: 'Оюутан Excel-ээр бүртгэх', load: () => import('./pages/admin/users/import.js') },
  { path: '/admin/users/:id', nav: 'users', title: 'Хэрэглэгч', load: () => import('./pages/admin/users/detail.js') },
  { path: '/admin/organizations', nav: 'organizations', title: 'Байгууллага', load: () => import('./pages/admin/organizations/index.js') },
  { path: '/admin/organizations/:id', nav: 'organizations', title: 'Байгууллага', load: () => import('./pages/admin/organizations/detail.js') },
  { path: '/admin/committees', nav: 'committees', title: 'Комисс, хуваарь', load: () => import('./pages/admin/committees/index.js') },
  { path: '/admin/committees/:id', nav: 'committees', title: 'Комисс', load: () => import('./pages/admin/committees/detail.js') },
  { path: '/admin/reports', nav: 'reports', title: 'Тайлан', load: () => import('./pages/admin/reports/index.js') },
  { path: '/admin/reports/:id', nav: 'reports', title: 'Тайлан', load: () => import('./pages/admin/reports/detail.js') },
  { path: '/admin/summary', nav: 'summary', title: 'Нэгтгэл, статистик', load: () => import('./pages/admin/summary.js') },
];

// Дүр бүрт нийтлэг хуудсууд (мэдэгдэл, профайл) — нэг модуль, дүр бүрийн хаягаар.
const account = (role) => [
  { path: `/${role}/notifications`, nav: null, title: 'Мэдэгдэл', load: () => import('./pages/account/notifications.js') },
  { path: `/${role}/profile`, nav: null, title: 'Профайл', load: () => import('./pages/account/profile.js') },
];
const ROLE_ROUTES = { student: studentRoutes, supervisor: supervisorRoutes, mentor: mentorRoutes, head: headRoutes, org_rep: orgRepRoutes, committee: committeeRoutes, admin: adminRoutes };
export const routesOf = (role) => [...ROLE_ROUTES[role], ...account(role)];

// Нэвтрээгүй үед харагдах хуудсууд (<auth-shell> дотор). Нэвтэрсэн хэрэглэгчийн хуудсуудаас тусдаа.
export const authRoutes = [
  { path: '/login', title: 'Нэвтрэх', load: () => import('./pages/auth/login.js') },
  { path: '/register', title: 'Байгууллага бүртгүүлэх', load: () => import('./pages/auth/register.js') },
  { path: '/forgot-password', title: 'Нууц үг сэргээх', load: () => import('./pages/auth/forgot.js') },
  { path: '/password', title: 'Нууц үг тохируулах', load: () => import('./pages/auth/password.js') },
  { path: '/consent', title: 'Зөвшөөрөл', load: () => import('./pages/auth/consent.js') },
];
