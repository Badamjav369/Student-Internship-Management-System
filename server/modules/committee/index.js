// Комиссын гишүүний маршрут (зөвхөн «committee» дүрээр): оюутны материал унших, оноо оруулах, хуваарь.
import { routes as students } from './students.js';
import { routes as scores } from './scores.js';

export const routes = [...students, ...scores];
