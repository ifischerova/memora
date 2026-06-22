'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function statOrNull(p) {
  try { return await fs.stat(p); } catch { return null; }
}

// Decide the final target path inside destMonthDir for srcPath.
// Returns { skip: true } if an identical file (same name+size) already exists.
async function resolveTarget(srcPath, destMonthDir, srcSize) {
  const base = path.basename(srcPath);
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);

  let candidate = path.join(destMonthDir, base);
  let existing = await statOrNull(candidate);
  if (!existing) return { target: candidate, skip: false };
  if (existing.size === srcSize) return { target: candidate, skip: true };

  let n = 2;
  for (;;) {
    candidate = path.join(destMonthDir, `${stem} (${n})${ext}`);
    existing = await statOrNull(candidate);
    if (!existing) return { target: candidate, skip: false };
    if (existing.size === srcSize) return { target: candidate, skip: true };
    n += 1;
  }
}

async function placeFile(srcPath, destMonthDir, mode) {
  await fs.mkdir(destMonthDir, { recursive: true });
  const srcStat = await fs.stat(srcPath);
  const { target, skip } = await resolveTarget(srcPath, destMonthDir, srcStat.size);

  if (skip) return { action: 'skipped', finalPath: target, moveDeleteFailed: false };

  let moveDeleteFailed = false;
  if (mode === 'move') {
    try {
      await fs.rename(srcPath, target);
    } catch (err) {
      if (err && err.code === 'EXDEV') {
        // cross-device: copy then delete source
        await fs.copyFile(srcPath, target);
        try { await fs.unlink(srcPath); } catch { moveDeleteFailed = true; }
      } else {
        throw err;
      }
    }
  } else {
    await fs.copyFile(srcPath, target);
  }

  return { action: 'sorted', finalPath: target, moveDeleteFailed };
}

module.exports = { placeFile, resolveTarget };
