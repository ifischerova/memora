'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const { formatMessage } = require('./core/messages');

contextBridge.exposeInMainWorld('memora', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  preflight: (source, dest, mode) => ipcRenderer.invoke('preflight', { source, dest, mode }),
  startSort: (source, dest, mode) => ipcRenderer.invoke('start-sort', { source, dest, mode }),
  onProgress: (cb) => {
    const handler = (_event, payload) => cb(payload);
    ipcRenderer.on('sort:progress', handler);
    return () => ipcRenderer.removeListener('sort:progress', handler);
  },
  t: (code, lang, vars) => formatMessage(code, lang, vars),
});
