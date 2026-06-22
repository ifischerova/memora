'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { validatePaths } = require('./validator');
const { scan } = require('./scanner');
const { resolveDate } = require('./dateResolver');
const { buildMonthPath } = require('./pathBuilder');
const { placeFile } = require('./fileSorter');

async function dirExists(p) {
  try { const s = await fs.stat(p); return s.isDirectory(); } catch { return false; }
}

function formatBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

async function preflight(source, dest, deps = {}) {
  const statfs = deps.statfs || ((p) => fs.statfs(p));
  const base = await validatePaths(source, dest);
  if (!base.ok) return { ...base };

  const files = await scan(source, dest);
  if (files.length === 0) return { ok: false, code: 'noMedia', warnings: base.warnings };

  let photos = 0, videos = 0, totalBytes = 0;
  for (const f of files) {
    if (f.kind === 'photo') photos += 1; else videos += 1;
    totalBytes += f.size;
  }

  let freeBytes = Infinity;
  try {
    const checkPath = (await dirExists(dest)) ? dest : path.dirname(path.resolve(dest));
    const st = await statfs(checkPath);
    freeBytes = st.bavail * st.bsize;
  } catch { /* if statfs unavailable, skip the space gate */ }

  if (totalBytes > freeBytes) {
    return {
      ok: false, code: 'notEnoughSpace', warnings: base.warnings,
      needed: formatBytes(totalBytes), free: formatBytes(freeBytes),
    };
  }

  return {
    ok: true, code: null, warnings: base.warnings,
    photos, videos, totalBytes, freeBytes,
    size: formatBytes(totalBytes),
  };
}

function classifyFsError(err) {
  if (!err || !err.code) return 'unknownError';
  if (err.code === 'ENOSPC') return 'diskFullMidway';
  if (['ENOENT', 'EIO', 'EBUSY', 'EPERM', 'EACCES'].includes(err.code)) return 'driveRemoved';
  return 'unknownError';
}

async function runSort({ source, dest, mode, onProgress }) {
  const files = await scan(source, dest);
  const total = files.length;

  // Which month folders already exist (under dest) before we touch anything?
  const existedBefore = new Set();
  const touched = new Set();

  const summary = {
    sorted: 0, skipped: 0, fallbackDate: 0,
    existingMonths: 0, newMonths: 0,
    moved: 0, sourceEmptied: false, perFileErrors: 0,
  };

  let processed = 0;
  for (const file of files) {
    try {
      const { date, usedFallback } = await resolveDate(file.path);
      if (usedFallback) summary.fallbackDate += 1;

      const monthRel = buildMonthPath(date);
      const monthDir = path.join(dest, monthRel);

      if (!touched.has(monthRel)) {
        if (await dirExists(monthDir)) existedBefore.add(monthRel);
        touched.add(monthRel);
      }

      const res = await placeFile(file.path, monthDir, mode);
      if (res.action === 'sorted') {
        summary.sorted += 1;
        if (mode === 'move') summary.moved += 1;
      } else {
        summary.skipped += 1;
      }
      if (res.moveDeleteFailed) summary.perFileErrors += 1;
    } catch (err) {
      const code = classifyFsError(err);
      if (code === 'fileReadSkipped') {
        summary.perFileErrors += 1;
      } else if (code === 'diskFullMidway' || code === 'driveRemoved') {
        return { ok: false, error: { code, detail: err.message, processedBeforeError: summary.sorted } };
      } else {
        // treat unexpected per-file issues as skippable read errors, keep going
        summary.perFileErrors += 1;
      }
    }
    processed += 1;
    if (onProgress) onProgress({ processed, total, current: path.basename(file.path) });
  }

  // month accounting
  for (const m of touched) {
    if (existedBefore.has(m)) summary.existingMonths += 1;
    else summary.newMonths += 1;
  }
  summary.isFresh = existedBefore.size === 0;

  // source emptied? (move mode, nothing left to sort)
  if (mode === 'move') {
    const leftover = await scan(source, dest);
    summary.sourceEmptied = leftover.length === 0;
  }

  return { ok: true, summary };
}

module.exports = { preflight, runSort, formatBytes };
