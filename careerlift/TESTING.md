# Testing report

Date of last run: 2026-11-14. Environment: Linux, Node 22, Chromium (Playwright 1.63), LibreOffice + poppler for file verification.

## Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Unit tests (65) | ✅ Passed | `npm test` |
| Browser tests, desktop Chromium (10) | ✅ Passed | `npm run test:e2e` |
| Emulated iPad + iPhone in Chromium (6) | ✅ Passed | same; **emulation only** |
| Same browser suite under production CSP headers | ✅ Passed | `scripts/serve-with-headers.mjs` + `BASE_URL=http://localhost:4174 npm run test:e2e -- --project=desktop-chromium` |
| DOCX opens and renders (LibreOffice) — all 6 templates | ✅ Passed (visual review) | `scripts/render-docx-samples.mjs` |
| Real Safari / WebKit | ❌ **Not tested** | No WebKit or Apple device available here |
| Real iPhone / iPad / Android devices | ❌ **Not tested** | Use the manual checklist below |
| Microsoft Word (Windows/Mac), Google Docs, Pages | ❌ **Not tested** | Only LibreOffice was available |
| Firefox, Edge | ❌ Not tested | Edge is Chromium-based; low risk but unverified |
| Real ATS systems (Workday, Taleo, iCIMS…) | ❌ Not tested | Proxy only: pdf.js and pdftotext extraction |

**Do not mark the product ready for sale until the ❌ rows marked "real device" and "Microsoft Word" are completed.**

## What the automated tests prove

**Upload → Extract**
- Third-party Word resume, the same resume exported to PDF by LibreOffice, and a Puerto Rico Spanish TXT saved in Windows-1252: name, email, phone, location, every job (title, employer, dates, current flag), every bullet, education, certifications, skills, languages and extra sections are extracted, with zero unplaced lines.
- Scanned (image-only) PDF and legacy `.doc` show clear, specific error messages.

**No lost achievements (previous problem)**
- For all 6 templates × PDF and DOCX, plus TXT: export → re-upload → every original bullet comes back verbatim (13 roundtrip tests). Sidebar templates (Modern, Corporate) wrap skills in a narrow column; there the test checks no *word* is lost rather than exact field boundaries — see LIMITATIONS.md.
- In the browser journey: a bullet accepted in Achievement Detective and a statement generated from answers both appear in the downloaded PDF, DOCX and TXT.

**Edit → Improve**
- Rewrite rules (EN/ES): weak openers removed, tense matched to current/past job, Spanish preterite conjugation incl. spelling changes.
- Never fabricates: a property test fills every question in every profession with text-only answers and asserts the generated statement contains **no numbers**; "helped" is never upgraded to "led/managed".

**Customize → Preview → Download (previous problems)**
- All 6 templates produce different previews *and* different PDFs.
- Colors: for each template a palette change is found in the preview SVG **and** as actual pixels in the rendered downloaded PDF.
- Modern template with custom hex color, Raleway font, A4, right sidebar and a hidden section: the PDF is A4 (595×842 pt), contains the color (pixel check), excludes the hidden section; the DOCX contains the color, font name, A4 page width and embedded fonts.
- **Preview vs PDF:** first page of the preview screenshot compared with the downloaded PDF rendered at the same width; mean pixel difference (0–255): classic 1.19, executive 1.03, modern 1.04, minimal 0.85, creative 1.09, corporate 1.10 (threshold 3).
- Progress survives a page reload (localStorage); backup JSON downloads.

**Interview Readiness**
- Questions are generated from the resume: its metric lines, why-leaving for the current employer, a career-change question when the target role differs, gaps (between jobs and since the last job, with correct lengths in EN/ES), jobs shorter than 12 months, bilingual verification when both languages are listed. Every question and playbook exists in English and Spanish.
- Playbook scripts never contain numbers the user didn't type and drop blank optional sentences (property test over all 11 playbooks × 2 languages).
- Browser: target role → career-change question appears; answering raises the readiness score; "Build my answer" opens the right playbook; a Spanish script is generated; the practice timer counts down; the bilingual drill prompts the switch and is counted; the prep-sheet PDF contains the questions, answers and scripts; Spanish (PR) interface shows Spanish questions.

**Mobile (emulated)**
- iPhone 13 and iPad (gen 7) profiles: upload, template switch, palette, preview pane toggle, PDF download; no horizontal scrolling on any step; buttons/controls ≥ 38px (most 44px).

## Manual device checklist (please run before launch)

Use a resume of your own plus `tests/fixtures/files/plain.pdf`. Record pass/fail per device.

Devices: ☐ iPad Safari ☐ iPad Chrome ☐ iPhone Safari ☐ iPhone Chrome ☐ Android Chrome ☐ Windows Chrome/Edge ☐ Mac Safari ☐ Mac Chrome

1. ☐ Landing page loads, ES/EN toggle works, "Start building" opens the app.
2. ☐ Upload PDF from Files app / Downloads; review shows correct name and job count.
3. ☐ Upload DOCX from iCloud Drive / Google Drive / OneDrive (iOS "Browse").
4. ☐ Edit: typing in fields does not zoom the page (iOS) and the keyboard doesn't hide the field.
5. ☐ Improve: Accept / Keep original / Discover → Add to job all work with touch.
6. ☐ Design: tap each of the 6 templates; preview changes each time.
7. ☐ Color: palette swatch AND the native color picker update the preview immediately (iPad Safari color picker especially).
8. ☐ Font, text size, margins, page size, sidebar side, section up/down/visibility each update the preview.
9. ☐ Download PDF: "Create file" → "Download" saves; "Share / Save to Files" opens the share sheet and saves to Files. Open the saved PDF: colors, fonts and layout match the preview.
10. ☐ Download DOCX → open in **Microsoft Word** (Windows and Mac) and **Word for iOS**: layout, colors, fonts, bullets; edit a line and save.
11. ☐ Open DOCX in Google Docs and Apple Pages: note differences (expected: table-based sidebars may shift slightly).
12. ☐ Download TXT → paste into an online application form.
13. ☐ Toolkit: cover letter PDF/DOCX download, copy buttons, ATS keyword matcher.
13b. ☐ Interview Readiness: set a target role, answer a question, open a playbook from it, run the 90-second bilingual drill with the screen locked/unlocked (iOS pauses timers in background tabs), download the prep sheet.
14. ☐ Close the browser, reopen: work is still there. Download backup JSON, restore it on another device.
15. ☐ Spanish (Puerto Rico): interface text, resume headings (“Destrezas”, “Preparación Académica”), downloaded PDF accents (á é í ó ú ñ ¿ ¡).
16. ☐ Upload a real **Workday/LinkedIn-generated** PDF and a **Canva** PDF; note extraction quality.
17. ☐ Upload the CareerLift PDF to a free ATS checker or a test job posting on Indeed; confirm fields parse.
