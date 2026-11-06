// Дадлага удирдагчийн хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/mentor/* (server/modules/mentor/).
import { api, formData } from './http.js';

const at = (id, path = '') => `/mentor/internships/${id}${path}`;

export const mentorToday = () => new Date().toISOString().slice(0, 10);
export const getMyOrganization = () => api('/mentor/organization');
export const listMyInternships = () => api('/mentor/internships');
export const getMyInternship = (id) => api(at(id));
export const getMyPlan = (id) => api(at(id, '/plan'));
export const approvePlan = (id, comment = '') => api(at(id, '/plan/approve'), { method: 'POST', body: { comment } });
export const returnPlan = (id, comment) => api(at(id, '/plan/return'), { method: 'POST', body: { comment } });
export const getLogbook = (id) => api(at(id, '/logbook'));
export const reviewDays = (id, entries) => api(at(id, '/logbook/review'), { method: 'POST', body: entries });
export const getMyScore = (id) => api(at(id, '/score'));
export const submitOrgScore = (id, { scores, letter = null }) => api(at(id, '/score'), { method: 'POST', form: formData({ scores, letter }) });

export const listContracts = () => api('/mentor/contracts');
export const getContract = (id) => api(`/mentor/contracts/${id}`);
export const saveSeal = (image) => api('/mentor/seal', { method: 'PUT', body: { image } });
