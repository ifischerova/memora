const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validatePaths } = require('../src/core/validator');

let tmp;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memora-val-')); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

test('missing source path -> noSource', async () => {
  const r = await validatePaths('', path.join(tmp, 'dest'));
  assert.strictEqual(r.code, 'noSource');
  assert.strictEqual(r.ok, false);
});

test('missing dest path -> noDest', async () => {
  const r = await validatePaths(tmp, '');
  assert.strictEqual(r.code, 'noDest');
});

test('non-existent source -> sourceMissing', async () => {
  const r = await validatePaths(path.join(tmp, 'ghost'), tmp);
  assert.strictEqual(r.code, 'sourceMissing');
});

test('same folder -> sameFolder', async () => {
  const r = await validatePaths(tmp, tmp);
  assert.strictEqual(r.code, 'sameFolder');
});

test('valid distinct folders -> ok with no warnings', async () => {
  const src = path.join(tmp, 'src'); const dst = path.join(tmp, 'dst');
  fs.mkdirSync(src); fs.mkdirSync(dst);
  const r = await validatePaths(src, dst);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.code, null);
  assert.deepStrictEqual(r.warnings, []);
});

test('dest inside source -> ok but warns destInsideSource', async () => {
  const src = path.join(tmp, 'src'); const dst = path.join(src, 'sorted');
  fs.mkdirSync(src); fs.mkdirSync(dst);
  const r = await validatePaths(src, dst);
  assert.strictEqual(r.ok, true);
  assert.ok(r.warnings.includes('destInsideSource'));
});
