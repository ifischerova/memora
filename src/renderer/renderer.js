'use strict';

const state = { lang: 'cs', source: null, dest: null };
const t = (code, vars) => window.memora.t(code, state.lang, vars);

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

function setResult(kind, html) {
  const box = document.getElementById('result');
  box.className = `result ${kind}`;
  box.innerHTML = html;
  box.hidden = false;
}

function clearResult() { document.getElementById('result').hidden = true; }

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

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
  let html = t('preflightReady', { photos: r.photos, videos: r.videos, size: r.size });
  if (r.warnings && r.warnings.includes('destInsideSource')) {
    html += `<span class="detail">${t('destInsideSource')}</span>`;
  }
  setResult('ok', html);
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
  let html = headline;
  html += `<span class="detail">${t('doneDetail', s)}</span>`;
  if (mode === 'move' && s.sourceEmptied) {
    html += `<span class="detail">${t('sourceEmptied')}</span>`;
  }
  if (s.perFileErrors > 0) {
    html += `<span class="detail">${t('fileReadSkipped', { count: s.perFileErrors })}</span>`;
  }
  if (s.moveDeleteFailed > 0) {
    html += `<span class="detail">${t('moveDeleteFailed', { count: s.moveDeleteFailed })}</span>`;
  }
  const hasWarn = s.perFileErrors > 0 || s.moveDeleteFailed > 0;
  setResult(hasWarn ? 'warn' : 'ok', html);
});

// initial paint
applyStaticText();
