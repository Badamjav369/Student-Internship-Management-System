// Оюутны хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/student/* (server/modules/student/).
import { api, formData } from './http.js';

export const getDashboard = () => api('/student/dashboard');

// ---------- Дадлагын байгууллага ----------
export const listPostings = (query = {}) => api('/student/postings', { query });
export const listPostingFacets = (query = {}) => api('/student/postings/facets', { query });
export const getPosting = (id) => api(`/student/postings/${id}`);
export const listApplications = () => api('/student/applications');
export const createApplication = (postingId, { cv, letter }) => api(`/student/postings/${postingId}/apply`, { method: 'POST', form: formData({ cv, letter }) });
export const cancelApplication = (id) => api(`/student/applications/${id}/cancel`, { method: 'POST' });
export const listPlacementRequests = () => api('/student/requests');
export const createPlacementRequest = ({ document = null, document_name, ...data }) => api('/student/requests', { method: 'POST', form: formData({ ...data, document }) });
export const cancelPlacementRequest = (id) => api(`/student/requests/${id}/cancel`, { method: 'POST' });

// ---------- Гэрээ, төлөвлөгөө ----------
export const getContract = () => api('/student/contract');
export const chooseContractMode = (mode) => api('/student/contract/mode', { method: 'POST', body: { mode } });
export const uploadContractScan = (file) => api('/student/contract/scan', { method: 'POST', form: formData({ file }) });
export const getWorkPlan = () => api('/student/plan');
export const submitWorkPlan = (body) => api('/student/plan', { method: 'POST', body });

// ---------- Дэвтэр ----------
export const getLogbook = () => api('/student/logbook');
export function saveLogEntry(date, { hours, work_done, addFiles = [], removeIds = [] }) {
  const form = formData({ hours: String(hours), work_done, remove: removeIds });
  for (const f of addFiles) form.append('files', f);
  return api(`/student/logbook/${date}`, { method: 'POST', form });
}

// ---------- Тайлан ----------
export const getReport = () => api('/student/report');
export const uploadReportFile = (key, file) => api(`/student/report/files/${encodeURIComponent(key)}`, { method: 'POST', form: formData({ file }) });
export const submitReport = () => api('/student/report/submit', { method: 'POST' });

// ---------- Хамгаалалт, үнэлгээ, удирдамж ----------
export const getDefense = () => api('/student/defense');
export const getEvaluation = () => api('/student/evaluation');
export const listAnnouncements = (query = {}) => api('/student/announcements', { query });
export const listTemplates = () => api('/student/templates');
