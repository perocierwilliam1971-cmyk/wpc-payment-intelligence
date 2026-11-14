# Known limitations & next improvements

## Limitations (current version)

**Not verified on real devices or apps** — see TESTING.md. Safari/WebKit, real iOS/Android hardware, Microsoft Word, Google Docs and Pages have not been tested. This is the biggest open risk.

**Import**
- No OCR: scanned/photographed resumes can't be read (clear message shown). Free option later: tesseract.js (~10 MB download, slow on phones).
- Legacy `.doc` and Apple `.pages` are not supported (instructions shown to convert).
- Parsing is rule-based. Unusual layouts (text boxes, tables used for layout, icons instead of labels, three columns) will put some lines in the wrong field. Nothing is dropped: unplaced lines go into "Additional Information" for review.
- In narrow sidebar columns, wrapped lines that start with a capital letter can be split into separate items (e.g. a long skill split in two). Content is preserved; boundaries may need a manual fix.

**Design / exports**
- DOCX is close to, not identical with, the PDF: Word has no positioned layout, so sidebars are table cells (not full-bleed), the Creative timeline becomes a bullet marker, and the Executive accent bar is a character. Google Docs ignores embedded fonts and substitutes.
- DOCX with embedded fonts is ~0.4–1 MB. Users can turn embedding off.
- PDFs are not tagged (PDF/UA). Text is selectable and in reading order, but screen-reader structure tags are missing.
- Letter-spacing is deliberately limited for ATS safety, so headings are a little tighter than some designers would choose.
- Seven font families only (all open-source).
- No photo support (intentional: photos are discouraged on US resumes and can trigger bias); some international users will want it.

**Platform**
- Data lives in browser storage. Private browsing, clearing site data, or Safari's 7-day inactivity rule can erase it. The app offers JSON backups but doesn't force them.
- The app JavaScript is ~580 KB gzipped (PDF engine, font parser, PDF reader). First load on slow mobile connections takes a few seconds; afterwards it's cached.
- **No payment or license enforcement.** A static site can't protect paid features: anyone can open `app.html`. See "Monetization" below.

**Interview Readiness**
- Questions are predicted by rules (metrics, dates, titles, languages), not by understanding the job. They cover the predictable pressure points, not every question an employer could ask.
- Gap detection depends on parseable dates; "Summer 2019" or missing dates are skipped.
- No audio recording or speech feedback yet (deliberately: recording on iPhone Safari is fragile and needs real-device testing). Practice is spoken aloud with a timer.
- Salary and illegal-question guidance is general information, not legal advice; laws differ by state and change (Puerto Rico Ley 16-2017 is cited — verify before launch).
- Answers are stored only on the device, like the resume.

**Content**
- Achievement Detective is rule-based: it can rephrase and structure, not understand. Grammar of generated statements depends on how users fill blanks.
- Spanish verb conjugation covers common regular/irregular verbs, not all.
- Toolkit content is general guidance, not legal or career-counseling advice.

## Recommended next steps (priority order)

1. **Real-device QA** using the TESTING.md checklist; fix anything found in Safari/Word.
2. **Payment:** use a hosted checkout (Stripe Payment Link / Lemon Squeezy / Gumroad) that delivers an access link or license key; add a small Netlify Function to verify keys. Accept that determined users can bypass client-side checks — price is low enough that most won't.
3. Tagged/accessible PDFs (structure tree) — useful for public-sector applicants.
4. OCR for scanned resumes as an optional, lazy-loaded module.
5. Optional audio recording for mock interviews (MediaRecorder, kept on-device) once tested on real iPhones.
6. Optional premium AI (behind a Netlify Function, user-consented, never on by default), using the existing `improveBullet()` interface.
7. Job-tailoring mode: duplicate the resume per application, using the keyword matcher.
8. Code-split the PDF reader so the first page loads faster.
