// Байгууллага: жагсаалт, мэдээлэл засах, устгах (дуусаагүй дадлагагүй бол).
import { json, body } from '../../lib/http.js';
import { deletableOrganization, getOrganization, removeLogo, saveOrganization, setLogo } from '../../lib/organization.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

async function list({ db, url }) {
  const q = norm(url.searchParams.get('q'));
  let rows = await db.all('SELECT * FROM organizations ORDER BY name');
  if (q) rows = rows.filter((o) => norm(`${o.name} ${o.register_no} ${o.field ?? ''}`).includes(q));
  return json({ items: rows, total: rows.length });
}
const get = async ({ db, params }) => json(await getOrganization(db, params.id));
const update = async ({ db, request, params }) => json(await saveOrganization(db, params.id, await body(request)));
const upload = async ({ db, env, request, params, user }) => json(await setLogo(env, db, params.id, user.id, await body(request)));
const dropLogo = async ({ db, env, params }) => { await removeLogo(env, db, params.id); return json(null); };

async function remove({ db, env, params }) {
  const o = await deletableOrganization(db, params.id);
  await removeLogo(env, db, o.id);
  await db.batch([db.stmt('UPDATE users SET organization_id = NULL WHERE organization_id = ?', o.id), db.stmt('DELETE FROM organizations WHERE id = ?', o.id)]);
  return json(null);
}

export const routes = [
  ['GET', '/api/admin/organizations', list],
  ['GET', '/api/admin/organizations/:id', get],
  ['PATCH', '/api/admin/organizations/:id', update],
  ['POST', '/api/admin/organizations/:id/logo', upload],
  ['DELETE', '/api/admin/organizations/:id/logo', dropLogo],
  ['DELETE', '/api/admin/organizations/:id', remove],
];
