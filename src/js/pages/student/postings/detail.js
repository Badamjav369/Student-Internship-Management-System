// Зарын дэлгэрэнгүй, хүсэлт илгээх: шаардлага, байгууллагын танилцуулга; CV (PDF) болон товч танилцуулгатай хүсэлт.
import { h, pageHead } from '../../../core/dom.js';
import { formatDate, formatRange } from '../../../core/format.js';
import { busy, checkFile, clearErrors, field, showErrors } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { getSession } from '../../../data/session-api.js';
import { createApplication, getDashboard, getPosting, listApplications } from '../../../data/student-api.js';
import { toast } from '../../../components/toast-region.js';
import { applicationBadge, sentApplications } from '../shared.js';

const MAX_LETTER = 5000;

function applyForm(posting, maxMb, navigate) {
  const submit = h('button', { class: 'button block', type: 'submit' }, 'Хүсэлт илгээх');
  const form = h('form', { class: 'form', novalidate: true },
    field({ label: 'CV', name: 'cv', type: 'file', required: true, accept: 'application/pdf,.pdf', hint: `PDF файл, ${maxMb} МБ хүртэл. Зөвхөн энэ хүсэлтийг хүлээн авсан байгууллага харна.` }),
    field({ label: 'Товч танилцуулга (заавал биш)', name: 'cover_letter', type: 'textarea', rows: 6, maxlength: MAX_LETTER, hint: 'Яагаад энэ байгууллагад дадлага хийх хүсэлтэй, ямар чадвартай гэдгээ бичнэ үү.' }),
    submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const cv = form.elements.cv.files[0];
    const letter = form.elements.cover_letter.value.trim();
    const errors = {};
    const cvError = cv ? checkFile(cv, { test: /\.pdf$/i, typeText: 'PDF', maxMb }) : 'CV-ээ PDF файлаар хавсаргана уу.';
    if (cvError) errors.cv = cvError;
    if (letter.length > MAX_LETTER) errors.cover_letter = `${MAX_LETTER} тэмдэгтээс ихгүй бичнэ үү.`;
    if (Object.keys(errors).length) return showErrors(form, errors);
    await busy(submit, async () => {
      try {
        await createApplication(posting.id, { cv, cvName: cv.name, letter });
        toast('Хүсэлт илгээгдлээ. Байгууллагын хариуг мэдэгдлээр авна.');
        navigate('/student/postings?tab=mine');
      } catch (error) { showErrors(form, { cv: error.message }); }
    });
  });
  return form;
}

function applyPanel(posting, application, i, user, navigate) {
  const panel = (...content) => h('aside', { class: 'panel apply', 'aria-labelledby': 'h-apply' }, h('h2', { id: 'h-apply' }, 'Хүсэлт'), ...content);
  if (application) {
    return panel(h('p', {}, applicationBadge(application.status)),
      h('p', { class: 'muted', style: { margin: '0.5rem 0 1rem' } }, `Илгээсэн: ${formatDate(application.submitted_at.slice(0, 10))}`),
      h('a', { class: 'button secondary block', href: '#/student/postings?tab=mine' }, 'Миний хүсэлт'));
  }
  if (!i || !['searching', 'applied'].includes(i.status)) {
    return panel(h('p', { class: 'muted' }, i ? `Таны дадлагын газар тогтсон (${i.status_label}) тул шинэ хүсэлт илгээх боломжгүй.` : 'Танд энэ улиралд бүртгэлтэй дадлага алга.'));
  }
  if (posting.programs.length && !posting.programs.includes(user.program)) {
    return panel(h('p', { class: 'muted' }, `Энэ зар «${posting.programs.join('», «')}» хөтөлбөрийн оюутанд зориулагдсан.`));
  }
  if (posting.positions - posting.accepted_count <= 0) return panel(h('p', { class: 'muted' }, 'Энэ зарын орон тоо дүүрсэн байна.'));
  return panel(applyForm(posting, i.info.max_file_mb, navigate));
}

export async function render({ params, navigate }) {
  const [posting, apps, dash, { user }] = await Promise.all([getPosting(params.id), listApplications(), getDashboard(), getSession()]);
  const application = sentApplications(apps).find((a) => a.posting_id === posting.id) ?? null;
  const left = Math.max(0, posting.positions - posting.accepted_count);
  return h('section', {},
    h('a', { class: 'back-link', href: '#/student/postings' }, icon('back', 18), 'Дадлагын байгууллага'),
    pageHead(posting.title, h('span', {}, posting.organization_name)),
    h('div', { class: 'split' },
      h('div', { class: 'stack' },
        h('section', { class: 'panel', 'aria-labelledby': 'h-about' }, h('h2', { id: 'h-about' }, 'Зарын мэдээлэл'),
          h('dl', { class: 'facts' },
            h('dt', {}, 'Чиглэл'), h('dd', {}, posting.field ?? '—'),
            h('dt', {}, 'Хөтөлбөр'), h('dd', {}, posting.programs.length ? posting.programs.join(', ') : 'Бүх хөтөлбөр'),
            h('dt', {}, 'Сул орон тоо'), h('dd', {}, `${left} / ${posting.positions}`),
            h('dt', {}, 'Дадлагын хугацаа'), h('dd', {}, formatRange(posting.start_date, posting.end_date)),
            h('dt', {}, 'Хүсэлт авах'), h('dd', {}, `${formatDate(posting.apply_deadline)} хүртэл`)),
          posting.requirements ? [h('h3', { class: 'sub' }, 'Шаардлага, хийх ажил'), h('p', { class: 'prose' }, posting.requirements)] : null),
        h('section', { class: 'panel', 'aria-labelledby': 'h-org' }, h('h2', { id: 'h-org' }, posting.organization_name),
          h('dl', { class: 'facts' }, h('dt', {}, 'Үйл ажиллагааны чиглэл'), h('dd', {}, posting.organization_field ?? '—'), h('dt', {}, 'Хаяг'), h('dd', {}, posting.organization_address ?? '—')),
          posting.organization_description ? h('p', { class: 'prose', style: { marginTop: '1rem' } }, posting.organization_description) : null)),
      applyPanel(posting, application, dash.internship, user, navigate)));
}
