'use strict';

const GITHUB_REPO = 'ifischerova/memora'; // update if the GitHub username differs
const INSTALLER_ASSET = 'Memora-Setup.exe';

const I18N = {
  cs: {
    heroTitle: 'Vaše vzpomínky v pořádku.',
    heroLead: 'Memora seřadí tisíce fotek a videí z telefonu do přehledných složek podle roku a měsíce — rychle, lokálně a soukromě.',
    download: 'Stáhnout pro Windows',
    heroSub: 'Zdarma · MIT licence · Vše probíhá ve vašem počítači',
    step1t: '1. Stáhněte fotky', step1d: 'Přeneste fotky z telefonu do složky (kabelem nebo z cloudu).',
    step2t: '2. Vyberte složky', step2d: 'V Memoře zvolte zdrojovou a cílovou složku a klikněte na Seřadit.',
    step3t: '3. Hotovo', step3d: 'Fotky se seřadí do složek 2024/2024-03 podle data pořízení.',
    f1t: 'Soukromé', f1d: 'Žádný cloud, žádné účty. Vše zůstává ve vašem počítači.',
    f2t: 'Slučuje knihovnu', f2d: 'Přidávejte fotky z WhatsAppu, screenshotů i fotoaparátu — vše se sloučí do jedné knihovny.',
    f3t: 'Bezpečné', f3d: 'Výchozí režim kopíruje — originály zůstanou nedotčené.',
    f4t: 'Dvojjazyčné', f4d: 'Čeština i angličtina, moderní přehledné prostředí.',
  },
  en: {
    heroTitle: 'Your memories, in order.',
    heroLead: 'Memora sorts thousands of phone photos and videos into tidy year/month folders — fast, local, and private.',
    download: 'Download for Windows',
    heroSub: 'Free · MIT license · Everything runs on your computer',
    step1t: '1. Get your photos', step1d: 'Copy photos from your phone to a folder (cable or cloud download).',
    step2t: '2. Pick folders', step2d: 'In Memora choose a source and destination folder, then click Sort.',
    step3t: '3. Done', step3d: 'Photos land in 2024/2024-03 folders based on when they were taken.',
    f1t: 'Private', f1d: 'No cloud, no accounts. Everything stays on your computer.',
    f2t: 'Builds one library', f2d: 'Add WhatsApp, screenshots, and camera photos — all merge into one library.',
    f3t: 'Safe', f3d: 'Copy is the default — your originals stay untouched.',
    f4t: 'Bilingual', f4d: 'Czech and English, in a clean modern interface.',
  },
};

function apply(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = I18N[lang][el.getAttribute('data-i18n')];
  });
  document.querySelectorAll('.lang button').forEach((b) =>
    b.classList.toggle('active', b.getAttribute('data-lang') === lang));
}

document.querySelector('.lang').addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (btn) apply(btn.getAttribute('data-lang'));
});

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

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('memora-theme', next); } catch (e) {}
});

document.getElementById('downloadBtn').href =
  `https://github.com/${GITHUB_REPO}/releases/latest/download/${INSTALLER_ASSET}`;
document.getElementById('repoLink').href = `https://github.com/${GITHUB_REPO}`;

apply('cs');
