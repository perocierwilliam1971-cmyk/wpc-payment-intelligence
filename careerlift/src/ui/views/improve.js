import { h, clear, button, nid, toast } from '../dom.js';
import { state, updateResume } from '../store.js';
import { t, pick, L2 } from '../../i18n/strings.js';
import { improveBullet, buildStatement } from '../../achievement/writer.js';
import { PROFESSIONS, questionsFor, VERB_BANK } from '../../achievement/questions.js';
import { emptyBullet } from '../../model/schema.js';

export function renderImprove(root) {
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const panel = h('div', { class: 'tab-panel', role: 'tabpanel' });
  let tab = 'bullets';
  const tabBtn = (id, label) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(tab === id), 'data-testid': `tab-${id}`, onclick: () => { tab = id; draw(); } }, label);
  const draw = () => {
    clear(tabs).append(tabBtn('bullets', t('improve.tabBullets')), tabBtn('discover', t('improve.tabDiscover')));
    clear(panel);
    if (tab === 'bullets') drawBullets(panel);
    else drawDiscover(panel);
  };
  root.append(
    h('header', { class: 'view-head' }, h('h1', {}, t('improve.title')), h('p', { class: 'lead' }, t('improve.subtitle'))),
    h('p', { class: 'alert alert-info' }, '⚖ ', t('improve.honesty')),
    tabs, panel,
  );
  draw();
}

// --- Strengthen existing lines --------------------------------------------
function drawBullets(panel) {
  const r = state.resume;
  const lang = r.meta.language;
  const jobs = r.experience.filter((e) => e.bullets.some((b) => b.text.trim()));
  if (!jobs.length) {
    panel.appendChild(h('p', { class: 'empty' }, t('improve.noBullets')));
    return;
  }
  const rows = [];
  for (const e of jobs) {
    const list = h('div', { class: 'compare-list' });
    for (const b of e.bullets) {
      if (!b.text.trim()) continue;
      const res = improveBullet(b.text, { lang, current: e.current });
      rows.push({ e, b, res, orig: b.text });
      list.appendChild(compareRow(e, b, res));
    }
    panel.appendChild(h('section', { class: 'card' }, h('h2', {}, [e.title, e.company].filter(Boolean).join(' — ')), list));
  }
  const pending = rows.filter((x) => x.res.changed);
  if (pending.length > 1) {
    panel.prepend(h('div', { class: 'toolbar' }, button(t('improve.acceptAll'), () => {
      updateResume(() => { for (const x of pending) if (x.b.text === x.orig) x.b.text = x.res.improved; /* skip lines edited meanwhile */ });
      toast(t('improve.accepted'), 'ok');
      clear(panel);
      drawBullets(panel);
    }, { kind: 'primary', testid: 'accept-all' })));
  }
}

function tipList(tips) {
  return tips.length ? h('ul', { class: 'tips' }, tips.map((k) => h('li', {}, t(`improve.tip.${k}`)))) : null;
}

function compareRow(e, b, res) {
  const row = h('div', { class: 'compare', 'data-testid': 'compare-row' });
  const score = (n) => h('span', { class: `score s${n >= 75 ? 'hi' : n >= 50 ? 'mid' : 'lo'}` }, t('improve.score', { n }));
  if (!res.changed) {
    row.append(h('div', { class: 'compare-col' }, h('p', {}, b.text), score(res.before.score), tipList(res.tips)), h('p', { class: 'muted small' }, t('improve.noChange')));
    return row;
  }
  const editor = h('textarea', { rows: 2, class: 'compare-edit', 'aria-label': t('improve.suggested'), 'data-testid': 'suggestion' });
  editor.value = res.improved;
  const status = h('span', { class: 'status', 'aria-live': 'polite' });
  row.append(
    h('div', { class: 'compare-grid' },
      h('div', { class: 'compare-col' }, h('h4', {}, t('improve.original')), h('p', { class: 'orig' }, b.text), score(res.before.score)),
      h('div', { class: 'compare-col' }, h('h4', {}, t('improve.suggested')), editor, score(res.after.score), tipList(res.tips))),
    h('div', { class: 'row-actions' },
      button(t('improve.accept'), () => { updateResume(() => { b.text = editor.value.trim(); }); status.textContent = `✓ ${t('improve.accepted')}`; row.classList.add('done'); }, { kind: 'primary', small: true, testid: 'accept' }),
      button(t('improve.reject'), () => { status.textContent = t('improve.kept'); row.classList.add('done'); }, { small: true, testid: 'reject' }),
      status),
  );
  return row;
}

// --- Discover achievements --------------------------------------------------
function drawDiscover(panel) {
  const r = state.resume;
  const lang = r.meta.language;
  const L = L2();
  const jobSel = nid();
  const profSel = nid();
  const answers = state.toolkit.detective || (state.toolkit.detective = { prof: 'general', job: r.experience[0]?.id || '', values: {} });
  const qHost = h('div', { class: 'questions' });
  const resultsHost = h('div', { 'data-testid': 'statements' });

  const jobSelect = h('select', { id: jobSel, 'data-testid': 'detective-job', onchange: (e) => { answers.job = e.target.value; } },
    r.experience.length ? r.experience.map((e) => h('option', { value: e.id, selected: answers.job === e.id }, [e.title, e.company].filter(Boolean).join(' — ') || t('edit.untitledJob')))
      : [h('option', { value: '' }, t('improve.noJobs'))]);
  const profSelect = h('select', { id: profSel, 'data-testid': 'detective-prof', onchange: (e) => { answers.prof = e.target.value; drawQuestions(); } },
    PROFESSIONS.map((p) => h('option', { value: p.id, selected: answers.prof === p.id }, pick(p.label))));

  function drawQuestions() {
    clear(qHost);
    for (const q of questionsFor(answers.prof)) {
      const vals = answers.values[q.id] || (answers.values[q.id] = {});
      qHost.appendChild(h('fieldset', { class: 'q card-inner', 'data-testid': `q-${q.id}` },
        h('legend', {}, q.q[L]),
        h('div', { class: 'grid-2' }, q.fields.map((f) => {
          const id = nid();
          const inp = h('input', { id, type: 'text', placeholder: f.ph[L], 'data-field': f.k, oninput: (e) => { vals[f.k] = e.target.value; } });
          inp.value = vals[f.k] || '';
          return h('div', { class: 'field' }, h('label', { for: id }, f.label[L]), inp);
        }))));
    }
  }

  function generate() {
    clear(resultsHost);
    const job = state.resume.experience.find((e) => e.id === answers.job);
    const out = [];
    for (const q of questionsFor(answers.prof)) {
      const vals = answers.values[q.id] || {};
      if (!Object.values(vals).some((v) => String(v || '').trim())) continue;
      const s = buildStatement(q, vals, lang, !!job?.current);
      if (s) out.push(s);
    }
    if (!out.length) {
      resultsHost.appendChild(h('p', { class: 'alert alert-warn' }, t('improve.emptyAnswers')));
      return;
    }
    resultsHost.appendChild(h('h3', {}, t('improve.results')));
    for (const s of out) {
      const ta = h('textarea', { rows: 2, 'data-testid': 'statement' });
      ta.value = s;
      const status = h('span', { class: 'status', 'aria-live': 'polite' });
      const row = h('div', { class: 'statement card-inner' }, ta, h('div', { class: 'row-actions' },
        button(t('improve.addToJob'), () => {
          const j = state.resume.experience.find((e) => e.id === answers.job);
          if (!j) return;
          updateResume(() => j.bullets.push(emptyBullet(ta.value.trim())));
          status.textContent = `✓ ${t('improve.added')}`;
          row.classList.add('done');
        }, { kind: 'primary', small: true, testid: 'add-statement', disabled: !job }),
        button(t('improve.discard'), () => row.remove(), { small: true }), status));
      resultsHost.appendChild(row);
    }
  }

  drawQuestions();
  const verbs = VERB_BANK[L];
  panel.append(
    h('section', { class: 'card' },
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' }, h('label', { for: jobSel }, t('improve.pickJob')), jobSelect),
        h('div', { class: 'field' }, h('label', { for: profSel }, t('improve.pickProfession')), profSelect)),
      h('p', { class: 'muted' }, t('improve.answerHint')),
      qHost,
      button(t('improve.generate'), generate, { kind: 'primary', testid: 'generate' }),
      resultsHost),
    h('details', { class: 'card' }, h('summary', {}, h('h2', {}, t('improve.verbBank'))), h('p', { class: 'muted' }, t('improve.verbHint')),
      h('div', { class: 'verb-grid' }, Object.entries(verbs).map(([k, list]) => h('div', {}, h('h4', {}, t(`improve.verbs.${k}`)), h('p', {}, list.join(' · ')))))),
  );
}
