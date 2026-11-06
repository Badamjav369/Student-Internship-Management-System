// Админы хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/admin/* (server/modules/admin/).
import { api, formData } from './http.js';
import { PLAN_DOC, REPORT_DOC } from './labels.js';
const view = ({ plan_status, ...i }) => ({ ...i,
  documents: { work_plan: PLAN_DOC[plan_status] ?? null, report: REPORT_DOC[i.report?.status] ?? null } });
const page = (r) => ({ ...r, items: r.items.map(view) });

export const adminToday = () => new Date().toISOString().slice(0, 10);

// ---------- Улирал ----------
export const listSemesters = () => api('/admin/semesters');
export const getSemester = (id) => api(`/admin/semesters/${id}`);
export const createSemester = (body) => api('/admin/semesters', { method: 'POST', body });
export const updateSemester = (id, body) => api(`/admin/semesters/${id}`, { method: 'PATCH', body });
export const setSemesterStatus = (id, action) => api(`/admin/semesters/${id}/status`, { method: 'POST', body: { action } });
export const deleteSemester = (id) => api(`/admin/semesters/${id}`, { method: 'DELETE' });
export const saveCriterion = (semesterId, body) => api(`/admin/semesters/${semesterId}/criteria`, { method: 'POST', body });
export const deleteCriterion = (semesterId, id) => api(`/admin/semesters/${semesterId}/criteria/${id}`, { method: 'DELETE' });
export const addTemplate = (semesterId, { kind, file, plan_fields = null, required_files = null }) =>
  api(`/admin/semesters/${semesterId}/templates`, { method: 'POST', form: formData({ kind, file, plan_fields, required_files }) });
export const deleteTemplate = (semesterId, id) => api(`/admin/semesters/${semesterId}/templates/${id}`, { method: 'DELETE' });

// ---------- Хэрэглэгч ----------
export const listUsers = (query = {}) => api('/admin/users', { query });
export const getUser = (id) => api(`/admin/users/${id}`);
export const createUser = (body) => api('/admin/users', { method: 'POST', body });
export const setUserRoles = (id, roles) => api(`/admin/users/${id}/roles`, { method: 'PUT', body: roles });
export const userAction = (id, action) => api(`/admin/users/${id}/action`, { method: 'POST', body: { action } });
export const deleteUser = (id) => api(`/admin/users/${id}`, { method: 'DELETE' });
export const importStudents = (file, { dry }) => api('/admin/users/import', { method: 'POST', form: formData({ file, dry: String(dry) }) });

// ---------- Байгууллага ----------
export const listOrganizations = (query = {}) => api('/admin/organizations', { query });
export const getOrganization = (id) => api(`/admin/organizations/${id}`);
export const updateOrganization = (id, body) => api(`/admin/organizations/${id}`, { method: 'PATCH', body });
export const uploadOrganizationLogo = (id, file) => { const form = new FormData(); form.append('file', file, file.name); return api(`/admin/organizations/${id}/logo`, { method: 'POST', form }); };
export const removeOrganizationLogo = (id) => api(`/admin/organizations/${id}/logo`, { method: 'DELETE' });
export const deleteOrganization = (id) => api(`/admin/organizations/${id}`, { method: 'DELETE' });

// ---------- Улирлын оюутан, дадлага ----------
export const listInternships = async (semesterId, { reportStatus = '', ...query } = {}) => page(await api(`/admin/semesters/${semesterId}/internships`, { query: { ...query, report: reportStatus } }));
export const getInternship = async (id) => view(await api(`/admin/internships/${id}`));
export const listCandidates = (semesterId, q = '') => api(`/admin/semesters/${semesterId}/candidates`, { query: { q } });
export const addStudents = (semesterId, picks) => api(`/admin/semesters/${semesterId}/internships`, { method: 'POST', body: picks });
export const removeStudent = (id) => api(`/admin/internships/${id}`, { method: 'DELETE' });
export const assignSupervisors = (list) => api('/admin/internships/supervisors', { method: 'POST', body: list });
export const listSupervisors = () => api('/admin/supervisors');
export const applyChange = (id, { kind, reason, details, document = null }) => api(`/admin/internships/${id}/changes`, { method: 'POST', form: formData({ kind, reason, details, document }) });

// ---------- Нүүр, нэгтгэл ----------
export const adminTodo = (semesterId) => api(`/admin/semesters/${semesterId}/todo`);
export const adminSummary = async (semesterId, query = {}) => page(await api(`/admin/semesters/${semesterId}/summary`, { query }));
export const adminStats = (semesterId) => api(`/admin/semesters/${semesterId}/stats`);

// ---------- Комисс ----------
export const listCommittees = (semesterId) => api(`/admin/semesters/${semesterId}/committees`);
export const listCommitteeMembers = (semesterId) => api(`/admin/semesters/${semesterId}/committee-members`);
export const getCommittee = (id) => api(`/admin/committees/${id}`);
export const saveCommittee = (body, id = null) => api(id ? `/admin/committees/${id}` : '/admin/committees', { method: id ? 'PUT' : 'POST', body });
export const deleteCommittee = (id) => api(`/admin/committees/${id}`, { method: 'DELETE' });
export const saveSlots = (id, slots) => api(`/admin/committees/${id}/slots`, { method: 'PUT', body: slots });
export const publishCommittee = (id) => api(`/admin/committees/${id}/publish`, { method: 'POST' });

// ---------- Тайлан ----------
export const getReportOf = async (id) => view(await api(`/admin/internships/${id}/report`));
export const proxySubmitReport = (id, files) => api(`/admin/internships/${id}/report`, { method: 'POST', form: formData(Object.fromEntries(files.map((f) => [f.requirement, f.file]))) });
export const expireReport = (id, reason) => api(`/admin/internships/${id}/report/expire`, { method: 'POST', body: { reason } });
export const reportCounts = (semesterId) => api(`/admin/semesters/${semesterId}/report-counts`);

/** Шалгууруудын дээд онооны нийлбэр (идэвхжүүлэхэд 100 байх ёстой). */
export const criteriaTotal = (s) => s.criteria.reduce((sum, c) => sum + Number(c.max_score), 0);
