'use strict';

const state = { lang: 'cs', source: null, dest: null };
const t = (code, vars) => window.MemoraMessages.formatMessage(code, state.lang, vars);

function applyStaticText() {
  document.querySelectorAll('[data-msg]').forEach((el) => {
    if (el.id === 'sourcePath' || el.id === 'destPath') return; // handled by renderPath below
    el.textContent = t(el.getAttribute('data-msg'));
  });
  renderPath('sourcePath', state.source);
  renderPath('destPath', state.dest);
}

function renderPath(id, value) {
  const el = document.getElementById(id);
  if (value) { el.textContent = value; el.classList.remove('empty'); }
  else { el.textContent = t('none'); el.classList.add('empty'); }
}

// Render a result without ever interpreting strings as HTML. `message` is the
// headline; `details` is an optional list of secondary lines (rendered as the
// .detail spans the stylesheet expects).
function setResult(kind, message, details = []) {
  const box = document.getElementById('result');
  box.className = `result ${kind}`;
  box.textContent = message; // clears prior children, sets headline text node
  for (const line of details) {
    const span = document.createElement('span');
    span.className = 'detail';
    span.textContent = line;
    box.appendChild(span);
  }
  box.hidden = false;
}

function clearResult() { document.getElementById('result').hidden = true; }

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

// --- theme toggle ---
(function initTheme() {
  let theme;
  try { theme = localStorage.getItem('memora-theme'); } catch (e) { theme = null; }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
})();

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('memora-theme', next); } catch (e) {}
});

// --- language toggle ---
document.getElementById('langToggle').addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  state.lang = btn.getAttribute('data-lang');
  document.querySelectorAll('#langToggle button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  applyStaticText();
});

// --- folder pickers ---
document.getElementById('pickSource').addEventListener('click', async () => {
  const p = await window.memora.pickFolder();
  if (p) { state.source = p; renderPath('sourcePath', p); clearResult(); }
});
document.getElementById('pickDest').addEventListener('click', async () => {
  const p = await window.memora.pickFolder();
  if (p) { state.dest = p; renderPath('destPath', p); clearResult(); }
});

// --- check (preflight) ---
document.getElementById('checkBtn').addEventListener('click', async () => {
  clearResult();
  const r = await window.memora.preflight(state.source, state.dest, currentMode());
  if (!r.ok) { setResult('err', t(r.code, r)); return; }
  const details = [];
  if (r.warnings && r.warnings.includes('destInsideSource')) {
    details.push(t('destInsideSource'));
  }
  setResult('ok', t('preflightReady', { photos: r.photos, videos: r.videos, size: r.size }), details);
});

// --- sort ---
document.getElementById('sortBtn').addEventListener('click', async () => {
  clearResult();
  const pre = await window.memora.preflight(state.source, state.dest, currentMode());
  if (!pre.ok) { setResult('err', t(pre.code, pre)); return; }

  const status = document.getElementById('status');
  const fill = document.getElementById('fill');
  const statusText = document.getElementById('statusText');
  const sortBtn = document.getElementById('sortBtn');
  status.hidden = false; sortBtn.disabled = true; fill.style.width = '0%';

  const unsub = window.memora.onProgress(({ processed, total }) => {
    const pct = total ? Math.round((processed / total) * 100) : 0;
    fill.style.width = `${pct}%`;
    statusText.textContent = t('progress', { processed, total });
  });

  const mode = currentMode();
  let res;
  try {
    res = await window.memora.startSort(state.source, state.dest, mode);
  } catch (err) {
    unsub();
    sortBtn.disabled = false;
    status.hidden = true;
    setResult('err', t('unknownError', { detail: String((err && err.message) || err) }));
    return;
  }
  unsub();
  sortBtn.disabled = false;
  if (!res.ok) {
    status.hidden = true;
    setResult('err', t(res.error.code, { ...res.error, done: res.error.processedBeforeError }));
    return;
  }
  status.hidden = true;

  const s = res.summary;
  const headline = s.isFresh
    ? t('doneFresh', s)
    : t('doneMerged', s);
  const details = [t('doneDetail', s)];
  if (mode === 'move' && s.sourceEmptied) {
    details.push(t('sourceEmptied'));
  }
  if (s.perFileErrors > 0) {
    details.push(t('fileReadSkipped', { count: s.perFileErrors }));
  }
  if (s.moveDeleteFailed > 0) {
    details.push(t('moveDeleteFailed', { count: s.moveDeleteFailed }));
  }
  const hasWarn = s.perFileErrors > 0 || s.moveDeleteFailed > 0;
  setResult(hasWarn ? 'warn' : 'ok', headline, details);
});

// initial paint
applyStaticText();
