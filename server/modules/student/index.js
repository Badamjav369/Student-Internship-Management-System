// Оюутны бүх маршрут (зөвхөн «student» дүрээр). Оюутан зөвхөн өөрийн дадлагыг хардаг (context.js → mine).
import { routes as home } from './home.js';
import { routes as placement } from './placement.js';
import { routes as contract } from './contract.js';
import { routes as plan } from './plan.js';
import { routes as logbook } from './logbook.js';
import { routes as report } from './report.js';
import { routes as results } from './results.js';

export const routes = [...home, ...placement, ...contract, ...plan, ...logbook, ...report, ...results];
