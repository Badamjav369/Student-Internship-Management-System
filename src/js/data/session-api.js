// Нэвтрэлт, дүр, профайл, мэдэгдэл — бүх дүрд нийтлэг. Backend — /api/auth/*, /api/me*, /api/notifications* (server/modules/auth.js, notifications.js).
// Session нь серверийн HttpOnly cookie; localStorage-д зөвхөн «нэвтэрсэн», дүр, зөвшөөрлийн тэмдэг (UI-г шууд зурахад).
import { safeStorage } from '../core/store.js';
import { config } from '../config.js';
import { api } from './http.js';

const SESSION_KEY = `${config.storagePrefix}session`;
const CONSENT_KEY = `${config.storagePrefix}consent`;
const ROLE_KEY = `${config.storagePrefix}role`;
const sessionChanged = (reason = null) => dispatchEvent(new CustomEvent('session-changed', { detail: { reason } }));
export const ROLES = ['student', 'supervisor', 'mentor', 'head', 'org_rep', 'committee', 'admin'];
export const getRole = () => { const role = safeStorage.get(ROLE_KEY); return ROLES.includes(role) ? role : 'student'; };
/** Олон дүртэй хэрэглэгч дүрээ солино (хэрэглэгчийн цэс). */
export function setRole(role) { api('/me/role', { method: 'POST', body: { role } }).then(() => { safeStorage.set(ROLE_KEY, role); sessionChanged('role'); }); }
export const isSignedIn = () => safeStorage.get(SESSION_KEY) === 'in';
export const consentRequired = () => isSignedIn() && !safeStorage.get(CONSENT_KEY);

const remember = ({ role, consent_at }) => { safeStorage.set(SESSION_KEY, 'in'); safeStorage.set(ROLE_KEY, role); if (consent_at) safeStorage.set(CONSENT_KEY, consent_at); else safeStorage.remove(CONSENT_KEY); };
const forget = () => [SESSION_KEY, ROLE_KEY, CONSENT_KEY].forEach((k) => safeStorage.remove(k));
addEventListener('session-expired', () => { if (isSignedIn()) { forget(); sessionChanged('expired'); } });

export async function login(email, password) { remember(await api('/auth/login', { method: 'POST', body: { email: String(email).trim(), password } })); sessionChanged(); }
export async function logout() { await api('/auth/logout', { method: 'POST' }).catch(() => null); forget(); sessionChanged('logout'); }
export async function acceptConsent() { await api('/me/consent', { method: 'POST' }); safeStorage.set(CONSENT_KEY, new Date().toISOString()); sessionChanged(); }
/** Байгууллага өөрөө бүртгүүлнэ: { name, register_no, …, representative: { last_name, first_name, email, phone } }. */
export const registerOrganization = (data) => api('/auth/register-org', { method: 'POST', body: data });
/** Turnstile (CAPTCHA) сайтын түлхүүр; тохируулаагүй бол null. */
export const captchaSiteKey = async () => { try { return (await api('/auth/captcha')).siteKey; } catch { return null; } };
export const requestPasswordReset = (email) => api('/auth/password/forgot', { method: 'POST', body: { email: String(email).trim() } });
export async function resetPassword(token, password) { await api('/auth/password/reset', { method: 'POST', body: { token, password } }); }
export async function updatePhone(phone) { await api('/me', { method: 'PATCH', body: { phone: phone || null } }); }
export async function changePassword(currentPassword, newPassword) {
  try { await api('/me/password', { method: 'POST', body: { current: currentPassword, next: newPassword } }); } catch (error) {
    throw Object.assign(error, { message: error.fields?.current ?? error.fields?.next ?? error.message });
  }
}
export async function getSession() { const { user } = await api('/me'); remember(user); return { user }; }

// Мэдэгдэл: хэрэглэгч + идэвхтэй дүрээр.
const changed = () => dispatchEvent(new CustomEvent('notifications-changed'));
export async function markNotificationsRead() { await api('/notifications/read', { method: 'POST' }); changed(); }
export async function markNotificationRead(id) { await api(`/notifications/${id}/read`, { method: 'POST' }); changed(); }
/** Шинэ нь эхэнд. total — шүүлтүүрт таарсан нийт тоо, unread/all — шүүлтүүрээс үл хамаарсан нийт тоо. */
export const listNotifications = ({ unreadOnly = false, limit = 20, offset = 0 } = {}) => api('/notifications', { query: { unread: unreadOnly ? '1' : '', limit, offset } });
