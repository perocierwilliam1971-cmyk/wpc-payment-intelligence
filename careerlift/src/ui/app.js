// App shell: navigation, language, progress, save status, view routing.

import '../styles/app.css';
import { h, clear } from './dom.js';
import { state, load, subscribe, setState, getSaveStatus } from './store.js';
import { t, setLang, LANGS } from '../i18n/strings.js';
import { injectFontFaces, setFontBaseUrl } from '../design/fonts.js';
import { renderStart } from './views/start.js';
import { renderEdit } from './views/edit.js';
import { renderImprove } from './views/improve.js';
import { renderDesign } from './views/design.js';
import { renderDownload } from './views/download.js';
import { renderToolkit } from './views/toolkit.js';
import { renderInterview } from './views/interview.js';

const STEPS = ['start', 'edit', 'improve', 'design', 'download', 'interview', 'toolkit'];
const VIEWS = { start: renderStart, edit: renderEdit, improve: renderImprove, design: renderDesign, download: renderDownload, interview: renderInterview, toolkit: renderToolkit };

setFontBaseUrl(`${import.meta.env.BASE_URL}fonts/`);
injectFontFaces();
load();
setLang(state.lang);

const app = document.getElementById('app');
let cleanup = null;

function progress() {
  const r = state.resume;
  const parts = [
    !!r.contact.fullName, !!r.contact.email, r.summary.trim().length > 40,
    r.experience.length > 0 && r.experience.every((e) => e.title && e.bullets.some((b) => b.text.trim())),
    r.skills.length >= 4, r.education.length > 0,
  ];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

function go(step) {
  const target = STEPS.includes(step) ? step : 'start';
  setState({ step: target }, 'nav');
  if (location.hash !== `#${target}`) history.replaceState(null, '', `#${target}`);
  render();
  window.scrollTo({ top: 0 });
  document.getElementById('main')?.focus({ preventScroll: true });
}

function shell() {
  const langId = 'ui-lang';
  const pct = progress();
  const nav = h('nav', { class: 'steps', 'aria-label': t('nav.menu') },
    h('ol', {}, STEPS.map((s, i) => h('li', {}, h('a', {
      href: `#${s}`, class: 'step', 'aria-current': state.step === s ? 'step' : undefined, 'data-testid': `nav-${s}`,
      onclick: (e) => { e.preventDefault(); go(s); },
    }, s !== 'toolkit' ? h('span', { class: 'num', 'aria-hidden': 'true' }, String(i + 1)) : h('span', { class: 'num', 'aria-hidden': 'true' }, '★'), h('span', { class: 'label' }, t(`nav.${s}`)))))));
  const saveEl = h('span', { class: 'save-status', id: 'save-status', 'aria-live': 'polite' });
  updateSave(saveEl);
  return h('div', { class: 'shell' },
    h('a', { href: '#main', class: 'skip' }, 'Skip to content'),
    h('header', { class: 'topbar' },
      h('a', { href: './', class: 'brand', 'aria-label': t('app.home') }, h('span', { class: 'logo', 'aria-hidden': 'true' }, 'CL'), h('span', {}, 'CareerLift', h('small', {}, ' Career Intelligence™'))),
      h('div', { class: 'topbar-right' }, saveEl,
        h('label', { for: langId, class: 'sr-only' }, t('app.lang')),
        h('select', { id: langId, class: 'lang', 'data-testid': 'ui-lang', onchange: (e) => { setLang(e.target.value); setState({ lang: e.target.value }, 'lang'); render(); } },
          LANGS.map((l) => h('option', { value: l.id, selected: state.lang === l.id }, l.label))))),
    nav,
    h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': t('app.progress', { n: pct }) },
      h('div', { class: 'bar', style: { width: `${pct}%` } }), h('span', { class: 'pct' }, t('app.progress', { n: pct }))),
  );
}

function updateSave(el) {
  const s = getSaveStatus();
  if (!el) return;
  el.textContent = s.storageOk ? (s.status === 'saved' ? `✓ ${t('app.saved')}` : '') : `⚠ ${t('app.saveError')}`;
  el.classList.toggle('err', !s.storageOk);
}

function footerNav() {
  const i = STEPS.indexOf(state.step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  if (state.step === 'start') return null;
  return h('div', { class: 'footer-nav' },
    prev ? h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => go(prev) }, `← ${t(`nav.${prev}`)}`) : h('span'),
    next ? h('button', { type: 'button', class: 'btn btn-primary', 'data-testid': 'next', onclick: () => go(next) }, `${t(`nav.${next}`)} →`) : h('span'));
}

function render() {
  cleanup?.();
  cleanup = null;
  clear(app);
  const main = h('main', { id: 'main', tabindex: '-1', class: `view view-${state.step}` });
  app.append(shell(), main);
  cleanup = VIEWS[state.step](main, go) || null;
  const fn = footerNav();
  if (fn) main.appendChild(fn);
}

subscribe((kind) => {
  if (kind === 'saved') updateSave(document.getElementById('save-status'));
  if (kind === 'resume' || kind === 'design') {
    const bar = document.querySelector('.progress');
    if (bar) {
      const pct = progress();
      bar.setAttribute('aria-valuenow', String(pct));
      bar.querySelector('.bar').style.width = `${pct}%`;
      bar.querySelector('.pct').textContent = t('app.progress', { n: pct });
    }
  }
});

window.addEventListener('hashchange', () => {
  const s = location.hash.slice(1);
  if (STEPS.includes(s) && s !== state.step) go(s);
});

const initial = location.hash.slice(1);
state.step = STEPS.includes(initial) ? initial : (state.started ? state.step : 'start');
render();

// Expose a tiny test hook (read-only snapshot) for automated tests.
window.__careerlift = { get state() { return JSON.parse(JSON.stringify(state)); } };
