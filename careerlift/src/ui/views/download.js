import { h, button, nid, toast } from '../dom.js';
import { state, setState, exportProject } from '../store.js';
import { t } from '../../i18n/strings.js';
import { getTemplate, PAGE_SIZES } from '../../layout/templates.js';
import { prepareFonts, layoutResume } from '../../layout/engine.js';
import { renderPdf } from '../../export/pdf.js';
import { resumeToText } from '../../export/txt.js';
import { toFile, saveFile, shareFile, openFile, canShareFile, platform } from '../../export/download.js';
import { slugify } from '../../core/util.js';

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain;charset=utf-8',
  json: 'application/json',
};

export function baseName(r) {
  const n = slugify(r.contact.fullName || 'resume');
  return r.meta.language.startsWith('es') ? `${n}-${r.meta.language === 'es-PR' ? 'Resume' : 'Curriculum'}` : `${n}-Resume`;
}

export async function buildFile(kind, r, prefs = {}) {
  const name = baseName(r);
  if (kind === 'pdf') {
    await prepareFonts(r);
    const bytes = await renderPdf(layoutResume(r), {
      title: `${r.contact.fullName || 'Resume'}`,
      author: r.contact.fullName,
      subject: r.contact.headline,
      keywords: r.skills.slice(0, 15),
      language: r.meta.language,
      embed: prefs.embedData ? r : null,
    });
    return toFile(bytes, `${name}.pdf`, MIME.pdf);
  }
  if (kind === 'docx') return toFile(await (await import('../../export/docx.js')).renderDocx(r, { embedFonts: prefs.embedFonts !== false }), `${name}.docx`, MIME.docx);
  if (kind === 'txt') return toFile(resumeToText(r), `${name}.txt`, MIME.txt);
  if (kind === 'json') return toFile(exportProject(), `${name}-CareerLift-backup.json`, MIME.json);
  throw new Error(`unknown kind ${kind}`);
}

export function renderDownload(root) {
  const r = state.resume;
  const tpl = getTemplate(r.design.templateId);
  const plat = platform();

  const checks = [];
  if (!r.contact.fullName.trim()) checks.push(t('download.missingName'));
  if (!r.contact.email.trim()) checks.push(t('download.missingEmail'));

  const opt = (key, label, hint) => {
    const id = nid();
    return h('div', { class: 'check-block' },
      h('label', { for: id, class: 'check' }, h('input', { type: 'checkbox', id, checked: !!state.prefs[key], 'data-testid': `pref-${key}`,
        onchange: (e) => setState({ prefs: { ...state.prefs, [key]: e.target.checked } }, 'prefs') }), label),
      h('small', { class: 'hint' }, hint));
  };

  root.append(
    h('header', { class: 'view-head' }, h('h1', {}, t('download.title')), h('p', { class: 'lead' }, t('download.subtitle')),
      h('p', { class: 'muted' }, t('download.template', { name: tpl.name, size: PAGE_SIZES[r.design.pageSize].label }))),
    h('section', { class: `card ${checks.length ? 'alert-warn' : ''}`, 'data-testid': 'download-checks' }, h('h2', {}, t('download.check')),
      checks.length ? h('ul', {}, checks.map((c) => h('li', {}, c))) : h('p', {}, `✓ ${t('download.allGood')}`)),
    plat.iOS ? h('p', { class: 'alert alert-info' }, '📱 ', t('download.iosHint')) : null,
    h('div', { class: 'download-grid' },
      downloadCard('pdf', t('download.pdf'), t('download.pdfDesc'), opt('embedData', t('download.embedData'), t('download.embedDataHint'))),
      downloadCard('docx', t('download.docx'), t('download.docxDesc'), opt('embedFonts', t('download.embedFonts'), t('download.embedFontsHint'))),
      downloadCard('txt', t('download.txt'), t('download.txtDesc')),
      downloadCard('json', t('download.backup'), t('download.backupDesc'))),
  );
}

/**
 * Two-step flow: "Create file" (async) -> then Download / Share buttons that
 * act synchronously on the ready file. This keeps iOS share/download inside a
 * genuine user tap.
 */
export function downloadCard(kind, title, desc, extra, builder) {
  const actions = h('div', { class: 'dl-actions' });
  const status = h('p', { class: 'dl-status', 'aria-live': 'polite' });
  let file = null;
  const make = async () => {
    status.textContent = t('download.preparing');
    createBtn.disabled = true;
    try {
      file = builder ? await builder() : await buildFile(kind, state.resume, state.prefs);
      status.textContent = `✓ ${t('download.ready')} — ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
      showActions();
    } catch (e) {
      console.error(e);
      status.textContent = t('download.failed');
      toast(t('download.failed'), 'error');
    } finally {
      createBtn.disabled = false;
    }
  };
  const showActions = () => {
    actions.innerHTML = '';
    const plat = platform();
    actions.append(button(t('download.save'), () => saveFile(file), { kind: 'primary', icon: '⬇', testid: `save-${kind}` }));
    if (canShareFile(file) && (plat.mobile || plat.iPadOS)) {
      actions.append(button(t('download.share'), () => { shareFile(file).catch((e) => { if (e?.name !== 'AbortError') toast(e.message || 'Share failed', 'error'); }); }, { icon: '⇪', testid: `share-${kind}` }));
    }
    if (plat.iOS && (kind === 'pdf' || kind === 'txt')) actions.append(button(t('download.open'), () => openFile(file), { icon: '↗', small: true }));
  };
  const createBtn = button(t('download.prepare'), make, { kind: 'primary', testid: `create-${kind}` });
  // Any change to the resume makes a prepared file stale.
  return h('section', { class: 'card dl-card', 'data-kind': kind },
    h('h2', {}, title), h('p', {}, desc), extra || null,
    h('div', { class: 'dl-row' }, createBtn, actions), status);
}
