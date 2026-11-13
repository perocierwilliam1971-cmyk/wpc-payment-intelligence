// Serves dist/ with the same security headers as netlify.toml, so the e2e
// suite can prove the Content-Security-Policy doesn't break the app.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const toml = fs.readFileSync('netlify.toml', 'utf8');
const csp = /Content-Security-Policy = "([^"]+)"/.exec(toml)[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json', '.txt': 'text/plain' };
const port = Number(process.argv[2] || 4174);
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join('dist', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, () => console.log(`serving dist with CSP on ${port}`));
