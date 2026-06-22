'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { preflight, runSort } = require('./core/sortEngine');

function createWindow() {
  const win = new BrowserWindow({
    width: 940,
    height: 720,
    minWidth: 780,
    minHeight: 580,
    backgroundColor: '#fbfbfd',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('pick-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  } catch {
    return null;
  }
});

ipcMain.handle('preflight', async (_event, { source, dest, mode }) => {
  try {
    return await preflight(source, dest, { mode });
  } catch (err) {
    return { ok: false, code: 'unknownError', detail: err.message };
  }
});

ipcMain.handle('start-sort', async (event, { source, dest, mode }) => {
  const sender = event.sender;
  try {
    return await runSort({
      source, dest, mode,
      onProgress: (p) => { if (!sender.isDestroyed()) sender.send('sort:progress', p); },
    });
  } catch (err) {
    return { ok: false, error: { code: 'unknownError', detail: err.message, processedBeforeError: 0 } };
  }
});
