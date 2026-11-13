# CareerLift Career Intelligence™

> Don’t Just Build a Resume. Build Your Next Opportunity.

A static, privacy-first resume improvement and career toolkit web app. Upload a PDF/DOCX/TXT resume (or start from scratch), improve the content with Achievement Detective™ Lite, design it with one of six templates, and download PDF, Word and text files. English, Spanish and Puerto Rico Spanish.

**Running cost: $0.** No backend, no database, no AI API. Everything runs in the browser; Netlify's free tier serves static files.

| Doc | What's in it |
| --- | --- |
| [TESTING.md](TESTING.md) | What was tested, results, what was **not** tested, manual device checklist |
| [LIMITATIONS.md](LIMITATIONS.md) | Known limitations and recommended next improvements |
| [MARKETING.md](MARKETING.md) | Positioning, pricing rationale, launch copy, claims to avoid |

## Quick start

```bash
cd careerlift
npm install
npm run dev          # http://localhost:5173  (landing: /, app: /app.html)
npm test             # 50 unit tests (parser, writer, export→re-import roundtrips)
npm run test:e2e     # 12 browser tests (Chromium; iPad/iPhone emulated)
npm run build        # production build in dist/
```

Visual review helpers: `node scripts/render-samples.mjs` (PDF+PNG of every template) and `node scripts/render-docx-samples.mjs` (DOCX, converted with LibreOffice when installed).

## Deploy to Netlify

The repository root already contains a different site (WPC Payment Intelligence), so CareerLift is deployed as a **separate Netlify site** from the `careerlift/` folder:

1. Netlify → **Add new site → Import an existing project** → pick this GitHub repo.
2. **Base directory:** `careerlift` · Build command and publish directory are read from `careerlift/netlify.toml` (`npm ci && npm run build`, `dist`).
3. Optional: **Site settings → Environment variables →** `VITE_PURCHASE_URL` = your checkout link (Stripe Payment Link, Lemon Squeezy or Gumroad). Without it, the landing page's buy button says "Try the launch preview" and opens the app.
4. Deploy. Then run through the manual checklist in TESTING.md on a real iPhone and iPad.

Manual alternative: `npm run build` and drag the `dist/` folder onto app.netlify.com/drop.

## Architecture

```
            ┌──────────── upload (browser only) ────────────┐
 PDF ─ pdf.js ┐                                               │
 DOCX ─ mammoth ┼─> lines ─> parse.js ─> ┌──────────────────┐  │
 TXT ─ decoder ┘                         │  Resume model    │<─┘  editor writes here
                                         │ (model/schema.js)│
                                         └──────┬───────────┘
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
            layout/engine.js            export/docx.js              export/txt.js
       (6 templates → positioned        (Word paragraphs, lists,     (plain text)
        text/rect/line ops, pages)       tables, embedded fonts)
             │              │
             ▼              ▼
      render/svg.js   export/pdf.js
      (live preview)  (pdf-lib, real text)
```

**Why the PDF matches the preview:** both are drawn from the *same* positioned layout. Text is measured with the exact pdf-lib font object that later draws the PDF, so line breaks are identical, and SVG (like PDF) positions text on its baseline. The e2e suite measures this: mean pixel difference between preview and PDF is ~1/255 for every template.

Key decisions (and why):

- **No html2canvas / screenshot PDFs.** They produce images: blurry, huge, unreadable by ATS. Our PDFs contain selectable text with embedded fonts.
- **Fonts are bundled TTFs (SIL OFL)** so preview, PDF and DOCX use the same typefaces on every device. EB Garamond is embedded unsubsetted because pdf-lib's subsetter corrupts it (caught visually; documented in `design/fonts.js`).
- **Letter-spacing capped at 0.08em.** Measured: above ~0.1em, pdf.js and pdftotext (and ATS tools built on them) read headings as "P R O F I L E".
- **Bullets are drawn as shapes**, not glyphs, so they never go missing in a font.
- **iOS downloads are two-step** (Create file → Download/Share). Safari requires `navigator.share()` inside the tap; generating a PDF first would break that.
- **Embedded editable data in PDFs is opt-in.** It lets users re-upload a CareerLift PDF losslessly, but PDF attachments can trip corporate email filters.
- **Premium AI later:** the writer is isolated in `src/achievement/`. An optional AI provider can implement the same `improveBullet()` / `buildStatement()` interface behind a server function without touching layout, preview or exports.

## Project layout

```
careerlift/
  index.html, app.html        landing page, application
  src/model/                  schema.js (document model), labels.js (EN/ES/PR headings)
  src/layout/                 engine.js, templates.js (6 templates), flow.js, text.js
  src/render/svg.js           preview renderer
  src/export/                 pdf.js, docx.js, txt.js, download.js (iOS-aware)
  src/import/                 extract.js (PDF/DOCX/TXT), parse.js (rules), index.js
  src/achievement/            writer.js (rules), questions.js (12 fields, EN/ES)
  src/toolkit/content.js      cover letter, messages, ATS, interview, STAR, LinkedIn...
  src/ui/                     app shell, store (localStorage), views/
  public/fonts/               7 OFL font families
  tests/unit, tests/e2e       Vitest + Playwright
  scripts/                    sample renderers, fixture builder, CSP test server
```
