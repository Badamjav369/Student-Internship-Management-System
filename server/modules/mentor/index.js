// Дадлага удирдагчийн бүх маршрут (зөвхөн «mentor» дүрээр). Зөвхөн өөрт томилогдсон дадлагажигчид (interns.js → own).
import { routes as interns } from './interns.js';
import { routes as plans } from './plans.js';
import { routes as logbook } from './logbook.js';
import { routes as scores } from './scores.js';
import { routes as contracts } from './contracts.js';

export const routes = [...interns, ...plans, ...logbook, ...scores, ...contracts];
