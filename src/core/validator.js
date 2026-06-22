'use strict';
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// Is `child` the same as or nested within `parent`?
function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function validatePaths(source, dest) {
  const warnings = [];
  if (!source) return { ok: false, code: 'noSource', warnings };
  if (!dest) return { ok: false, code: 'noDest', warnings };

  if (!(await exists(source))) return { ok: false, code: 'sourceMissing', warnings };

  const srcResolved = path.resolve(source);
  const dstResolved = path.resolve(dest);
  if (srcResolved === dstResolved) return { ok: false, code: 'sameFolder', warnings };

  // Destination may not exist yet — that's allowed (we create it). But if its
  // parent chain is unreachable, treat as missing.
  if (!(await exists(dest))) {
    const parent = path.dirname(dstResolved);
    if (!(await exists(parent))) return { ok: false, code: 'destMissing', warnings };
  } else {
    // exists -> must be writable
    try {
      await fs.access(dest, fssync.constants.W_OK);
    } catch {
      return { ok: false, code: 'noWritePermission', warnings };
    }
  }

  if (isInside(dstResolved, srcResolved)) warnings.push('destInsideSource');

  return { ok: true, code: null, warnings };
}

module.exports = { validatePaths, isInside };
