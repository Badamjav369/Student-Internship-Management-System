// Байгууллагын төлөөлөгч өөрийн байгууллагын мэдээлэл (нэр, регистр орно), логог засна. Дүрэм нь админтай нэг (lib/organization.js).
import { json, body } from '../../lib/http.js';
import { removeLogo, saveOrganization, setLogo } from '../../lib/organization.js';
import { orgOf } from './postings.js';

const update = async ({ db, user, request }) => json(await saveOrganization(db, orgOf(user), await body(request)));
const upload = async ({ db, env, user, request }) => json(await setLogo(env, db, orgOf(user), user.id, await body(request)));
const remove = async ({ db, env, user }) => { await removeLogo(env, db, orgOf(user)); return json(null); };

export const routes = [
  ['PUT', '/api/org/organization', update],
  ['POST', '/api/org/organization/logo', upload],
  ['DELETE', '/api/org/organization/logo', remove],
];
