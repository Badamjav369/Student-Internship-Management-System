// Байгууллагын төлөөлөгчийн бүх маршрут (зөвхөн «org_rep» дүрээр). Зөвхөн өөрийн байгууллагын зар, хүсэлт, дадлагажигч (orgOf).
import { routes as postings } from './postings.js';
import { routes as applications } from './applications.js';
import { routes as interns } from './interns.js';
import { routes as organization } from './organization.js';

export const routes = [...postings, ...applications, ...interns, ...organization];
