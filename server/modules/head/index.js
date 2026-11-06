// Тэнхмийн эрхлэгчийн маршрут (зөвхөн «head» дүрээр): гуравласан гэрээ, газрын хүсэлт. Нэгтгэл, статистикийг админы /api/admin/semesters/:id/summary|stats-аас уншина.
import { routes as contracts } from './contracts.js';
import { routes as requests } from './requests.js';

export const routes = [...contracts, ...requests];
