// Гэрэл/харанхуй горим: <html data-theme> + localStorage. Эхний ачааллыг index.html дахь жижиг скрипт эхлүүлнэ.
import { safeStorage } from './store.js';

const KEY = 'pm2.theme';

export const getTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F1015' : '#F5F5FA');
  safeStorage.set(KEY, theme);
  dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
}

export const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');
