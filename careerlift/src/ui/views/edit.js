import { h, clear, field, button, nid } from '../dom.js';
import { state, updateResume } from '../store.js';
import { t, LANGS } from '../../i18n/strings.js';
import { emptyExperience, emptyBullet, emptyEducation, emptyCertification, emptyCustomSection, normalizeOrder } from '../../model/schema.js';
import { mountPreview } from '../preview.js';

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

export function renderEdit(root) {
  const r = state.resume;
  const flags = state.importReport?.flags || {};
  const set = (fn) => updateResume(fn);

  const form = h('div', { class: 'edit-form' });
  const side = h('aside', { class: 'edit-preview', 'aria-label': t('edit.livePreview') }, h('h2', { class: 'sr-only' }, t('edit.livePreview')));
  const previewHost = h('div');
  side.appendChild(previewHost);

  root.append(
    h('header', { class: 'view-head' }, h('h1', {}, t('edit.title')), h('p', { class: 'lead' }, t('edit.subtitle'))),
    h('div', { class: 'edit-layout' }, form, side),
  );

  // Resume language
  const langId = nid();
  form.appendChild(h('div', { class: 'card' },
    h('div', { class: 'field' }, h('label', { for: langId }, t('edit.resumeLang')),
      h('select', { id: langId, 'data-testid': 'resume-lang', onchange: (e) => set((x) => { x.meta.language = e.target.value; }) },
        LANGS.map((l) => h('option', { value: l.id, selected: r.meta.language === l.id }, l.label))),
      h('small', { class: 'hint' }, t('edit.resumeLangHint')))));

  // Contact
  const c = r.contact;
  const cf = (key, label, opts = {}) => field({ label, value: c[key], onInput: (v) => set((x) => { x.contact[key] = v; }), testid: `contact-${key}`, ...opts });
  form.appendChild(section(t('edit.contact'), true, h('div', { class: 'grid-2' },
    cf('fullName', t('edit.fullName'), { autocomplete: 'name', flag: !c.fullName && state.importReport ? t('edit.flag') : null }),
    cf('headline', t('edit.headline'), { hint: t('edit.headlineHint') }),
    cf('email', t('edit.email'), { type: 'email', autocomplete: 'email', inputmode: 'email', flag: !c.email && state.importReport ? t('edit.flag') : null }),
    cf('phone', t('edit.phone'), { type: 'tel', autocomplete: 'tel', inputmode: 'tel' }),
    cf('location', t('edit.location'), { autocomplete: 'address-level2' }),
    cf('linkedin', t('edit.linkedin'), { inputmode: 'url' }),
    cf('website', t('edit.website'), { inputmode: 'url' }),
  )));

  // Summary
  form.appendChild(section(t('edit.summary'), true,
    field({ label: t('edit.summary'), value: r.summary, multiline: true, rows: 5, hint: t('edit.summaryHint'), onInput: (v) => set((x) => { x.summary = v; }), testid: 'summary' })));

  // Experience
  const expHost = h('div', { 'data-testid': 'experience-list' });
  const renderExp = () => {
    clear(expHost);
    state.resume.experience.forEach((e, i) => {
      const fl = flags[e.id] || [];
      const bulletsHost = h('div', { class: 'bullets' });
      const renderBullets = () => {
        clear(bulletsHost);
        e.bullets.forEach((b, bi) => {
          const id = nid('b');
          const ta = h('textarea', { id, rows: 2, 'aria-label': `${t('edit.achievements')} ${bi + 1}`, 'data-testid': 'bullet-input', oninput: (ev) => set(() => { b.text = ev.target.value; }) });
          ta.value = b.text;
          bulletsHost.appendChild(h('div', { class: 'bullet-row' },
            h('span', { class: 'bullet-dot', 'aria-hidden': 'true' }, '•'), ta,
            h('div', { class: 'row-actions' },
              button('', () => { set(() => move(e.bullets, bi, -1)); renderBullets(); }, { title: t('edit.moveUp'), icon: '↑', small: true, disabled: bi === 0 }),
              button('', () => { set(() => move(e.bullets, bi, 1)); renderBullets(); }, { title: t('edit.moveDown'), icon: '↓', small: true, disabled: bi === e.bullets.length - 1 }),
              button('', () => { set(() => e.bullets.splice(bi, 1)); renderBullets(); }, { title: t('edit.remove'), icon: '✕', small: true }))));
        });
        bulletsHost.appendChild(button(t('edit.addBullet'), () => {
          set(() => e.bullets.push(emptyBullet('')));
          renderBullets();
          bulletsHost.querySelectorAll('textarea')[e.bullets.length - 1]?.focus();
        }, { icon: '+', small: true, testid: 'add-bullet' }));
      };
      renderBullets();
      const ef = (key, label, opts = {}) => field({ label, value: e[key], onInput: (v) => set(() => { e[key] = v; }), flag: fl.includes(key === 'startDate' ? 'dates' : key) ? t('edit.flag') : null, ...opts });
      const curId = nid();
      const endField = ef('endDate', t('edit.end'), { placeholder: t('edit.datePh') });
      endField.querySelector('input').disabled = e.current;
      expHost.appendChild(h('div', { class: 'entry card-inner', 'data-testid': 'job' },
        h('div', { class: 'entry-head' },
          h('strong', {}, e.title || e.company || t('edit.untitledJob')),
          h('div', { class: 'row-actions' },
            button('', () => { set((x) => move(x.experience, i, -1)); renderExp(); }, { title: t('edit.moveUp'), icon: '↑', small: true, disabled: i === 0 }),
            button('', () => { set((x) => move(x.experience, i, 1)); renderExp(); }, { title: t('edit.moveDown'), icon: '↓', small: true, disabled: i === state.resume.experience.length - 1 }),
            button('', () => { if (window.confirm(t('edit.confirmDelete'))) { set((x) => x.experience.splice(i, 1)); renderExp(); } }, { title: t('edit.deleteJob'), icon: '🗑', small: true }))),
        h('div', { class: 'grid-2' },
          ef('title', t('edit.jobTitle'), { testid: 'job-title' }), ef('company', t('edit.company'), { testid: 'job-company' }),
          ef('location', t('edit.jobLocation')),
          h('div', { class: 'grid-2 tight' }, ef('startDate', t('edit.start'), { placeholder: t('edit.datePh') }), endField)),
        h('label', { class: 'check', for: curId },
          h('input', { type: 'checkbox', id: curId, checked: e.current, onchange: (ev) => { set(() => { e.current = ev.target.checked; }); endField.querySelector('input').disabled = ev.target.checked; } }),
          t('edit.current')),
        h('h4', {}, t('edit.achievements')), bulletsHost));
    });
    expHost.appendChild(button(t('edit.addJob'), () => {
      set((x) => x.experience.push(emptyExperience({ bullets: [emptyBullet('')] })));
      renderExp();
    }, { icon: '+', kind: 'primary', testid: 'add-job' }));
  };
  renderExp();
  form.appendChild(section(t('edit.experience'), true, expHost));

  // Education
  const eduHost = h('div');
  const renderEdu = () => {
    clear(eduHost);
    state.resume.education.forEach((e, i) => {
      const ef = (key, label, opts = {}) => field({ label, value: e[key], onInput: (v) => set(() => { e[key] = v; }), ...opts });
      eduHost.appendChild(h('div', { class: 'entry card-inner' },
        h('div', { class: 'entry-head' }, h('strong', {}, e.degree || e.school || '—'),
          button('', () => { set((x) => x.education.splice(i, 1)); renderEdu(); }, { title: t('edit.remove'), icon: '🗑', small: true })),
        h('div', { class: 'grid-2' }, ef('degree', t('edit.degree')), ef('school', t('edit.school')), ef('location', t('edit.jobLocation')),
          h('div', { class: 'grid-2 tight' }, ef('startDate', t('edit.start')), ef('endDate', t('edit.end')))),
        ef('details', t('edit.details'))));
    });
    eduHost.appendChild(button(t('edit.addEducation'), () => { set((x) => x.education.push(emptyEducation())); renderEdu(); }, { icon: '+', small: true }));
  };
  renderEdu();
  form.appendChild(section(t('edit.education'), false, eduHost));

  // Certifications
  const certHost = h('div');
  const renderCert = () => {
    clear(certHost);
    state.resume.certifications.forEach((cc, i) => {
      const ef = (key, label) => field({ label, value: cc[key], onInput: (v) => set(() => { cc[key] = v; }) });
      certHost.appendChild(h('div', { class: 'entry card-inner grid-cert' }, ef('name', t('edit.certName')), ef('issuer', t('edit.issuer')), ef('date', t('edit.date')),
        button('', () => { set((x) => x.certifications.splice(i, 1)); renderCert(); }, { title: t('edit.remove'), icon: '🗑', small: true })));
    });
    certHost.appendChild(button(t('edit.addCert'), () => { set((x) => x.certifications.push(emptyCertification())); renderCert(); }, { icon: '+', small: true }));
  };
  renderCert();
  form.appendChild(section(t('edit.certifications'), false, certHost));

  // Skills & languages (one per line or comma separated)
  const listField = (key, label, hint) => field({
    label, hint, multiline: true, rows: 4, value: r[key].join('\n'), testid: `${key}-input`,
    onInput: (v) => set((x) => { x[key] = v.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean); }),
  });
  form.appendChild(section(t('edit.skills'), true, listField('skills', t('edit.skills'), t('edit.skillsHint'))));
  form.appendChild(section(t('edit.languages'), false, listField('languages', t('edit.languages'), t('edit.languagesHint'))));

  // Custom sections
  const custHost = h('div');
  const renderCust = () => {
    clear(custHost);
    state.resume.custom.forEach((s, i) => {
      custHost.appendChild(h('div', { class: 'entry card-inner' },
        h('div', { class: 'entry-head' }, h('strong', {}, s.title || '—'),
          button('', () => { set((x) => { x.custom.splice(i, 1); x.design.sectionOrder = normalizeOrder(x.design.sectionOrder, x.custom); }); renderCust(); }, { title: t('edit.remove'), icon: '🗑', small: true })),
        field({ label: t('edit.sectionTitle'), value: s.title, onInput: (v) => set(() => { s.title = v; }) }),
        field({ label: t('edit.items'), hint: t('edit.itemsHint'), multiline: true, rows: 4, value: s.items.join('\n'), onInput: (v) => set(() => { s.items = v.split('\n').map((x) => x.trim()).filter(Boolean); }) })));
    });
    custHost.appendChild(button(t('edit.addSection'), () => {
      set((x) => { const sec = emptyCustomSection(); x.custom.push(sec); x.design.sectionOrder = normalizeOrder([...x.design.sectionOrder, `custom:${sec.id}`], x.custom); });
      renderCust();
    }, { icon: '+', small: true }));
  };
  renderCust();
  form.appendChild(section(t('edit.custom'), state.resume.custom.length > 0, custHost));

  // Live preview only where there is room for it.
  let unmount = null;
  const mq = window.matchMedia('(min-width: 1180px)');
  const sync = () => {
    if (mq.matches && !unmount) unmount = mountPreview(previewHost, { compact: true });
    if (!mq.matches && unmount) { unmount(); unmount = null; clear(previewHost); }
  };
  sync();
  mq.addEventListener?.('change', sync);
  return () => { unmount?.(); mq.removeEventListener?.('change', sync); };
}

function section(title, open, ...content) {
  return h('details', { class: 'card section', open }, h('summary', {}, h('h2', {}, title)), h('div', { class: 'section-body' }, content));
}
