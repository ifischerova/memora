'use strict';

// Single source of truth for every user-facing string (validation, errors,
// success, and static UI labels). Keys are stable "codes"; values are {en, cs}.
const MESSAGES = {
  // --- pre-flight validation ---
  noSource: {
    en: 'Please choose a source folder — the folder with the photos you want to sort.',
    cs: 'Vyberte prosím zdrojovou složku — složku s fotkami, které chcete seřadit.',
  },
  noDest: {
    en: 'Please choose a destination folder where the sorted photos will go.',
    cs: 'Vyberte prosím cílovou složku, kam se seřazené fotky uloží.',
  },
  sourceMissing: {
    en: "We can't find the source folder. It may have been moved, deleted, or its drive disconnected.",
    cs: 'Zdrojovou složku se nepodařilo najít. Možná byla přesunuta, smazána, nebo bylo odpojeno její úložiště.',
  },
  destMissing: {
    en: "We can't find the destination folder. It may have been moved, deleted, or its drive disconnected.",
    cs: 'Cílovou složku se nepodařilo najít. Možná byla přesunuta, smazána, nebo bylo odpojeno její úložiště.',
  },
  sameFolder: {
    en: "The source and destination can't be the same folder. Please choose a different destination.",
    cs: 'Zdrojová a cílová složka nemůže být stejná. Vyberte prosím jinou cílovou složku.',
  },
  destInsideSource: {
    en: "The destination is inside the source folder. That's fine — Memora will skip it while scanning so it never sorts its own results.",
    cs: 'Cílová složka je uvnitř zdrojové. To nevadí — Memora ji při procházení přeskočí, aby nikdy neřadila vlastní výsledky.',
  },
  noWritePermission: {
    en: "Memora can't save files into the destination folder. Check that you have permission, or pick another folder.",
    cs: 'Memora nemůže ukládat soubory do cílové složky. Zkontrolujte oprávnění, nebo vyberte jinou složku.',
  },
  noMedia: {
    en: 'No photos or videos were found in this folder. Try choosing a different folder.',
    cs: 'V této složce nebyly nalezeny žádné fotky ani videa. Zkuste vybrat jinou složku.',
  },
  notEnoughSpace: {
    en: 'Not enough free space on the destination drive. About {needed} is needed, but only {free} is available. Free up space or switch to Move.',
    cs: 'Na cílovém úložišti není dost místa. Je potřeba přibližně {needed}, ale k dispozici je jen {free}. Uvolněte místo, nebo přepněte na Přesunout.',
  },

  // --- runtime errors ---
  fileReadSkipped: {
    en: "{count} file(s) couldn't be read and were skipped — they may be open in another app or protected.",
    cs: '{count} soubor(ů) se nepodařilo načíst a byly přeskočeny — mohou být otevřené v jiné aplikaci nebo chráněné.',
  },
  diskFullMidway: {
    en: 'The destination drive ran out of space. {done} files were sorted safely before it stopped. Free up space and run Memora again to continue.',
    cs: 'Cílovému úložišti došlo místo. Než se proces zastavil, bylo bezpečně seřazeno {done} souborů. Uvolněte místo a spusťte Memoru znovu.',
  },
  driveRemoved: {
    en: 'The drive was disconnected. {done} files were sorted safely before it stopped. Reconnect it and run Memora again.',
    cs: 'Úložiště bylo odpojeno. Než se proces zastavil, bylo bezpečně seřazeno {done} souborů. Připojte ho znovu a spusťte Memoru.',
  },
  moveDeleteFailed: {
    en: "{count} file(s) were copied successfully but couldn't be removed from the source. They're safe in the destination — you can delete the originals yourself.",
    cs: '{count} soubor(ů) se podařilo zkopírovat, ale nešlo je odebrat ze zdroje. V cíli jsou v bezpečí — originály můžete smazat sami.',
  },
  unknownError: {
    en: 'Something went wrong: {detail}. No files were lost. Please try again.',
    cs: 'Něco se pokazilo: {detail}. Žádné soubory nebyly ztraceny. Zkuste to prosím znovu.',
  },

  // --- success / progress ---
  preflightReady: {
    en: 'Found {photos} photos and {videos} videos ({size}). Ready to sort.',
    cs: 'Nalezeno {photos} fotek a {videos} videí ({size}). Připraveno k řazení.',
  },
  progress: {
    en: 'Sorting… {processed} of {total}',
    cs: 'Řadím… {processed} z {total}',
  },
  doneFresh: {
    en: 'Done! Sorted {sorted} files into {newMonths} month folders.',
    cs: 'Hotovo! Seřazeno {sorted} souborů do {newMonths} měsíčních složek.',
  },
  doneMerged: {
    en: 'Merged into your library — {sorted} new files added across {existingMonths} existing month(s) and {newMonths} new one(s).',
    cs: 'Sloučeno s vaší knihovnou — přidáno {sorted} nových souborů do {existingMonths} stávajících měsíců a {newMonths} nových.',
  },
  doneDetail: {
    en: 'Skipped {skipped} duplicates · {fallbackDate} file(s) used their file date (no photo metadata).',
    cs: 'Přeskočeno {skipped} duplicit · {fallbackDate} souborů použilo datum souboru (bez fot. metadat).',
  },
  sourceEmptied: {
    en: 'Your source folder is now empty — every file was moved.',
    cs: 'Vaše zdrojová složka je nyní prázdná — všechny soubory byly přesunuty.',
  },

  // --- static UI labels ---
  appTagline: { en: 'Your memories, in order.', cs: 'Vaše vzpomínky v pořádku.' },
  labelSource: { en: 'Source folder', cs: 'Zdrojová složka' },
  labelDest: { en: 'Destination folder', cs: 'Cílová složka' },
  labelChoose: { en: 'Choose…', cs: 'Vybrat…' },
  labelMode: { en: 'When sorting', cs: 'Při řazení' },
  labelCopy: { en: 'Copy (keep originals)', cs: 'Kopírovat (ponechat originály)' },
  labelMove: { en: 'Move (free up space)', cs: 'Přesunout (uvolnit místo)' },
  labelSort: { en: 'Sort photos', cs: 'Seřadit fotky' },
  labelSorting: { en: 'Sorting…', cs: 'Řadím…' },
  labelCheck: { en: 'Check folder', cs: 'Zkontrolovat složku' },
  none: { en: 'Not chosen yet', cs: 'Zatím nevybráno' },
};

function formatMessage(code, lang, vars = {}) {
  const entry = MESSAGES[code];
  if (!entry) throw new Error(`Unknown message code: ${code}`);
  const template = entry[lang] || entry.en;
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole
  );
}

module.exports = { MESSAGES, formatMessage };
