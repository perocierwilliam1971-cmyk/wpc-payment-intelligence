// Live preview component: lays out the CURRENT resume with the same engine
// the PDF exporter uses, and paints it as SVG pages.

import { h, clear } from './dom.js';
import { state, subscribe } from './store.js';
import { prepareFonts, layoutResume } from '../layout/engine.js';
import { layoutToSvgPages } from '../render/svg.js';
import { ensureBrowserFont } from '../design/fonts.js';
import { t } from '../i18n/strings.js';

export let lastLayout = null;

export function mountPreview(container, { compact = false } = {}) {
  const status = h('div', { class: 'preview-status', 'aria-live': 'polite' });
  const pages = h('div', { class: 'preview-pages', 'data-testid': 'preview-pages' });
  const wrap = h('div', { class: `preview${compact ? ' preview-compact' : ''}` }, status, pages);
  clear(container).appendChild(wrap);
  let seq = 0;
  let timer = null;

  async function render() {
    const my = ++seq;
    const r = state.resume;
    try {
      status.textContent = '';
      const fams = [r.design.headingFont, r.design.bodyFont];
      const slow = setTimeout(() => { if (my === seq) status.textContent = t('design.loadingFont'); }, 250);
      await prepareFonts(r);
      await Promise.all(fams.map(ensureBrowserFont));
      clearTimeout(slow);
      if (my !== seq) return; // a newer render started
      const layout = layoutResume(r);
      lastLayout = layout;
      const svgs = layoutToSvgPages(layout, { title: r.contact.fullName || 'Resume' });
      clear(pages);
      svgs.forEach((svg, i) => {
        const pg = h('div', { class: 'preview-page', 'data-page': i + 1, style: { aspectRatio: `${layout.width} / ${layout.height}` } });
        pg.innerHTML = svg;
        pages.appendChild(pg);
      });
      pages.dataset.template = layout.templateId;
      pages.dataset.pages = String(layout.pages.length);
      status.textContent = t('design.pages', { n: layout.pages.length });
      container.dispatchEvent(new CustomEvent('preview-rendered', { detail: layout, bubbles: true }));
    } catch (e) {
      console.error(e);
      status.textContent = t('download.failed');
    }
  }

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(render), 60);
  };
  const unsub = subscribe((kind) => {
    if (kind === 'resume' || kind === 'design' || kind === 'lang') schedule();
  });
  render();
  return () => { unsub(); clearTimeout(timer); };
}
