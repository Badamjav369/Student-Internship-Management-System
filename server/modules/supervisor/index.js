// Удирдагч багшийн бүх маршрут (зөвхөн «supervisor» дүрээр). Зөвхөн өөрт оноогдсон оюутнууд (students.js → own).
import { routes as students } from './students.js';
import { routes as plans } from './plans.js';
import { routes as reports } from './reports.js';
import { routes as scores } from './scores.js';
import { routes as gradeSheets } from './grade-sheets.js';
import { routes as announcements } from './announcements.js';

export const routes = [...students, ...plans, ...reports, ...scores, ...gradeSheets, ...announcements];
