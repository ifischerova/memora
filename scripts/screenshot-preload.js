'use strict';

// Preload used ONLY by scripts/screenshot.js to render the real renderer UI for
// marketing screenshots. It stubs the window.memora bridge with canned data so
// the actual renderer + styles + message catalog render without the main process.

const { contextBridge } = require('electron');
const { formatMessage } = require('../src/core/messages');

contextBridge.exposeInMainWorld('memora', {
  t: (code, lang, vars) => formatMessage(code, lang, vars),
  pickFolder: async () => null,
  preflight: async () => ({ ok: true, photos: 1280, videos: 64, size: '4.2 GB', warnings: [] }),
  startSort: async () => ({ ok: true, summary: {} }),
  onProgress: () => () => {},
});
