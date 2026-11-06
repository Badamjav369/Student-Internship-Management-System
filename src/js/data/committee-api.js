// Комиссын гишүүний хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/committee/* (server/modules/committee/).
import { api } from './http.js';

const at = (id, path = '') => `/committee/students/${id}${path}`;

export const committeeToday = () => new Date().toISOString().slice(0, 10);
export const getActiveSemester = () => api('/committee/semester');
export const listMyStudents = () => api('/committee/students');
export const getStudent = (id) => api(at(id));
export const getStudentPlan = (id) => api(at(id, '/plan'));
export const getStudentReport = (id) => api(at(id, '/report'));
export const getStudentLogbook = (id) => api(at(id, '/logbook'));
export const saveScores = (id, scores) => api(at(id, '/scores'), { method: 'POST', body: { scores } });
export const listMyCommittees = () => api('/committee/committees');
