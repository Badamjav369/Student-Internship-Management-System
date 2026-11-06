// Админы бүх маршрут (зөвхөн «admin» дүрээр).
import { routes as semesters } from './semesters.js';
import { routes as users } from './users.js';
import { routes as organizations } from './organizations.js';
import { routes as internships } from './internships.js';
import { routes as committees } from './committees.js';
import { routes as reports } from './reports.js';
import { routes as summary } from './summary.js';

export const routes = [...semesters, ...users, ...organizations, ...internships, ...committees, ...reports, ...summary];
