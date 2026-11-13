import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const FIX = 'tests/fixtures/files';

export function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cl-e2e-'));
}

export async function freshStart(page) {
  await page.goto('/app.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/app.html#start');
}

export async function upload(page, file) {
  await page.setInputFiles('[data-testid=resume-file]', file);
  await page.waitForSelector('[data-testid=review-continue]', { timeout: 30_000 });
}

export function getState(page) {
  return page.evaluate(() => window.__careerlift.state);
}

/** Create + save a file from the Download step; returns saved path. */
export async function downloadKind(page, kind, dir) {
  await page.click(`[data-testid=create-${kind}]`);
  const save = page.locator(`[data-testid=save-${kind}]`);
  await save.waitFor({ timeout: 30_000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), save.click()]);
  const p = path.join(dir, dl.suggestedFilename());
  await dl.saveAs(p);
  return p;
}

export function pdfInfo(file) {
  const out = execFileSync('pdfinfo', [file]).toString();
  const pages = Number(/Pages:\s+(\d+)/.exec(out)[1]);
  const [, w, h] = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(out);
  return { pages, width: Number(w), height: Number(h), raw: out };
}

export function pdfText(file) {
  return execFileSync('pdftotext', [file, '-']).toString();
}

export function pdfToPng(file, outBase, widthPx) {
  execFileSync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-scale-to-x', String(widthPx), '-scale-to-y', '-1', file, outBase]);
  const dir = path.dirname(outBase);
  const name = fs.readdirSync(dir).find((f) => f.startsWith(path.basename(outBase)) && f.endsWith('.png'));
  return path.join(dir, name);
}

/** Python/Pillow helpers (installed in this environment). */
export function py(script, ...args) {
  return execFileSync('python3', ['-I', '-c', script, ...args]).toString().trim();
}

export function colorFraction(png, hex, tol = 40) {
  return Number(py(`
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
h = sys.argv[2].lstrip('#'); t = int(sys.argv[3])
r,g,b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
px = list(im.getdata()) if not hasattr(im, 'get_flattened_data') else list(im.get_flattened_data()); n = sum(1 for p in px if abs(p[0]-r)<t and abs(p[1]-g)<t and abs(p[2]-b)<t)
print(n/len(px))`, png, hex, String(tol)));
}

/** Mean absolute difference (0-255) between two images after resizing to a common small size. */
export function imageDiff(a, b) {
  return Number(py(`
import sys
from PIL import Image, ImageChops, ImageStat
A = Image.open(sys.argv[1]).convert('L'); B = Image.open(sys.argv[2]).convert('L')
size = (200, int(200 * A.height / A.width))
A = A.resize(size, Image.LANCZOS); B = B.resize(size, Image.LANCZOS)
print(ImageStat.Stat(ImageChops.difference(A, B)).mean[0])`, a, b));
}

export function unzipText(file, member) {
  return execFileSync('unzip', ['-p', file, member]).toString();
}
