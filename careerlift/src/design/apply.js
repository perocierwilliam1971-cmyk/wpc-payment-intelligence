// Switching templates: each template has its own default look, but the
// customer's tweaks for a template are remembered, so switching away and
// back never throws their work away.

import { getTemplate } from '../layout/templates.js';
import { deepClone } from '../core/util.js';

export const STYLE_KEYS = ['colors', 'headingFont', 'bodyFont', 'fontSize', 'margins', 'lineSpacing', 'sectionSpacing', 'sidebarPosition'];

export function applyTemplate(resume, templateId, { reset = false } = {}) {
  const r = deepClone(resume);
  const d = r.design;
  const saved = { ...(d.saved || {}) };
  // Remember the style of the template we're leaving.
  saved[d.templateId] = Object.fromEntries(STYLE_KEYS.map((k) => [k, deepClone(d[k])]));
  const tpl = getTemplate(templateId);
  const restore = !reset && saved[tpl.id];
  const style = restore || {
    ...deepClone(tpl.defaults),
    sidebarPosition: tpl.defaultSidebar || 'left',
  };
  for (const k of STYLE_KEYS) if (style[k] !== undefined) d[k] = deepClone(style[k]);
  d.templateId = tpl.id;
  if (reset) delete saved[tpl.id];
  d.saved = saved;
  return r;
}
