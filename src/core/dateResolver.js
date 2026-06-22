'use strict';
const realExifr = require('exifr');
const realFs = require('node:fs/promises');

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

async function resolveDate(filePath, deps = {}) {
  const exifrMod = deps.exifrMod || realExifr;
  const fsMod = deps.fsMod || realFs;

  try {
    const parsed = await exifrMod.parse(filePath, ['DateTimeOriginal', 'CreateDate']);
    if (parsed) {
      const candidate = parsed.DateTimeOriginal || parsed.CreateDate;
      if (isValidDate(candidate)) return { date: candidate, usedFallback: false };
    }
  } catch {
    // not an image, unreadable EXIF, or unsupported format — fall through
  }

  const stat = await fsMod.stat(filePath);
  return { date: stat.mtime, usedFallback: true };
}

module.exports = { resolveDate };
