// App state + local persistence. Everything stays on the customer's device.

import { createEmptyResume, normalizeResume } from '../model/schema.js';
import { debounce, deepClone } from '../core/util.js';

const KEY = 'careerlift:v1';

const listeners = new Set();
let saveStatus = 'idle'; // idle | saved | error
let storageOk = true;

export const state = {
  resume: createEmptyResume('en'),
  lang: 'en',
  step: 'start',
  started: false,
  importReport: null,
  toolkit: { cover: {}, star: [], interview: {}, checklist: {}, messages: {} },
  prefs: { embedData: false, embedFonts: true },
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(kind) {
  for (const fn of listeners) fn(kind);
}

/** Mutate the resume via a function, then notify + autosave. */
export function updateResume(mutator, kind = 'resume') {
  mutator(state.resume);
  state.resume.meta.updatedAt = new Date().toISOString();
  state.started = true;
  emit(kind);
  scheduleSave();
}

export function setResume(r, kind = 'resume') {
  state.resume = normalizeResume(r);
  state.started = true;
  emit(kind);
  scheduleSave();
}

export function setState(patch, kind = 'ui') {
  Object.assign(state, patch);
  emit(kind);
  scheduleSave();
}

export function updateToolkit(mutator) {
  mutator(state.toolkit);
  scheduleSave();
}

const scheduleSave = debounce(save, 400);

export function save() {
  try {
    const data = { v: 1, resume: state.resume, lang: state.lang, step: state.step, started: state.started, toolkit: state.toolkit, prefs: state.prefs, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(data));
    saveStatus = 'saved';
    storageOk = true;
  } catch {
    saveStatus = 'error';
    storageOk = false;
  }
  emit('saved');
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.resume = normalizeResume(data.resume);
    state.lang = ['en', 'es', 'es-PR'].includes(data.lang) ? data.lang : 'en';
    state.step = data.step || 'start';
    state.started = !!data.started;
    state.toolkit = { ...state.toolkit, ...(data.toolkit || {}) };
    state.prefs = { ...state.prefs, ...(data.prefs || {}) };
    state.savedAt = data.savedAt;
    return true;
  } catch {
    storageOk = false;
    return false;
  }
}

export function clearSaved() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function getSaveStatus() {
  return { status: saveStatus, storageOk };
}

/** Full project backup (resume + toolkit) as JSON text. */
export function exportProject() {
  return JSON.stringify({ app: 'careerlift', v: 1, exportedAt: new Date().toISOString(), resume: state.resume, toolkit: state.toolkit }, null, 2);
}

export function importProject(text) {
  const data = JSON.parse(text);
  if (data?.app !== 'careerlift' || !data.resume) throw new Error('not-careerlift');
  state.toolkit = { ...state.toolkit, ...(data.toolkit || {}) };
  setResume(deepClone(data.resume));
}
