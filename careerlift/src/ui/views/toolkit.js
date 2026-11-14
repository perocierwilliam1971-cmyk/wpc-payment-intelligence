import { h, clear, button, nid, toast, field } from '../dom.js';
import { state, updateToolkit } from '../store.js';
import { t, pick, getLang } from '../../i18n/strings.js';
import {
  coverLetter, MESSAGES, FOLLOWUPS, fillMessage, atsChecks, ATS_MANUAL, keywordMatch, INTERVIEW_QUESTIONS, QUESTIONS_TO_ASK,
  INTERVIEW_TIPS, CHANGE_STEPS, RETURNING_TIPS, TRANSFERABLE, linkedinHeadline, linkedinAbout, LINKEDIN_CHECKLIST, starToText, starToBullet,
} from '../../toolkit/content.js';
import { questionsFor } from '../../achievement/questions.js';
import { prepareFonts, layoutLetter, layoutResume } from '../../layout/engine.js';
import { renderPdf } from '../../export/pdf.js';
import { toFile } from '../../export/download.js';
import { downloadCard, baseName } from './download.js';
import { emptyBullet } from '../../model/schema.js';
import { updateResume } from '../store.js';

const TABS = ['cover', 'messages', 'followup', 'ats', 'interview', 'star', 'change', 'linkedin'];

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('toolkit.copied'), 'ok');
  } catch {
    toast(t('toolkit.copyFail'), 'error');
  }
}

function outputBox(text, onEdit, testid) {
  const ta = h('textarea', { class: 'output', rows: Math.min(22, Math.max(6, text.split('\n').length + 2)), 'data-testid': testid, oninput: (e) => onEdit?.(e.target.value) });
  ta.value = text;
  return h('div', { class: 'output-wrap' }, ta, h('div', { class: 'row-actions' }, button(t('toolkit.copy'), () => copy(ta.value), { small: true, icon: '⧉' })));
}

export function renderToolkit(root) {
  const tk = state.toolkit;
  let tab = tk.tab || 'cover';
  const nav = h('nav', { class: 'toolkit-nav', 'aria-label': t('toolkit.title') });
  const panel = h('div', { class: 'toolkit-panel' });
  const draw = () => {
    clear(nav);
    for (const id of TABS) nav.appendChild(h('button', { type: 'button', class: 'tk-tab', 'aria-current': tab === id ? 'page' : undefined, 'data-testid': `tk-${id}`, onclick: () => { tab = id; updateToolkit((x) => { x.tab = id; }); draw(); } }, t(`toolkit.${id}`)));
    clear(panel);
    ({ cover, messages: msgs, followup, ats, interview, star, change, linkedin })[tab](panel);
  };
  root.append(h('header', { class: 'view-head' }, h('h1', {}, t('toolkit.title')), h('p', { class: 'lead' }, t('toolkit.subtitle'))), h('div', { class: 'toolkit-layout' }, nav, panel));
  draw();
}

// --- Cover letter -----------------------------------------------------------
function cover(panel) {
  const r = state.resume;
  const lang = r.meta.language;
  const es = lang.startsWith('es');
  const c = state.toolkit.cover;
  const save = (k, v) => updateToolkit((x) => { x.cover[k] = v; });
  const bullets = r.experience.flatMap((e) => e.bullets.map((b) => b.text.trim())).filter(Boolean);
  const chosen = new Set(c.highlights || bullets.filter((b) => /\d/.test(b)).slice(0, 3));
  const out = h('div', { 'data-testid': 'cover-output' });
  const highlightList = h('div', { class: 'check-list' }, bullets.slice(0, 15).map((b) => {
    const id = nid();
    return h('label', { for: id, class: 'check' }, h('input', { type: 'checkbox', id, checked: chosen.has(b), onchange: (e) => { if (e.target.checked) chosen.add(b); else chosen.delete(b); save('highlights', [...chosen]); } }), b);
  }));
  const generate = () => {
    const text = coverLetter(r, { ...c, highlights: [...chosen] }, lang);
    save('text', text);
    drawOut(text);
  };
  const drawOut = (text) => {
    clear(out).append(
      h('p', { class: 'muted small' }, t('toolkit.edited')),
      outputBox(text, (v) => save('text', v), 'cover-text'),
      h('div', { class: 'download-grid compact' },
        downloadCard('cover-pdf', t('toolkit.downloadPdf'), '', null, async () => {
          await prepareFonts(r);
          const bytes = await renderPdf(layoutLetter(r, state.toolkit.cover.text || text), { title: `${r.contact.fullName} — Cover Letter`, author: r.contact.fullName, language: lang });
          return toFile(bytes, `${baseName(r)}-Cover-Letter.pdf`, 'application/pdf');
        }),
        downloadCard('cover-docx', t('toolkit.downloadDocx'), '', null, async () => toFile(await (await import('../../export/docx.js')).renderLetterDocx(r, state.toolkit.cover.text || text), `${baseName(r)}-Cover-Letter.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
        downloadCard('cover-txt', t('toolkit.downloadTxt'), '', null, async () => toFile(state.toolkit.cover.text || text, `${baseName(r)}-Cover-Letter.txt`, 'text/plain;charset=utf-8'))));
  };
  panel.append(h('section', { class: 'card' },
    h('h2', {}, t('toolkit.cover')),
    h('div', { class: 'grid-2' },
      field({ label: es ? 'Empresa' : 'Company', value: c.company, onInput: (v) => save('company', v), testid: 'cover-company' }),
      field({ label: es ? 'Puesto' : 'Position', value: c.role, onInput: (v) => save('role', v), testid: 'cover-role' }),
      field({ label: es ? 'Nombre de la persona (opcional)' : 'Hiring manager name (optional)', value: c.manager, onInput: (v) => save('manager', v) }),
      field({ label: es ? 'Dónde viste el anuncio (opcional)' : 'Where you found it (optional)', value: c.source, onInput: (v) => save('source', v) })),
    field({ label: es ? '¿Por qué te interesa esta empresa? (tus palabras)' : 'Why this company? (your words)', value: c.why, multiline: true, rows: 2, onInput: (v) => save('why', v) }),
    h('h3', {}, es ? 'Logros a destacar (máx. 3)' : 'Results to highlight (max 3)'),
    bullets.length ? highlightList : h('p', { class: 'muted' }, t('improve.noBullets')),
    button(t('toolkit.generate'), generate, { kind: 'primary', testid: 'cover-generate' })), out);
  if (c.text) drawOut(c.text);
}

// --- Messages & follow-ups ---------------------------------------------------
function messageTool(panel, list, title, storeKey) {
  const r = state.resume;
  const lang = r.meta.language;
  const es = lang.startsWith('es');
  const v = state.toolkit.messages;
  const save = (k, val) => updateToolkit((x) => { x.messages[k] = val; });
  const vals = () => ({ person: v.person, company: v.company, role: v.role, date: v.date, headline: r.contact.headline ? r.contact.headline.split('|')[0].trim() : '', name: r.contact.fullName });
  const host = h('div');
  const drawAll = () => {
    clear(host);
    for (const m of list) {
      const text = fillMessage(pick(m.body), vals(), lang);
      host.appendChild(h('section', { class: 'card' }, h('h3', {}, pick(m.title)),
        m.limit ? h('p', { class: text.length > m.limit ? 'alert alert-warn' : 'muted small' }, `${text.length}/${m.limit}`) : null,
        outputBox(text, null, `${storeKey}-${m.id}`)));
    }
  };
  panel.append(h('section', { class: 'card' }, h('h2', {}, title),
    h('div', { class: 'grid-2' },
      field({ label: es ? 'Nombre de la persona' : 'Their name', value: v.person, onInput: (x) => { save('person', x); drawAll(); } }),
      field({ label: es ? 'Empresa' : 'Company', value: v.company, onInput: (x) => { save('company', x); drawAll(); } }),
      field({ label: es ? 'Puesto' : 'Position', value: v.role, onInput: (x) => { save('role', x); drawAll(); } }),
      storeKey === 'followup' ? field({ label: es ? 'Fecha en que solicitaste' : 'Date you applied', value: v.date, onInput: (x) => { save('date', x); drawAll(); } }) : null)), host);
  drawAll();
}
const msgs = (p) => messageTool(p, MESSAGES, t('toolkit.messages'), 'msg');
const followup = (p) => messageTool(p, FOLLOWUPS, t('toolkit.followup'), 'followup');

// --- ATS ------------------------------------------------------------------------
function ats(panel) {
  const r = state.resume;
  let pages = 1;
  try { pages = layoutResume(r).pages.length; } catch { /* fonts may not be loaded yet */ }
  const checks = atsChecks(r, pages);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const es = getLang().startsWith('es');
  const jd = h('textarea', { rows: 6, placeholder: es ? 'Pega aquí el anuncio de empleo…' : 'Paste the job posting here…', 'data-testid': 'jd-input' });
  jd.value = state.toolkit.jd || '';
  const res = h('div', { 'data-testid': 'kw-result' });
  const analyze = () => {
    updateToolkit((x) => { x.jd = jd.value; });
    const m = keywordMatch(jd.value, state.resume);
    clear(res).append(
      h('p', {}, h('strong', {}, `${m.pct}%`), es ? ' de las palabras clave principales aparecen en tu resumé.' : ' of the main keywords appear in your resume.'),
      h('div', { class: 'kw' }, m.found.map((w) => h('span', { class: 'chip ok' }, `✓ ${w}`)), m.missing.map((w) => h('span', { class: 'chip miss' }, w))),
      h('p', { class: 'muted small' }, es ? 'Añade solo las palabras que describan destrezas o experiencia que realmente tienes.' : 'Only add missing words that describe skills or experience you genuinely have.'));
  };
  panel.append(
    h('section', { class: 'card' }, h('h2', {}, t('toolkit.ats'), ' ', h('span', { class: 'score' }, `${score}%`)),
      h('ul', { class: 'checklist', 'data-testid': 'ats-checks' }, checks.map((c) => h('li', { class: c.ok ? 'ok' : 'todo' }, c.ok ? '✓ ' : '○ ', pick(c.label), c.detail ? h('small', { class: 'muted' }, ` (${c.detail})`) : null))),
      h('h3', {}, es ? 'También revisa' : 'Also check'),
      h('ul', { class: 'checklist' }, ATS_MANUAL.map((m) => h('li', {}, '○ ', pick(m))))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Comparador de palabras clave' : 'Keyword matcher'), jd, button(es ? 'Comparar' : 'Compare', analyze, { kind: 'primary', testid: 'kw-analyze' }), res));
  if (jd.value) analyze();
}

// --- Interview --------------------------------------------------------------------
function interview(panel) {
  const notes = state.toolkit.interview;
  const es = getLang().startsWith('es');
  const prof = state.toolkit.detective?.prof || 'general';
  const fieldQs = questionsFor(prof).slice(0, 3).map((q) => q.q);
  panel.append(
    h('section', { class: 'card alert-info' }, h('h2', {}, t('iv.title')),
      h('p', {}, es ? 'Para preguntas basadas en TU resumé, guías para situaciones difíciles y práctica bilingüe, usa Preparación para Entrevistas.' : 'For questions based on YOUR resume, difficult-situation guides and bilingual practice, use Interview Readiness.'),
      h('a', { class: 'btn btn-primary', href: '#interview' }, `${t('iv.title')} →`)),
    h('section', { class: 'card' }, h('h2', {}, t('toolkit.interview')), h('ul', {}, INTERVIEW_TIPS.map((x) => h('li', {}, pick(x))))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Preguntas comunes' : 'Common questions'),
      INTERVIEW_QUESTIONS.map((q, i) => h('details', { class: 'qa' }, h('summary', {}, pick(q.q)), h('p', { class: 'tip' }, '💡 ', pick(q.tip)),
        field({ label: es ? 'Mi respuesta (práctica)' : 'My answer (practice)', multiline: true, rows: 3, value: notes[`q${i}`], onInput: (v) => updateToolkit((x) => { x.interview[`q${i}`] = v; }) })))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Preguntas sobre tus logros' : 'Questions about your results'),
      h('p', { class: 'muted' }, es ? 'Basadas en tu campo (elegido en Achievement Detective):' : 'Based on your field (chosen in Achievement Detective):'),
      h('ul', {}, fieldQs.map((q) => h('li', {}, es ? q.es : q.en)))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Preguntas para el entrevistador' : 'Questions to ask them'), h('ul', {}, QUESTIONS_TO_ASK.map((q) => h('li', {}, pick(q))))));
}

// --- STAR ---------------------------------------------------------------------------
function star(panel) {
  const es = getLang().startsWith('es');
  const lang = state.resume.meta.language;
  const list = h('div');
  const draw = () => {
    clear(list);
    const stories = state.toolkit.star;
    stories.forEach((s, i) => {
      const f = (k, label, hint) => field({ label, hint, value: s[k], multiline: k !== 'title', rows: 2, onInput: (v) => updateToolkit(() => { s[k] = v; }) });
      list.appendChild(h('section', { class: 'card star', 'data-testid': 'star-story' },
        f('title', es ? 'Título de la historia' : 'Story title'),
        f('s', es ? 'S — Situación' : 'S — Situation', es ? '¿Cuál era el contexto?' : 'What was the context?'),
        f('t', es ? 'T — Tarea' : 'T — Task', es ? '¿Cuál era tu responsabilidad o meta?' : 'What were you responsible for?'),
        f('a', es ? 'A — Acción' : 'A — Action', es ? '¿Qué hiciste tú, específicamente? (comienza con un verbo)' : 'What did YOU do? (start with a verb)'),
        f('r', es ? 'R — Resultado' : 'R — Result', es ? '¿Qué cambió? Usa cifras reales si las tienes.' : 'What changed? Use real numbers if you have them.'),
        h('div', { class: 'row-actions' },
          button(es ? 'Convertir en línea del resumé' : 'Turn into a resume line', () => {
            const b = starToBullet(s);
            const job = state.resume.experience[0];
            if (!b || !job) { toast(t('improve.noBullets'), 'error'); return; }
            updateResume(() => job.bullets.push(emptyBullet(b)));
            toast(`✓ ${b}`, 'ok');
          }, { small: true }),
          button(t('edit.remove'), () => { updateToolkit((x) => x.star.splice(i, 1)); draw(); }, { small: true, icon: '🗑' }))));
    });
  };
  draw();
  panel.append(
    h('section', { class: 'card' }, h('h2', {}, t('toolkit.star')),
      h('p', {}, es ? 'Prepara historias con el método STAR (Situación, Tarea, Acción, Resultado). Sirven para entrevistas y para escribir logros.' : 'Prepare stories with the STAR method (Situation, Task, Action, Result). Use them in interviews and to write achievements.'),
      h('div', { class: 'toolbar' },
        button(es ? 'Añadir historia' : 'Add a story', () => { updateToolkit((x) => x.star.push({ title: '', s: '', t: '', a: '', r: '' })); draw(); }, { kind: 'primary', icon: '+', testid: 'star-add' }),
        downloadCard('star-txt', t('toolkit.downloadTxt'), '', null, async () => toFile(starToText(state.toolkit.star, lang), 'STAR-Stories.txt', 'text/plain;charset=utf-8')))),
    list);
}

// --- Career change ---------------------------------------------------------------
function change(panel) {
  const es = getLang().startsWith('es');
  panel.append(
    h('section', { class: 'card' }, h('h2', {}, es ? 'Cambio de carrera en 6 pasos' : 'Career change in 6 steps'), h('ol', {}, CHANGE_STEPS.map((s) => h('li', {}, pick(s))))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Regreso al empleo y recién graduados' : 'Returning to work & recent graduates'), h('ul', {}, RETURNING_TIPS.map((s) => h('li', {}, pick(s))))),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Destrezas transferibles' : 'Transferable skills'),
      TRANSFERABLE.map((g) => h('details', { class: 'qa' }, h('summary', {}, pick(g.from)),
        h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, es ? 'Destreza' : 'Skill'), h('th', {}, es ? 'Dónde aplica' : 'Where it transfers'))),
          h('tbody', {}, g.skills.map(([a, b]) => h('tr', {}, h('td', {}, pick(a)), h('td', {}, pick(b))))))))));
}

// --- LinkedIn ------------------------------------------------------------------------
function linkedin(panel) {
  const r = state.resume;
  const lang = r.meta.language;
  const es = getLang().startsWith('es');
  panel.append(
    h('section', { class: 'card' }, h('h2', {}, es ? 'Título sugerido (220 caracteres máx.)' : 'Suggested headline (220 characters max)'), outputBox(linkedinHeadline(r, lang), null, 'li-headline')),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Borrador de “Acerca de”' : '“About” draft'), outputBox(linkedinAbout(r, lang), null, 'li-about')),
    h('section', { class: 'card' }, h('h2', {}, es ? 'Lista de cotejo del perfil' : 'Profile checklist'), h('ul', { class: 'checklist' }, LINKEDIN_CHECKLIST.map((x) => h('li', {}, '○ ', pick(x))))));
}
