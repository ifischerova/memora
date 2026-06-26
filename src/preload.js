'use strict';
// With sandbox:true a preload script may only require 'electron' and a small
// allowlist of Node modules — it can no longer require local files. Translation
// therefore lives entirely in the renderer (see ../core/messages.js, loaded as a
// plain script in index.html), and this bridge only forwards IPC.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memora', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  preflight: (source, dest, mode) => ipcRenderer.invoke('preflight', { source, dest, mode }),
  startSort: (source, dest, mode) => ipcRenderer.invoke('start-sort', { source, dest, mode }),
  onProgress: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on('sort:progress', handler);
    return () => ipcRenderer.removeListener('sort:progress', handler);
  },
});
