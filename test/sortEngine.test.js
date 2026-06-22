const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runSort, preflight } = require('../src/core/sortEngine');

let tmp, src, dest;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memora-engine-'));
  src = path.join(tmp, 'src'); dest = path.join(tmp, 'dest');
  fs.mkdirSync(src, { recursive: true });
  fs.mkdirSync(dest, { recursive: true });
});
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

// Files with no EXIF -> dateResolver uses mtime; we set mtime explicitly.
function media(name, isoDate, bytes = 4) {
  const p = path.join(src, name);
  fs.writeFileSync(p, Buffer.alloc(bytes));
  const t = new Date(isoDate);
  fs.utimesSync(p, t, t);
  return p;
}

test('sorts files into YYYY/YYYY-MM and reports fresh months', async () => {
  media('a.jpg', '2024-03-10T12:00:00', 4);
  media('b.jpg', '2024-03-20T12:00:00', 5);
  media('c.jpg', '2024-04-01T12:00:00', 6);
  const { ok, summary } = await runSort({ source: src, dest, mode: 'copy' });
  assert.strictEqual(ok, true);
  assert.strictEqual(summary.sorted, 3);
  assert.strictEqual(summary.newMonths, 2);       // 2024-03 and 2024-04
  assert.strictEqual(summary.existingMonths, 0);
  assert.ok(fs.existsSync(path.join(dest, '2024', '2024-03', 'a.jpg')));
  assert.ok(fs.existsSync(path.join(dest, '2024', '2024-04', 'c.jpg')));
});

test('all files use fallback date when no EXIF -> fallbackDate counted', async () => {
  media('a.jpg', '2024-03-10T12:00:00');
  const { summary } = await runSort({ source: src, dest, mode: 'copy' });
  assert.strictEqual(summary.fallbackDate, 1);
});

test('second run from another source merges into existing month', async () => {
  media('a.jpg', '2024-03-10T12:00:00');
  await runSort({ source: src, dest, mode: 'copy' });

  const src2 = path.join(tmp, 'src2');
  fs.mkdirSync(src2);
  const p = path.join(src2, 'screenshot.png');
  fs.writeFileSync(p, Buffer.alloc(7));
  const t = new Date('2024-03-25T09:00:00'); fs.utimesSync(p, t, t);

  const { summary } = await runSort({ source: src2, dest, mode: 'copy' });
  assert.strictEqual(summary.sorted, 1);
  assert.strictEqual(summary.existingMonths, 1); // 2024-03 already existed
  assert.strictEqual(summary.newMonths, 0);
});

test('move empties the source', async () => {
  media('a.jpg', '2024-03-10T12:00:00');
  const { summary } = await runSort({ source: src, dest, mode: 'move' });
  assert.strictEqual(summary.moved, 1);
  assert.strictEqual(summary.sourceEmptied, true);
  assert.strictEqual(fs.readdirSync(src).length, 0);
});

test('progress callback is invoked with processed/total', async () => {
  media('a.jpg', '2024-03-10T12:00:00');
  media('b.jpg', '2024-03-11T12:00:00');
  const seen = [];
  await runSort({ source: src, dest, mode: 'copy', onProgress: (p) => seen.push(p) });
  assert.strictEqual(seen.at(-1).processed, 2);
  assert.strictEqual(seen.at(-1).total, 2);
});

test('preflight reports counts and ok for a valid folder', async () => {
  media('a.jpg', '2024-03-10T12:00:00');
  media('v.mp4', '2024-03-10T12:00:00');
  const r = await preflight(src, dest, { statfs: async () => ({ bavail: 1e9, bsize: 1 }) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.photos, 1);
  assert.strictEqual(r.videos, 1);
});

test('preflight flags empty folder as noMedia', async () => {
  const r = await preflight(src, dest, { statfs: async () => ({ bavail: 1e9, bsize: 1 }) });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'noMedia');
});
