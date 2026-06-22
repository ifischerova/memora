'use strict';

// Render the real Memora renderer UI and save light + dark PNG screenshots to
// site/screenshots/. Run with:  npx electron scripts/screenshot.js
// (Used for the README and promo site; not part of the shipped app.)

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const OUT_DIR = path.join(__dirname, '..', 'site', 'screenshots');

const POPULATE = (theme) => `
  (function () {
    document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
    const sp = document.getElementById('sourcePath');
    const dp = document.getElementById('destPath');
    sp.textContent = 'C:\\\\Users\\\\Iva\\\\Pictures\\\\WhatsApp';
    sp.classList.remove('empty');
    dp.textContent = 'D:\\\\Fotky\\\\Knihovna';
    dp.classList.remove('empty');
    const box = document.getElementById('result');
    box.className = 'result ok';
    box.innerHTML =
      window.memora.t('doneMerged', 'cs', { sorted: 1280, existingMonths: 7, newMonths: 3 }) +
      '<span class="detail">' +
      window.memora.t('doneDetail', 'cs', { skipped: 12, fallbackDate: 48 }) +
      '</span>';
    box.hidden = false;
    const tt = document.getElementById('themeToggle');
    if (tt) tt.textContent = ${JSON.stringify(theme)} === 'dark' ? '☀️' : '🌙';
  })();
`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// One window per theme, with a backdrop colour matching the theme so the
// window's native background never shows through behind the page.
async function shoot(theme, backgroundColor, file) {
  const win = new BrowserWindow({
    width: 940,
    height: 720,
    show: true,
    backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, 'screenshot-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  await win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  await delay(400);
  await win.webContents.executeJavaScript(POPULATE(theme));
  await delay(400);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT_DIR, file), image.toPNG());
  console.log('wrote', path.join('site', 'screenshots', file), `(${image.getSize().width}x${image.getSize().height})`);
  win.destroy();
}

// Suppress the default "quit when all windows closed" so destroying the first
// capture window doesn't end the run before the second.
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await shoot('light', '#fbfbfd', 'app-light.png');
  await shoot('dark', '#16161c', 'app-dark.png');
  app.quit();
});
