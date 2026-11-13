import { h, clear, button, nid } from '../dom.js';
import { state, updateResume, setResume } from '../store.js';
import { t, getLang, TEMPLATE_DESC_ES } from '../../i18n/strings.js';
import { TEMPLATES, getTemplate, PAGE_SIZES } from '../../layout/templates.js';
import { FONT_FAMILIES, loadFamily, ensureBrowserFont } from '../../design/fonts.js';
import { applyTemplate } from '../../design/apply.js';
import { prepareFonts, layoutResume } from '../../layout/engine.js';
import { pageToSvg } from '../../render/svg.js';
import { mountPreview } from '../preview.js';
import { normalizeOrder, sectionHasContent } from '../../model/schema.js';
import { sectionTitle } from '../../model/labels.js';
import { contrastRatio, normalizeHex, deepClone } from '../../core/util.js';

export const PALETTES = [
  { id: 'navy', name: 'Navy & Gold', primary: '#1b2a41', accent: '#b08d3c', background: '#f4f1ea' },
  { id: 'teal', name: 'Teal & Orange', primary: '#0f4c5c', accent: '#e36414', background: '#e6f0f2' },
  { id: 'charcoal', name: 'Charcoal', primary: '#1f2937', accent: '#4b5563', background: '#f3f4f6' },
  { id: 'burgundy', name: 'Burgundy', primary: '#7f1d1d', accent: '#9ca3af', background: '#f5f0f0' },
  { id: 'forest', name: 'Forest', primary: '#14532d', accent: '#ca8a04', background: '#ecf5ee' },
  { id: 'purple', name: 'Royal Purple', primary: '#6d28d9', accent: '#f59e0b', background: '#ede9fe' },
  { id: 'ocean', name: 'Ocean Blue', primary: '#1d4ed8', accent: '#0ea5e9', background: '#e8f0fe' },
  { id: 'coral', name: 'Slate & Coral', primary: '#334155', accent: '#f97362', background: '#f1f5f9' },
];

export function renderDesign(root) {
  const controls = h('div', { class: 'design-controls', id: 'design-controls' });
  const previewHost = h('div', { class: 'design-preview', id: 'design-preview' });
  let mobilePane = 'controls';
  const seg = h('div', { class: 'segmented mobile-only', role: 'tablist' });
  const drawSeg = () => {
    clear(seg).append(
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(mobilePane === 'controls'), onclick: () => { mobilePane = 'controls'; layoutPanes(); } }, t('design.showControls')),
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(mobilePane === 'preview'), 'data-testid': 'show-preview', onclick: () => { mobilePane = 'preview'; layoutPanes(); } }, t('design.showPreview')));
  };
  const layout = h('div', { class: 'design-layout' }, controls, previewHost);
  const layoutPanes = () => { layout.dataset.pane = mobilePane; drawSeg(); };
  layoutPanes();

  root.append(h('header', { class: 'view-head' }, h('h1', {}, t('design.title')), h('p', { class: 'lead' }, t('design.subtitle'))), seg, layout);
  const unmountPreview = mountPreview(previewHost);
  drawControls(controls);
  return () => unmountPreview();
}

function drawControls(host) {
  clear(host);
  const r = state.resume;
  const d = r.design;
  const tpl = getTemplate(d.templateId);
  const setD = (fn) => updateResume((x) => fn(x.design), 'design');

  // --- Templates with real thumbnails
  const gallery = h('div', { class: 'template-grid', role: 'radiogroup', 'aria-label': t('design.template') });
  for (const tp of TEMPLATES) {
    const thumb = h('div', { class: 'thumb', 'aria-hidden': 'true' });
    const card = h('button', {
      type: 'button', role: 'radio', class: 'template-card', 'aria-checked': String(tp.id === d.templateId), 'data-testid': `template-${tp.id}`,
      onclick: async () => {
        const next = applyTemplate(state.resume, tp.id);
        await prepareFonts(next);
        setResume(next, 'design');
        drawControls(host);
      },
    }, thumb, h('span', { class: 'tname' }, tp.name), h('span', { class: 'tdesc' }, getLang().startsWith('es') ? TEMPLATE_DESC_ES[tp.id] : tp.description));
    gallery.appendChild(card);
    drawThumb(thumb, tp.id);
  }

  // --- Colors
  const roles = Object.keys(tpl.colorRoles);
  const colorRows = roles.map((role) => {
    const id = nid('c');
    const input = h('input', { type: 'color', id, value: d.colors[role], 'data-testid': `color-${role}`,
      oninput: (e) => setD((dd) => { dd.colors[role] = normalizeHex(e.target.value, dd.colors[role]); }),
    });
    const hex = h('input', { type: 'text', class: 'hex', value: d.colors[role], maxlength: 7, 'aria-label': `${t(`role.${role}`)} hex`, 'data-testid': `hex-${role}`,
      onchange: (e) => {
        const v = normalizeHex(e.target.value, null);
        if (v) { input.value = v; setD((dd) => { dd.colors[role] = v; }); } else e.target.value = state.resume.design.colors[role];
      },
    });
    input.addEventListener('input', () => { hex.value = input.value; warn(); });
    return h('div', { class: 'color-row' }, h('label', { for: id }, t(`role.${role}`), getLang().startsWith('es') ? null : h('small', { class: 'muted' }, ` · ${tpl.colorRoles[role]}`)), h('div', { class: 'color-inputs' }, input, hex));
  });
  const warnBox = h('p', { class: 'alert alert-warn', hidden: true, role: 'status' }, t('design.contrastWarn'));
  const warn = () => {
    const c = state.resume.design.colors;
    const low = contrastRatio(c.text, '#ffffff') < 4.5 || (['classic', 'minimal', 'corporate'].includes(tpl.id) && contrastRatio(c.primary, '#ffffff') < 3);
    warnBox.hidden = !low;
  };
  warn();
  const swatches = h('div', { class: 'swatches' }, PALETTES.map((p) => h('button', {
    type: 'button', class: 'swatch', title: p.name, 'aria-label': p.name, 'data-testid': `palette-${p.id}`,
    style: { background: `linear-gradient(135deg, ${p.primary} 0 55%, ${p.accent} 55% 100%)` },
    onclick: () => {
      setD((dd) => {
        dd.colors.primary = p.primary;
        dd.colors.accent = p.accent;
        dd.colors.background = tpl.id === 'modern' ? p.primary : p.background;
      });
      drawControls(host);
    },
  })));

  // --- Fonts
  const fontSelect = (key, label) => {
    const id = nid();
    return h('div', { class: 'field' }, h('label', { for: id }, label),
      h('select', { id, 'data-testid': `font-${key}`, onchange: async (e) => {
        const fam = e.target.value;
        e.target.disabled = true;
        try { await loadFamily(fam); await ensureBrowserFont(fam); } finally { e.target.disabled = false; }
        setD((dd) => { dd[key] = fam; });
      } }, Object.entries(FONT_FAMILIES).map(([k, f]) => h('option', { value: k, selected: d[key] === k }, `${f.label} (${f.kind})`))));
  };

  // --- Sliders
  const slider = (key, label, min, max, step, fmt) => {
    const id = nid();
    const out = h('output', { for: id }, fmt(d[key]));
    const inp = h('input', { type: 'range', id, min, max, step, value: d[key], 'data-testid': `range-${key}`,
      oninput: (e) => { const v = Number(e.target.value); out.textContent = fmt(v); setD((dd) => { dd[key] = v; }); } });
    return h('div', { class: 'field slider' }, h('label', { for: id }, label, ' ', out), inp);
  };

  // --- Page size & sidebar
  const radioGroup = (name, value, options, onChange, disabled) => h('div', { class: 'radio-row', role: 'radiogroup' }, options.map(([v, label]) => {
    const id = nid();
    return h('label', { for: id, class: 'radio' }, h('input', { type: 'radio', id, name, value: v, checked: value === v, disabled, 'data-testid': `${name}-${v}`, onchange: () => onChange(v) }), label);
  }));

  // --- Sections
  const secHost = h('ol', { class: 'section-order' });
  const drawSections = () => {
    clear(secHost);
    const rr = state.resume;
    const order = normalizeOrder(rr.design.sectionOrder, rr.custom);
    order.forEach((key, i) => {
      const id = nid();
      const has = sectionHasContent(rr, key);
      secHost.appendChild(h('li', { class: has ? '' : 'empty-sec', 'data-key': key },
        h('label', { for: id, class: 'check' }, h('input', { type: 'checkbox', id, checked: !rr.design.hidden[key], 'data-testid': `show-${key}`,
          onchange: (e) => setD((dd) => { if (e.target.checked) delete dd.hidden[key]; else dd.hidden[key] = true; }) }), sectionTitle(rr, key) || '—', has ? '' : h('small', { class: 'muted' }, ' (—)')),
        h('div', { class: 'row-actions' },
          button('', () => { setD((dd) => { const o = normalizeOrder(dd.sectionOrder, rr.custom); [o[i - 1], o[i]] = [o[i], o[i - 1]]; dd.sectionOrder = o; }); drawSections(); }, { icon: '↑', small: true, title: t('edit.moveUp'), disabled: i === 0, testid: `up-${key}` }),
          button('', () => { setD((dd) => { const o = normalizeOrder(dd.sectionOrder, rr.custom); [o[i + 1], o[i]] = [o[i], o[i + 1]]; dd.sectionOrder = o; }); drawSections(); }, { icon: '↓', small: true, title: t('edit.moveDown'), disabled: i === order.length - 1, testid: `down-${key}` }))));
    });
  };
  drawSections();

  host.append(
    group(t('design.template'), gallery, tpl.id !== 'classic' ? h('p', { class: 'muted small' }, t('design.atsNote')) : null),
    group(t('design.colors'), h('p', { class: 'small muted' }, t('design.presets')), swatches, colorRows, warnBox),
    group(t('design.fonts'), h('div', { class: 'grid-2' }, fontSelect('headingFont', t('design.headingFont')), fontSelect('bodyFont', t('design.bodyFont')))),
    group(t('design.layout'),
      slider('fontSize', t('design.fontSize'), 8.5, 12.5, 0.5, (v) => `${v} pt`),
      slider('margins', t('design.margins'), 28, 86, 2, (v) => `${(v / 72).toFixed(2)} in`),
      slider('lineSpacing', t('design.lineSpacing'), 1, 1.6, 0.05, (v) => v.toFixed(2)),
      slider('sectionSpacing', t('design.sectionSpacing'), 6, 28, 1, (v) => `${v} pt`),
      h('div', { class: 'field' }, h('span', { class: 'label' }, t('design.pageSize')),
        radioGroup('pagesize', d.pageSize, [['letter', `${t('design.letter')} · 8.5×11 in`], ['a4', `${t('design.a4')} · 210×297 mm`]], (v) => setD((dd) => { dd.pageSize = v; }))),
      h('div', { class: 'field' }, h('span', { class: 'label' }, t('design.sidebar')),
        radioGroup('sidebar', d.sidebarPosition, [['left', t('design.left')], ['right', t('design.right')]], (v) => setD((dd) => { dd.sidebarPosition = v; }), tpl.layout !== 'sidebar'),
        tpl.layout !== 'sidebar' ? h('small', { class: 'hint' }, t('design.sidebarNA')) : null)),
    group(t('design.sections'), secHost),
    h('div', { class: 'toolbar' }, button(t('design.reset'), async () => {
      const next = applyTemplate(state.resume, tpl.id, { reset: true });
      next.design.hidden = deepClone(state.resume.design.hidden);
      await prepareFonts(next);
      setResume(next, 'design');
      drawControls(host);
    }, { testid: 'reset-template' })),
  );
}

function group(title, ...content) {
  return h('section', { class: 'card control-group' }, h('h2', {}, title), content);
}

async function drawThumb(el, templateId) {
  try {
    const r = applyTemplate(state.resume, templateId);
    if (!r.contact.fullName && !r.experience.length) {
      // Empty resume: show a sample so templates can still be compared.
      const { sampleForThumbs } = await import('../thumb-sample.js');
      Object.assign(r, sampleForThumbs(r));
    }
    await prepareFonts(r);
    const lay = layoutResume(r);
    el.innerHTML = pageToSvg(lay, lay.pages[0]);
    el.style.aspectRatio = `${lay.width} / ${lay.height}`;
    await Promise.all([r.design.headingFont, r.design.bodyFont].map(ensureBrowserFont));
  } catch (e) {
    console.error(e);
  }
}

export { PAGE_SIZES };
