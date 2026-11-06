// Удирдагч багшийн хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/supervisor/* (server/modules/supervisor/).
import { api, formData } from './http.js';

const at = (id, path = '') => `/supervisor/internships/${id}${path}`;
const post = (id, path, body) => api(at(id, path), { method: 'POST', body });

export const supervisorToday = () => new Date().toISOString().slice(0, 10);
export const getActiveSemester = () => api('/supervisor/semester');
export const listMyInternships = () => api('/supervisor/internships');
export const getMyInternship = (id) => api(at(id));

export const getMyPlan = (id) => api(at(id, '/plan'));
export const saveAdvice = (id, text) => post(id, '/plan/advice', { text });

export const getMyReport = (id) => api(at(id, '/report'));
export const acceptReport = (id) => post(id, '/report/accept');
export const requestRevision = (id, comment) => post(id, '/report/revision', { comment });

export const getMyScore = (id) => api(at(id, '/score'));
export const approveOrgScore = (id) => post(id, '/score/org/approve');
export const returnOrgScore = (id, reason) => post(id, '/score/org/return', { reason });
export const confirmCommittee = (id) => post(id, '/score/committee/confirm');
export const markScore = (id, mark, reason) => post(id, '/score/mark', { mark, reason });
export const finalizeScore = (id) => post(id, '/score/finalize');
export const markSisi = (id) => post(id, '/score/sisi');

export const listGradeSheets = () => api('/supervisor/grade-sheets');
export const listMyAnnouncements = () => api('/supervisor/announcements');
export const publishAnnouncement = ({ title, body, file = null }) => api('/supervisor/announcements', { method: 'POST', form: formData({ title, body, file }) });
export const deleteAnnouncement = (id) => api(`/supervisor/announcements/${id}`, { method: 'DELETE' });
