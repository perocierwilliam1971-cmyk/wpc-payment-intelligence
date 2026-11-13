// Tiny DOM helpers (no framework, no build-time magic).

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'disabled') el.disabled = !!v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

let idc = 0;
export const nid = (p = 'f') => `${p}-${(idc += 1)}`;

/** Labeled input bound to a getter/setter. */
export function field({ label, value, onInput, type = 'text', placeholder = '', multiline = false, rows = 3, hint, flag, autocomplete, inputmode, maxlength, testid }) {
  const id = nid();
  const attrs = {
    id, placeholder, autocomplete, inputmode, maxlength, 'data-testid': testid,
    class: flag ? 'needs-check' : undefined,
    'aria-describedby': hint ? `${id}-hint` : undefined,
    oninput: (e) => onInput(e.target.value),
  };
  const input = multiline ? h('textarea', { ...attrs, rows }) : h('input', { ...attrs, type });
  input.value = value ?? '';
  return h('div', { class: 'field' },
    h('label', { for: id }, label, flag ? h('span', { class: 'flag', title: flag }, ' ⚑') : null),
    input,
    hint ? h('small', { id: `${id}-hint`, class: 'hint' }, hint) : null);
}

export function button(label, onClick, { kind = 'secondary', icon, title, testid, disabled, type = 'button', small } = {}) {
  return h('button', { type, class: `btn btn-${kind}${small ? ' btn-sm' : ''}`, onclick: onClick, title, 'aria-label': title && !label ? title : undefined, 'data-testid': testid, disabled }, icon ? h('span', { class: 'ico', 'aria-hidden': 'true' }, icon) : null, label);
}

export function toast(msg, kind = 'info', ms = 3800) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div', { id: 'toasts', 'aria-live': 'polite', role: 'status' });
    document.body.appendChild(host);
  }
  const t = h('div', { class: `toast toast-${kind}` }, msg);
  host.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
