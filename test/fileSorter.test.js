const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { placeFile } = require('../src/core/fileSorter');

let tmp, src, dest;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memora-sort-'));
  src = path.join(tmp, 'src'); dest = path.join(tmp, 'dest', '2024', '2024-03');
  fs.mkdirSync(src, { recursive: true });
});
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

function makeFile(name, content) {
  const p = path.join(src, name);
  fs.writeFileSync(p, content);
  return p;
}

test('copy places file and leaves source intact', async () => {
  const p = makeFile('IMG_1.jpg', 'hello');
  const r = await placeFile(p, dest, 'copy');
  assert.strictEqual(r.action, 'sorted');
  assert.ok(fs.existsSync(p), 'source should remain after copy');
  assert.strictEqual(fs.readFileSync(r.finalPath, 'utf8'), 'hello');
});

test('move relocates file and removes source', async () => {
  const p = makeFile('IMG_2.jpg', 'world');
  const r = await placeFile(p, dest, 'move');
  assert.strictEqual(r.action, 'sorted');
  assert.ok(!fs.existsSync(p), 'source should be gone after move');
  assert.strictEqual(fs.readFileSync(r.finalPath, 'utf8'), 'world');
});

test('identical file already present is skipped', async () => {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'IMG_3.jpg'), 'same');
  const p = makeFile('IMG_3.jpg', 'same'); // same size + name
  const r = await placeFile(p, dest, 'copy');
  assert.strictEqual(r.action, 'skipped');
});

test('same name different size gets a counter suffix', async () => {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'IMG_4.jpg'), 'AAAAA'); // 5 bytes
  const p = makeFile('IMG_4.jpg', 'BB');                   // 2 bytes
  const r = await placeFile(p, dest, 'copy');
  assert.strictEqual(r.action, 'sorted');
  assert.strictEqual(path.basename(r.finalPath), 'IMG_4 (2).jpg');
});
