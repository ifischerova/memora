const { test } = require('node:test');
const assert = require('node:assert');
const { resolveDate } = require('../src/core/dateResolver');

const fakeFs = (mtime) => ({ stat: async () => ({ mtime }) });

test('uses EXIF DateTimeOriginal when present', async () => {
  const exif = { parse: async () => ({ DateTimeOriginal: new Date(2022, 5, 1) }) };
  const r = await resolveDate('x.jpg', { exifrMod: exif, fsMod: fakeFs(new Date(2000, 0, 1)) });
  assert.strictEqual(r.usedFallback, false);
  assert.strictEqual(r.date.getFullYear(), 2022);
});

test('falls back to CreateDate when DateTimeOriginal missing', async () => {
  const exif = { parse: async () => ({ CreateDate: new Date(2021, 0, 1) }) };
  const r = await resolveDate('x.jpg', { exifrMod: exif, fsMod: fakeFs(new Date(2000, 0, 1)) });
  assert.strictEqual(r.usedFallback, false);
  assert.strictEqual(r.date.getFullYear(), 2021);
});

test('falls back to mtime when no EXIF dates', async () => {
  const exif = { parse: async () => ({}) };
  const r = await resolveDate('shot.png', { exifrMod: exif, fsMod: fakeFs(new Date(2019, 3, 9)) });
  assert.strictEqual(r.usedFallback, true);
  assert.strictEqual(r.date.getFullYear(), 2019);
});

test('falls back to mtime when exifr throws', async () => {
  const exif = { parse: async () => { throw new Error('not an image'); } };
  const r = await resolveDate('clip.mp4', { exifrMod: exif, fsMod: fakeFs(new Date(2018, 1, 2)) });
  assert.strictEqual(r.usedFallback, true);
  assert.strictEqual(r.date.getFullYear(), 2018);
});
