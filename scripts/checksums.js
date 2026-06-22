'use strict';

// Print SHA-256 checksums for the built installers in dist/.
// Run `npm run checksum` after `npm run build`, then paste the output into the
// GitHub Release notes so users can verify their download.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const distDir = path.join(__dirname, '..', 'dist');

let files;
try {
  files = fs.readdirSync(distDir).filter((f) => f.toLowerCase().endsWith('.exe'));
} catch {
  console.error('No dist/ folder found. Run "npm run build" first.');
  process.exit(1);
}

if (files.length === 0) {
  console.error('No .exe files in dist/. Run "npm run build" first.');
  process.exit(1);
}

console.log('SHA-256 checksums (paste into the GitHub Release notes):\n');
for (const file of files.sort()) {
  const buffer = fs.readFileSync(path.join(distDir, file));
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  console.log(`${hash}  ${file}`);
}
