import { h, button, toast } from '../dom.js';
import { state, setResume, setState, importProject } from '../store.js';
import { t, getLang } from '../../i18n/strings.js';
import { createEmptyResume } from '../../model/schema.js';
import { importResumeFile } from '../../import/index.js';
import { applyTemplate } from '../../design/apply.js';

export function renderStart(root, go) {
  const hasSaved = state.started && (state.resume.contact.fullName || state.resume.experience.length);
  const fileInput = h('input', { type: 'file', accept: '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain', class: 'visually-hidden', id: 'resume-file', 'data-testid': 'resume-file' });
  const backupInput = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', id: 'backup-file', 'data-testid': 'backup-file' });
  const busy = h('div', { class: 'busy', hidden: true, role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), t('start.reading'));
  const reviewHost = h('div', { 'data-testid': 'review' });

  const confirmReplace = () => !hasSaved || window.confirm(t('start.replaceConfirm'));

  async function handleFile(file) {
    if (!file) return;
    if (!confirmReplace()) return;
    busy.hidden = false;
    reviewHost.innerHTML = '';
    try {
      const { resume, report } = await importResumeFile(file, { language: undefined });
      // Keep the interface language as the default resume language when unclear.
      if (!report.restored && report.detectedLanguage === 'es' && getLang().startsWith('es')) resume.meta.language = getLang();
      const withDesign = report.restored ? resume : applyTemplate(resume, state.resume.design.templateId || 'classic');
      setResume(withDesign);
      setState({ importReport: report });
      renderReview(reviewHost, report, go);
    } catch (e) {
      console.error(e);
      const msg = e?.code ? t(`err.${e.code}`) : t('err.generic');
      reviewHost.appendChild(h('div', { class: 'alert alert-error', role: 'alert', 'data-testid': 'upload-error' }, msg));
    } finally {
      busy.hidden = true;
      fileInput.value = '';
    }
  }
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  backupInput.addEventListener('change', async () => {
    const f = backupInput.files[0];
    if (!f) return;
    try {
      importProject(await f.text());
      toast('✓');
      go('edit');
    } catch {
      toast(t('err.backup'), 'error');
    }
    backupInput.value = '';
  });

  const drop = h('label', { class: 'dropzone', for: 'resume-file', tabindex: '0', 'data-testid': 'dropzone',
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } },
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); },
    ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); handleFile(e.dataTransfer.files[0]); },
  },
  h('span', { class: 'dz-icon', 'aria-hidden': 'true' }, '⬆'),
  h('strong', {}, t('start.upload.button')),
  h('span', { class: 'muted' }, t('start.upload.drop')),
  h('span', { class: 'muted small' }, 'PDF · DOCX · TXT'));

  root.append(
    h('header', { class: 'view-head' }, h('h1', {}, t('start.title')), h('p', { class: 'lead' }, t('start.subtitle'))),
    h('div', { class: 'start-grid' },
      h('section', { class: 'card card-feature' }, h('h2', {}, t('start.upload.title')), h('p', {}, t('start.upload.desc')), drop, fileInput, busy),
      h('section', { class: 'card' }, h('h2', {}, t('start.scratch.title')), h('p', {}, t('start.scratch.desc')),
        button(t('start.scratch.button'), () => {
          if (!confirmReplace()) return;
          const r = createEmptyResume(getLang());
          setResume(applyTemplate(r, 'classic'));
          setState({ importReport: null });
          go('edit');
        }, { kind: 'primary', testid: 'start-scratch' })),
      hasSaved ? h('section', { class: 'card' }, h('h2', {}, t('start.continue.title')), h('p', {}, t('start.continue.desc', { date: new Date(state.resume.meta.updatedAt).toLocaleString() })),
        button(t('start.continue.button'), () => go('edit'), { kind: 'primary', testid: 'start-continue' })) : null,
      h('section', { class: 'card' }, h('h2', {}, t('start.restore.title')), h('p', {}, t('start.restore.desc')),
        h('label', { class: 'btn btn-secondary', for: 'backup-file', tabindex: '0' }, t('start.restore.button')), backupInput),
    ),
    reviewHost,
    h('p', { class: 'privacy' }, '🔒 ', t('start.privacy')),
  );
  if (state.importReport && state.step === 'start') renderReview(reviewHost, state.importReport, go);
}

function renderReview(host, report, go) {
  const r = state.resume;
  host.innerHTML = '';
  const items = [];
  if (report.restored) items.push(h('li', { class: 'ok' }, t('review.restored')));
  items.push(h('li', {}, t('review.stats', { jobs: r.experience.length, bullets: r.experience.reduce((a, e) => a + e.bullets.length, 0), skills: r.skills.length })));
  for (const w of report.warnings || []) items.push(h('li', { class: 'warn' }, t(`review.warn.${w.code}`, { count: w.count })));
  if (Object.keys(report.flags || {}).length) items.push(h('li', { class: 'warn' }, t('review.flags')));
  host.appendChild(h('section', { class: 'card review', 'aria-labelledby': 'review-h' },
    h('h2', { id: 'review-h' }, t('review.title')),
    h('div', { class: 'review-summary' },
      h('p', { class: 'review-name' }, r.contact.fullName || '—'),
      h('p', { class: 'muted' }, [r.contact.email, r.contact.phone, r.contact.location].filter(Boolean).join(' · '))),
    h('ul', { class: 'review-list' }, items),
    report.rawText ? h('details', {}, h('summary', {}, t('review.original')), h('pre', { class: 'raw' }, report.rawText)) : null,
    button(t('review.continue'), () => go('edit'), { kind: 'primary', testid: 'review-continue' })));
}
