'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.gif', '.bmp', '.tiff', '.webp']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.3gp', '.avi', '.mkv']);

function kindFor(ext) {
  if (PHOTO_EXTS.has(ext)) return 'photo';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return null;
}

async function scan(root, skipDir) {
  const skip = skipDir ? path.resolve(skipDir) : null;
  const out = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory — skip silently
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (skip && path.resolve(full) === skip) continue;
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const kind = kindFor(path.extname(entry.name).toLowerCase());
        if (!kind) continue;
        try {
          const st = await fs.stat(full);
          out.push({ path: full, kind, size: st.size });
        } catch {
          // unreadable file — leave for the sorter to report if it matters
        }
      }
    }
  }

  await walk(root);
  return out;
}

module.exports = { scan, PHOTO_EXTS, VIDEO_EXTS };
