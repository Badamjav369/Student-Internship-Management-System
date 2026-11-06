// localStorage унасан (private mode, хориглосон) үед ч ажиллана.
export const safeStorage = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* хадгалах боломжгүй — үл тоомсорлоно */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* үл тоомсорлоно */ }
  },
};
