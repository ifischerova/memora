const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scan } = require('../src/core/scanner');

let tmp;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memora-scan-')); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

function touch(p, bytes = 3) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.alloc(bytes));
}

test('finds photos and videos recursively, ignores other files', async () => {
  touch(path.join(tmp, 'a.jpg'));
  touch(path.join(tmp, 'sub', 'b.MP4'));        // case-insensitive
  touch(path.join(tmp, 'sub', 'c.HEIC'));
  touch(path.join(tmp, 'notes.txt'));            // ignored
  const found = await scan(tmp);
  const names = found.map(f => path.basename(f.path)).sort();
  assert.deepStrictEqual(names, ['a.jpg', 'b.MP4', 'c.HEIC']);
});

test('classifies kind and reports size', async () => {
  touch(path.join(tmp, 'a.jpg'), 10);
  touch(path.join(tmp, 'v.mov'), 20);
  const byName = Object.fromEntries((await scan(tmp)).map(f => [path.basename(f.path), f]));
  assert.strictEqual(byName['a.jpg'].kind, 'photo');
  assert.strictEqual(byName['a.jpg'].size, 10);
  assert.strictEqual(byName['v.mov'].kind, 'video');
});

test('skips the skipDir subtree', async () => {
  touch(path.join(tmp, 'keep.jpg'));
  touch(path.join(tmp, 'sorted', 'old.jpg'));
  const found = await scan(tmp, path.join(tmp, 'sorted'));
  const names = found.map(f => path.basename(f.path));
  assert.deepStrictEqual(names, ['keep.jpg']);
});
