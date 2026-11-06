// Байгууллагын төлөөлөгчийн хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/org/* (server/modules/org-rep/).
import { api } from './http.js';

export const orgRepToday = () => new Date().toISOString().slice(0, 10);
export const getMyOrganization = () => api('/org/organization');
export const updateOrganization = (body) => api('/org/organization', { method: 'PUT', body });
export const uploadLogo = (file) => { const form = new FormData(); form.append('file', file, file.name); return api('/org/organization/logo', { method: 'POST', form }); };
export const removeLogo = () => api('/org/organization/logo', { method: 'DELETE' });
export const listPostings = () => api('/org/postings');
export const getPosting = (id) => api(`/org/postings/${id}`);
export const createPosting = (body) => api('/org/postings', { method: 'POST', body });
export const updatePosting = (id, body) => api(`/org/postings/${id}`, { method: 'PUT', body });
export const closePosting = (id) => api(`/org/postings/${id}/close`, { method: 'POST' });
export const listApplications = () => api('/org/applications');
export const getApplication = (id) => api(`/org/applications/${id}`);
export const acceptApplication = (id) => api(`/org/applications/${id}/accept`, { method: 'POST' });
export const rejectApplication = (id) => api(`/org/applications/${id}/reject`, { method: 'POST' });
export const listInterns = () => api('/org/interns');
export const getIntern = (id) => api(`/org/interns/${id}`);
export const listMentorCandidates = () => api('/org/mentor-candidates');
export const assignMentor = (id, target) => api(`/org/interns/${id}/mentor`, { method: 'POST', body: target });
