// Unsubscribe link (/u/<token>).
// GET shows a confirm button (so corporate link scanners can't unsubscribe people by "clicking");
// POST unsubscribes, which also covers Gmail/Yahoo one-click (List-Unsubscribe-Post).
import { getCrmStore } from '../crm-lib/store.mjs';
import { unsubscribe, readToken, config as crmConfig } from '../crm-lib/core.mjs';

const page = (title, inner) => new Response(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#f3f6fb;color:#172033;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
.c{background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:28px;max-width:420px;text-align:center}
button{background:#071426;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;cursor:pointer}</style></head>
<body><div class="c">${inner}</div></body></html>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
);

export default async (req) => {
  const token = new URL(req.url).pathname.split('/')[2] || '';
  const name = crmConfig().senderName.replace(/[<>&"]/g, '');
  if (!readToken(token)) return page('Invalid link', '<h2>This link is invalid</h2><p>Reply to the email and ask to be removed, and we will take care of it.</p>');
  if (req.method === 'POST') {
    const ok = await unsubscribe(await getCrmStore(), token);
    return page('Unsubscribed', ok ? `<h2>You're unsubscribed</h2><p>You won't receive more emails from ${name}.</p>` : '<h2>Already removed</h2>');
  }
  return page('Unsubscribe', `<h2>Unsubscribe</h2><p>Stop receiving emails from ${name}?</p><form method="post"><button type="submit">Yes, unsubscribe me</button></form>`);
};

export const config = { path: '/u/*' };
