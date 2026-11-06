// Нийтлэг нэр томьёо, шошго: улирал, дадлага, тайлан, ажлын төлөвлөгөөний төлөв. Админ, эрхлэгч, удирдагч багш, дадлага удирдагчийн хуудсууд хуваалцана.

export const SEASONS = { summer: 'Зуны', winter: 'Өвлийн' };
export const semesterName = (s) => `${s.academic_year} оны ${SEASONS[s.season].toLowerCase()} улирал`;
/** Улирлын загвар файлын төрөл. */
export const TEMPLATE_LABELS = { guide: 'Дадлагын удирдамж', plan: 'Ажлын төлөвлөгөөний загвар', report: 'Тайлангийн загвар', form: 'Маягт' };
export const SEMESTER_LABELS = { draft: 'Тохируулж буй', active: 'Идэвхтэй', archived: 'Архивласан' };
export const SEMESTER_TONES = { draft: 'pending', active: 'done', archived: 'none' };
/** Идэвхгүй (ноорог) улирлыг орхиж, өгсөн дугаарыг, үгүй бол идэвхтэйг, үгүй бол эхнийг сонгоно. */
export const pickSemester = (semesters, id) => {
  const list = semesters.filter((s) => s.status !== 'draft');
  return list.find((s) => s.id === Number(id)) ?? list.find((s) => s.status === 'active') ?? list[0] ?? null;
};

export const INTERNSHIP_LABELS = {
  searching: 'Газар хайж буй', applied: 'Хүсэлт хүлээгдэж буй', contracting: 'Гэрээ байгуулж буй', planning: 'Төлөвлөгөө батлуулж буй',
  in_progress: 'Дадлага хийж буй', reporting: 'Тайлан өгөх шатанд', ready: 'Хамгаалалтад бэлэн', evaluating: 'Үнэлгээ хийгдэж буй',
  deferred: 'Хойшлогдсон (W)', failed: 'Хангалтгүй (0)', stopped: 'Зогсоосон', completed: 'Дүн СИСИ-д орсон',
};
export const REPORT_LABELS = { not_submitted: 'Илгээгдээгүй', submitted: 'Илгээсэн', revision: 'Засвар шаардсан', accepted: 'Хүлээн авсан', overdue: 'Хугацаа хэтэрсэн' };

export const studentLine = (s) => [s?.student_code, s?.program].filter(Boolean).join(' · ');

export const nameOf = (p) => `${p.last_name} ${p.first_name}`;
export const PLAN_LABELS = { submitted: 'Илгээсэн', approved: 'Батлагдсан', returned: 'Буцаасан' };
export const PLAN_TONES = { submitted: 'pending', approved: 'done', returned: 'attention' };

/** Дадлагын баримтын төлөв (дадлагын мөрөнд бичигдсэн текст) → шошгоны өнгө. */
export const DOC_TONES = {
  'Баталгаажсан': 'done', 'Батлагдсан': 'done', 'Хүлээн авсан': 'done', 'Илгээсэн': 'pending',
  'Буцаасан': 'attention', 'Засвар шаардсан': 'attention', 'Хугацаа хэтэрсэн': 'attention', 'Илгээгдээгүй': 'none',
};
/** Гуравласан гэрээний төлөв (тэнхмийн эрхлэгч, дадлага удирдагч харна). */
export const CONTRACT_LABELS = { signing: 'Гарын үсэг цуглуулж буй', filled: 'Скан хүлээж буй', scanned: 'Скан ирсэн', approved: 'Баталгаажсан', returned: 'Буцаасан' };
export const CONTRACT_TONES = { signing: 'pending', filled: 'none', scanned: 'pending', approved: 'done', returned: 'attention' };
/** Оюутны газрын хүсэлтийн төрөл: тэнхмийн эрхлэгч шийднэ. */
export const REQUEST_KINDS = { own: 'Санал болгосон газар', abroad: 'Гадаадад хийх дадлага' };
