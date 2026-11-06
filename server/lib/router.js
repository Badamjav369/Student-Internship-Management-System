// Жижиг router: route('GET', '/api/semesters/:id', handler, { roles }) — handler(ctx) нь { request, env, url, params, user, db } авна.
export function createRouter() {
  const routes = [];
  const compile = (path) => new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`);
  return {
    add(method, path, handler, options = {}) { routes.push({ method, re: compile(path), handler, ...options }); },
    /** Модуль бүр өөрийн маршрутыг бүртгэнэ: mount(module.routes, { roles }) */
    mount(list, options = {}) { for (const [method, path, handler, extra = {}] of list) this.add(method, path, handler, { ...options, ...extra }); },
    match(method, pathname) {
      let allowed = false;
      for (const r of routes) {
        const m = r.re.exec(pathname);
        if (!m) continue;
        if (r.method !== method) { allowed = true; continue; }
        return { route: r, params: m.groups ?? {} };
      }
      return allowed ? 'METHOD' : null;
    },
  };
}
