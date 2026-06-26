'use strict';

// Print SHA-256 checksums for the built installers in dist/.
// Run `npm run checksum` after `npm run build`, then paste the output into the
// GitHub Release notes so users can verify their download.
//
// Optional: pass an output path to also write a standard `sha256sum -c`
// compatible file (one `<hash>  <filename>` line per artifact, no header), e.g.
//   node scripts/checksums.js dist/SHA256SUMS.txt
// The release CI uses this to attach checksum files to every GitHub Release.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const distDir = path.join(__dirname, '..', 'dist');

// Installer/package artifacts across all platforms.
const ARTIFACT_EXTS = ['.exe', '.dmg', '.deb', '.appimage'];

let files;
try {
  files = fs
    .readdirSync(distDir)
    .filter((f) => ARTIFACT_EXTS.some((ext) => f.toLowerCase().endsWith(ext)));
} catch {
  console.error('No dist/ folder found. Run "npm run build" first.');
  process.exit(1);
}

if (files.length === 0) {
  console.error('No installer artifacts in dist/. Run "npm run build" first.');
  process.exit(1);
}

const lines = [];
for (const file of files.sort()) {
  const buffer = fs.readFileSync(path.join(distDir, file));
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  lines.push(`${hash}  ${file}`);
}

console.log('SHA-256 checksums (paste into the GitHub Release notes):\n');
console.log(lines.join('\n'));

const outPath = process.argv[2];
if (outPath) {
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`\nWrote ${lines.length} checksum(s) to ${outPath}`);
}
