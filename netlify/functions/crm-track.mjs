// Open pixel (/t/o/<token>) and click redirect (/t/c/<token>).
// Tokens are HMAC-signed, so the redirect only ever goes to links that were in an email we sent.
import { getCrmStore } from '../crm-lib/store.mjs';
import { recordOpen, recordClick } from '../crm-lib/core.mjs';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const noCache = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private', Pragma: 'no-cache' };

export default async (req) => {
  const url = new URL(req.url);
  const [, , kind, token] = url.pathname.split('/');
  const ua = req.headers.get('user-agent') || '';
  let store;
  try { store = await getCrmStore(); } catch (e) { console.error(e); }

  if (kind === 'o') {
    try { if (store) await recordOpen(store, token, ua); } catch (e) { console.error(e); }
    return new Response(GIF, { status: 200, headers: { 'Content-Type': 'image/gif', ...noCache } });
  }
  if (kind === 'c') {
    let target = null;
    try { if (store) target = await recordClick(store, token, ua); } catch (e) { console.error(e); }
    if (target) return new Response(null, { status: 302, headers: { Location: target, ...noCache } });
    return new Response('This link is invalid or has expired.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Not found', { status: 404 });
};

export const config = { path: ['/t/o/*', '/t/c/*'] };
