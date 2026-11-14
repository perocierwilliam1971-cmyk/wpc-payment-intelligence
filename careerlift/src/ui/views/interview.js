import { h, clear, button, nid, field, toast } from '../dom.js';
import { state, updateToolkit } from '../store.js';
import { t, getLang, pick } from '../../i18n/strings.js';
import { predictQuestions } from '../../interview/analyze.js';
import { PLAYBOOKS, getPlaybook, buildScript, langComplete, PHRASES } from '../../interview/playbooks.js';
import { readiness, prepSheet, emptyInterviewState } from '../../interview/readiness.js';
import { prepareFonts, layoutLetter } from '../../layout/engine.js';
import { renderPdf } from '../../export/pdf.js';
import { toFile } from '../../export/download.js';
import { downloadCard, baseName } from './download.js';

function iv() {
  if (!state.toolkit.iv) updateToolkit((x) => { x.iv = emptyInterviewState(); });
  return state.toolkit.iv;
}
const uiEs = () => getLang().startsWith('es');

/** Countdown practice timer. */
function timer(seconds, { onHalf, onDone, testid } = {}) {
  const out = h('span', { class: 'timer-out', 'aria-live': 'polite' });
  let id = null;
  let left = seconds;
  const stop = () => { clearInterval(id); id = null; btn.textContent = t('iv.timer', { s: seconds }); };
  const btn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'data-testid': testid, onclick: () => {
    if (id) { stop(); out.textContent = ''; return; }
    left = seconds;
    btn.textContent = t('iv.stop');
    out.textContent = t('iv.timeLeft', { s: left });
    id = setInterval(() => {
      left -= 1;
      if (left === Math.floor(seconds / 2)) onHalf?.();
      if (left <= 0) { stop(); out.textContent = t('iv.timeUp'); onDone?.(); return; }
      out.textContent = t('iv.timeLeft', { s: left });
    }, 1000);
  } }, t('iv.timer', { s: seconds }));
  return { el: h('div', { class: 'timer' }, btn, out), stop };
}

export function renderInterview(root) {
  const data = iv();
  const scoreBox = h('div', { class: 'readiness card', 'data-testid': 'readiness' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const panel = h('div', { class: 'tab-panel', role: 'tabpanel' });
  let tab = data.tab || 'questions';
  let openPlaybook = null;

  const refreshScore = () => {
    const r = readiness(state.resume, iv());
    clear(scoreBox).append(
      h('div', { class: 'ring', style: { '--p': `${r.score}` }, 'aria-hidden': 'true' }, h('span', {}, `${r.score}%`)),
      h('div', {}, h('h2', {}, `${t('iv.score')}: `, h('span', { 'data-testid': 'readiness-score' }, `${r.score}%`)),
        h('p', { class: 'muted' }, t('iv.scoreDetail', { answered: r.answered, questions: r.questions, pbDone: r.playbooksDone, pbNeeded: r.playbooksNeeded }))));
  };

  const go = (id, pb) => { tab = id; openPlaybook = pb || null; updateToolkit((x) => { x.iv.tab = id; }); draw(); };
  const tabBtn = (id, label) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(tab === id), 'data-testid': `iv-tab-${id}`, onclick: () => go(id) }, label);
  const draw = () => {
    clear(tabs).append(tabBtn('questions', t('iv.tabQuestions')), tabBtn('playbooks', t('iv.tabPlaybooks')), tabBtn('bilingual', t('iv.tabBilingual')));
    clear(panel);
    if (tab === 'questions') drawQuestions(panel, refreshScore, go);
    else if (tab === 'playbooks') drawPlaybooks(panel, refreshScore, openPlaybook);
    else drawBilingual(panel, refreshScore);
  };

  const r = state.resume;
  const target = h('div', { class: 'grid-2' },
    field({ label: t('iv.target'), placeholder: t('iv.targetPh'), value: data.targetRole, testid: 'iv-target', onInput: (v) => { updateToolkit((x) => { x.iv.targetRole = v; }); } }),
    field({ label: t('iv.company'), value: data.company, testid: 'iv-company', onInput: (v) => updateToolkit((x) => { x.iv.company = v; }) }));
  // Re-predict when the target changes (on blur, so typing isn't interrupted).
  target.querySelector('input').addEventListener('change', () => { refreshScore(); if (tab === 'questions') draw(); });

  root.append(
    h('header', { class: 'view-head' }, h('h1', {}, t('iv.title')), h('p', { class: 'lead' }, t('iv.subtitle'))),
    scoreBox,
    h('section', { class: 'card' }, target),
    tabs, panel,
    h('section', { class: 'download-grid compact' },
      downloadCard('prep-pdf', `${t('iv.download')} (PDF)`, '', null, async () => {
        await prepareFonts(r);
        const text = prepSheet(state.resume, iv(), getLang());
        const bytes = await renderPdf(layoutLetter(state.resume, text), { title: 'Interview Prep', author: r.contact.fullName, language: getLang() });
        return toFile(bytes, `${baseName(r)}-Interview-Prep.pdf`, 'application/pdf');
      }),
      downloadCard('prep-txt', `${t('iv.download')} (.txt)`, '', null, async () => toFile(prepSheet(state.resume, iv(), getLang()), `${baseName(r)}-Interview-Prep.txt`, 'text/plain;charset=utf-8'))),
  );
  refreshScore();
  draw();
}

function drawQuestions(panel, refreshScore, go) {
  const data = iv();
  const es = uiEs();
  if (!state.resume.experience.length && !state.resume.education.length) {
    panel.appendChild(h('p', { class: 'empty' }, t('iv.noResume')));
  }
  const qs = predictQuestions(state.resume, { targetRole: data.targetRole });
  for (const q of qs) {
    const ans = data.answers[q.id] || {};
    const other = h('p', { class: 'muted small other-lang', hidden: true }, es ? q.q.en : q.q.es);
    const area = (lng) => {
      const id = nid();
      const ta = h('textarea', { id, rows: 3, 'data-testid': `iv-answer-${lng}`, oninput: (e) => { updateToolkit((x) => { x.iv.answers[q.id] = { ...(x.iv.answers[q.id] || {}), [lng]: e.target.value }; }); refreshScore(); } });
      ta.value = ans[lng] || '';
      return h('div', { class: 'field' }, h('label', { for: id }, t(lng === 'en' ? 'iv.answerEn' : 'iv.answerEs')), ta);
    };
    const tm = timer(q.kind === 'opening' ? 90 : 60, { testid: `iv-timer-${q.id}` });
    panel.appendChild(h('article', { class: 'card iv-q', 'data-testid': 'iv-question', 'data-kind': q.kind },
      h('span', { class: `badge k-${q.kind}` }, t(`iv.kind.${q.kind}`)),
      h('h3', {}, es ? q.q.es : q.q.en),
      h('button', { type: 'button', class: 'linklike', onclick: () => { other.hidden = !other.hidden; } }, es ? 'Ver en inglés' : 'See in Spanish'), other,
      h('p', { class: 'tip' }, h('strong', {}, `${t('iv.why')}: `), es ? q.why.es : q.why.en),
      q.playbook ? button(`${t('iv.buildAnswer')} →`, () => go('playbooks', q.playbook), { small: true, testid: `iv-open-${q.playbook}` }) : null,
      h('div', { class: 'grid-2' }, area(es ? 'es' : 'en'), area(es ? 'en' : 'es')),
      tm.el));
  }
}

function drawPlaybooks(panel, refreshScore, openId) {
  const data = iv();
  const es = uiEs();
  const needed = new Set(predictQuestions(state.resume, { targetRole: data.targetRole }).map((q) => q.playbook).filter(Boolean));
  const ordered = [...PLAYBOOKS].sort((a, b) => Number(needed.has(b.id)) - Number(needed.has(a.id)));
  for (const pb of ordered) {
    const stored = data.playbooks[pb.id] || { en: {}, es: {} };
    let lng = stored.lang || (es ? 'es' : 'en');
    const formHost = h('div');
    const scriptHost = h('div', { class: 'script', 'data-testid': `pb-script-${pb.id}` });
    const drawScript = () => {
      const vals = (iv().playbooks[pb.id] || {})[lng] || {};
      clear(scriptHost);
      if (!langComplete(pb, vals)) { scriptHost.appendChild(h('p', { class: 'muted' }, t('iv.scriptEmpty'))); return; }
      const text = buildScript(pb, vals, lng);
      const ta = h('textarea', { rows: 4, readonly: true, class: 'output', 'data-testid': `pb-output-${pb.id}` });
      ta.value = text;
      scriptHost.append(h('h4', {}, t('iv.script')), ta, h('div', { class: 'row-actions' },
        button('⧉', async () => { try { await navigator.clipboard.writeText(text); toast(t('toolkit.copied'), 'ok'); } catch { toast(t('toolkit.copyFail'), 'error'); } }, { small: true, title: t('toolkit.copy') }),
        timer(60).el));
    };
    const drawForm = () => {
      clear(formHost);
      const vals = ((iv().playbooks[pb.id] || {})[lng]) || {};
      const langId = nid();
      formHost.append(
        h('div', { class: 'field' }, h('label', { for: langId }, t('iv.buildIn')),
          h('select', { id: langId, 'data-testid': `pb-lang-${pb.id}`, onchange: (e) => { lng = e.target.value; updateToolkit((x) => { x.iv.playbooks[pb.id] = { en: {}, es: {}, ...(x.iv.playbooks[pb.id] || {}), lang: lng }; }); drawForm(); drawScript(); } },
            h('option', { value: 'en', selected: lng === 'en' }, 'English'), h('option', { value: 'es', selected: lng === 'es' }, 'Español'))),
        h('div', { class: 'grid-2' }, pb.fields.map((f) => field({
          label: `${f.label[lng]}`, placeholder: f.ph[lng], value: vals[f.k], multiline: true, rows: 2, testid: `pb-${pb.id}-${f.k}`,
          onInput: (v) => {
            updateToolkit((x) => {
              const cur = x.iv.playbooks[pb.id] || { en: {}, es: {} };
              cur[lng] = { ...(cur[lng] || {}), [f.k]: v };
              x.iv.playbooks[pb.id] = cur;
            });
            drawScript();
            refreshScore();
          },
        }))));
    };
    drawForm();
    drawScript();
    const L = es ? 'es' : 'en';
    panel.appendChild(h('details', { class: 'card playbook', open: openId === pb.id || undefined, 'data-testid': `pb-${pb.id}` },
      h('summary', {}, h('h2', {}, pb.title[L]), needed.has(pb.id) ? h('span', { class: 'badge k-rec' }, t('iv.recommended')) : null),
      h('p', {}, h('strong', {}, `${t('iv.when')}: `), pb.when[L]),
      h('h4', {}, t('iv.principles')), h('ul', {}, pb.principles.map((p) => h('li', {}, p[L]))),
      formHost, scriptHost,
      h('h4', {}, t('iv.avoid')), h('ul', { class: 'avoid' }, pb.avoid.map((p) => h('li', {}, p[L])))));
  }
  if (openId) setTimeout(() => panel.querySelector(`[data-testid=pb-${openId}]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function drawBilingual(panel, refreshScore) {
  const qs = predictQuestions(state.resume, { targetRole: iv().targetRole });
  const stage = h('div', { class: 'drill-stage', 'aria-live': 'assertive', 'data-testid': 'drill-stage' });
  const count = h('p', { class: 'muted', 'data-testid': 'drill-count' }, t('iv.drillCount', { n: iv().drills || 0 }));
  let tm = null;
  const start = () => {
    tm?.stop();
    const q = qs[Math.floor(Math.random() * qs.length)] || { q: { en: 'Tell me about yourself.', es: 'Háblame de ti.' } };
    const first = Math.random() < 0.5 ? 'en' : 'es';
    const second = first === 'en' ? 'es' : 'en';
    clear(stage).append(h('p', { class: 'drill-lang' }, t(`iv.lang.${first}`).toUpperCase()), h('h3', {}, q.q[first]));
    tm = timer(90, {
      onHalf: () => stage.append(h('p', { class: 'drill-switch' }, t('iv.drillSwitch', { lang: t(`iv.lang.${second}`) })), h('p', { class: 'muted' }, q.q[second])),
      onDone: () => {
        updateToolkit((x) => { x.iv.drills = (x.iv.drills || 0) + 1; });
        count.textContent = t('iv.drillCount', { n: iv().drills });
        stage.append(h('p', { class: 'ok' }, t('iv.drillDone', { n: iv().drills })));
        refreshScore();
      },
      testid: 'drill-timer',
    });
    stage.appendChild(tm.el);
    tm.el.querySelector('button').click();
  };
  panel.append(
    h('section', { class: 'card' }, h('h2', {}, t('iv.drillTitle')), h('p', {}, t('iv.drillDesc')),
      button(t('iv.drillStart'), start, { kind: 'primary', testid: 'drill-start' }), stage, count),
    (() => { const pb = getPlaybook('bilingual'); return h('section', { class: 'card' }, h('h2', {}, pick(pb.title)), h('ul', {}, pb.principles.map((p) => h('li', {}, pick(p))))); })(),
    h('section', { class: 'card' }, h('h2', {}, t('iv.phrases')),
      h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'English'), h('th', {}, 'Español'))),
        h('tbody', {}, PHRASES.map((p) => h('tr', {}, h('td', {}, p.en), h('td', {}, p.es)))))));
}
