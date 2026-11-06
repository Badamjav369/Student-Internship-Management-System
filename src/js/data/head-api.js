// Тэнхмийн эрхлэгчийн хэсгийн API: хуудсууд зөвхөн эдгээр функцийг дуудна. Backend — /api/head/* (server/modules/head/).
import { api } from './http.js';

export const headToday = () => new Date().toISOString().slice(0, 10);
export const getActiveSemester = () => api('/head/semester');
export const listContracts = () => api('/head/contracts');
export const getContract = (id) => api(`/head/contracts/${id}`);
export const approveContract = (id) => api(`/head/contracts/${id}/approve`, { method: 'POST' });
export const returnContract = (id, reason) => api(`/head/contracts/${id}/return`, { method: 'POST', body: { reason } });
export const listRequests = () => api('/head/requests');
export const getRequest = (id) => api(`/head/requests/${id}`);
export const approveRequest = (id) => api(`/head/requests/${id}/approve`, { method: 'POST' });
export const rejectRequest = (id, reason) => api(`/head/requests/${id}/reject`, { method: 'POST', body: { reason } });
