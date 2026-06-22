# Memora — Design Spec

**Date:** 2026-06-22
**Author:** Iva Fischerova <fischerova.ivka@gmail.com>
**Status:** Approved (design phase)

## Overview

Memora is a downloadable Windows desktop application that sorts large numbers of
photos and videos from a folder into tidy, chronological year/month folders based
on each file's metadata. It runs fully locally — no cloud, no accounts, no data
leaves the machine. The UI is bilingual (Czech / English) with a modern, light
visual style.

A separate static **promo site** (GitHub Pages) presents the product to visitors
and links directly to the installer published via **GitHub Releases**.

## Goals

- Sort thousands of mixed photos/videos quickly and reliably.
- Be approachable for non-technical users: install, point at a folder, click Sort.
- Keep everything local and private.
- Look polished — both the app and the promo site share one visual identity.

## Non-Goals (YAGNI)

- No direct phone access (USB/MTP) or cloud-service integration. Users export
  photos to a folder themselves (USB cable or cloud download) before using Memora.
- No editing, tagging, face recognition, or deduplication beyond simple
  same-name/same-size collision handling.
- No macOS/Linux build in this iteration (Windows installer only). Code stays
  cross-platform-friendly so this is possible later.

## User Flow

1. User exports photos from their phone to a folder (outside the app).
2. Opens Memora → picks a **Source folder** and a **Destination folder**.
3. Chooses **Copy** (default) or **Move**, and **CZ / EN** language.
4. Clicks **Sort** → sees a live progress bar.
5. At the end, sees a summary: number sorted, skipped (duplicates), and
   unknown-date items.

## Sorting Rules

- **Folder structure:** nested, numeric, language-independent — `2024/2024-03/`.
- **Date source:** EXIF "date taken" (`DateTimeOriginal`). If absent, fall back to
  the file's last-modified timestamp. Every file is sorted; there is no separate
  "unknown date" folder.
- **File types:**
  - Photos: `.jpg`, `.jpeg`, `.png`, `.heic`, `.heif`, `.gif`, `.bmp`, `.tiff`, `.webp`
  - Videos: `.mp4`, `.mov`, `.m4v`, `.3gp`, `.avi`, `.mkv`
  - Other files are ignored.
- **Copy vs Move:** user-selectable toggle, **Copy is the default** (non-destructive).
  Move relocates files and empties the source as it proceeds.
- **Duplicate / collision handling:** when a file with the same name already exists
  in the destination month folder:
  - If it is identical (same size), **skip** (counted as "skipped").
  - If same name but different size, append a counter: `IMG_1234 (2).jpg`,
    `IMG_1234 (3).jpg`, …

## Incremental Library Building (multiple sources → one library)

A core use case: the user's photos live in several folders (camera roll,
WhatsApp, screenshots, downloads). Memora is designed to build **one tidy library**
from all of them, run after run.

- Sorting is keyed on **date → destination**, never on the source. Running Memora
  on the WhatsApp folder and then again on the screenshots folder merges both into
  the **same** `2024/2024-03/` folders. Existing month folders are **reused, not
  duplicated**.
- This is the normal mode of operation: point at one source, sort; point at the
  next source, sort again; repeat. The destination grows into a complete library.
- To make the merge **visible and reassuring**, the orchestrator records which
  month folders already existed before a run and reports new-vs-existing in the
  summary (see "merged" success message below), so the user can see their library
  grew rather than fearing a duplicate set was created.
- **Cross-source duplicate detection** is limited to same-name + same-size within
  a month folder (e.g. re-running the same source). Detecting the *same photo
  under different filenames* across sources (WhatsApp renames files) would require
  content hashing and is intentionally out of scope for this iteration (YAGNI);
  noted as a possible future enhancement.

## Architecture

Electron app with a clean split between the privileged main process (file I/O,
metadata) and a sandboxed renderer (UI). They communicate over IPC.

- **Main process (Node):** owns all heavy lifting — folder scan, EXIF reading,
  date resolution, copy/move with collision handling, progress reporting. Long
  work runs asynchronously so the window stays responsive across thousands of
  files. Progress is streamed to the renderer via IPC events.
- **Renderer (UI):** lightweight HTML/CSS/JS, no heavy framework. Light theme,
  clean typography, generous spacing. Talks to the main process through a narrow,
  typed `preload` bridge (context isolation on, node integration off).
- **IPC contract:**
  - Renderer → main: `pick-folder`, `preflight({ source, dest })`,
    `start-sort({ source, dest, mode })`.
  - Main → renderer:
    - `preflight:result({ ok, code, photos, videos, totalBytes, freeBytes })` —
      validation outcome + what was found, before any file is touched.
    - `sort:progress({ processed, total, current })`.
    - `sort:done(summary)` where `summary = { sorted, skipped, fallbackDate,
      existingMonths, newMonths, moved, sourceEmptied, perFileErrors }`.
    - `sort:error({ code, detail, processedBeforeError })`.
  - Every `code` maps to a bilingual message (see Validation & Messaging below);
    the renderer never builds error text by hand.

### Components (each independently testable)

- `dateResolver` — given a file path, returns its date (EXIF `DateTimeOriginal`
  → fallback to `mtime`). Depends on `exifr`.
- `pathBuilder` — pure function: given a `Date`, returns the relative path
  `YYYY/YYYY-MM`. No dependencies. Trivial to unit-test.
- `fileSorter` — performs copy/move into a target folder, including
  collision/duplicate handling. Depends on `fs`.
- `scanner` — recursively walks the source folder and yields supported media
  files (by extension), skipping the destination folder if nested inside source.
- `validator` — pure pre-flight checks on `{ source, dest }`; returns an `ok`
  flag and a problem `code` (no UI text). Drives the `preflight` IPC call.
- `messages` — single source of truth mapping every `code` (validation, runtime
  error, and success) to `{ en, cs }` text with `{placeholder}` interpolation.
- `i18n` — CZ/EN string lookup used by the renderer (wraps `messages` plus static
  UI labels); a plain key→string map per language with a current-language switch.

### Libraries

- `electron` — app shell.
- `electron-builder` — produces the Windows NSIS installer (`.exe`) and a
  portable build.
- `exifr` — EXIF/metadata extraction, including HEIC support.
- A test runner (`vitest` or `node:test`) for unit tests.

## Promo Site

- **Hosting:** GitHub Pages. The site source lives in a dedicated top-level
  `site/` folder (kept separate from `docs/`, which holds internal specs so they
  are never published). It is deployed to Pages via the `gh-pages` branch. Free,
  no extra accounts.
- **Download:** the hero "Download for Windows" button links directly to the
  installer asset attached to the latest **GitHub Release**. Visitors never see
  code or branches.
- **Design:** modern light style that matches the app's palette and typography,
  so the site and app read as one product.
- **Bilingual:** CZ / EN toggle, mirroring the app.
- **Sections:** hero (name + tagline + Download button) → "how it works" in 3
  steps → feature highlights → app screenshot/mockup → footer.
- **Self-contained static** HTML/CSS/JS — fast, no build step required to view.
- **Alternative (future):** the same static files can be deployed to Netlify or
  Vercel if a custom domain (e.g. `memora.app`) is ever wanted. No decision needed now.

## Validation, Errors & Messaging

Every state the user can reach has a clear, friendly, bilingual message. The
principle: **never leave the user guessing** — say what happened, why, whether
their files are safe, and what to do next. Messages are calm and non-technical;
errors never blame the user. All text lives in the `messages` catalog keyed by
`code`, with `{placeholder}` interpolation, so the same source feeds the app UI
and stays translatable.

### Pre-flight validation (checked before any file is touched)

These run when the user selects folders / clicks Sort. Blocking errors stop the
run; warnings inform but allow continuing.

| code | When | Severity | EN | CS |
|---|---|---|---|---|
| `noSource` | No source folder chosen | block | Please choose a source folder — the folder with the photos you want to sort. | Vyberte prosím zdrojovou složku — složku s fotkami, které chcete seřadit. |
| `noDest` | No destination chosen | block | Please choose a destination folder where the sorted photos will go. | Vyberte prosím cílovou složku, kam se seřazené fotky uloží. |
| `sourceMissing` | Source path gone / drive unplugged | block | We can't find the source folder. It may have been moved, deleted, or its drive disconnected. | Zdrojovou složku se nepodařilo najít. Možná byla přesunuta, smazána, nebo bylo odpojeno její úložiště. |
| `destMissing` | Destination path gone | block | We can't find the destination folder. It may have been moved, deleted, or its drive disconnected. | Cílovou složku se nepodařilo najít. Možná byla přesunuta, smazána, nebo bylo odpojeno její úložiště. |
| `sameFolder` | Source == destination | block | The source and destination can't be the same folder. Please choose a different destination. | Zdrojová a cílová složka nemůže být stejná. Vyberte prosím jinou cílovou složku. |
| `destInsideSource` | Destination nested in source | warn | The destination is inside the source folder. That's fine — Memora will skip it while scanning so it never sorts its own results. | Cílová složka je uvnitř zdrojové. To nevadí — Memora ji při procházení přeskočí, aby nikdy neřadila vlastní výsledky. |
| `noWritePermission` | Can't write to destination | block | Memora can't save files into the destination folder. Check that you have permission, or pick another folder. | Memora nemůže ukládat soubory do cílové složky. Zkontrolujte oprávnění, nebo vyberte jinou složku. |
| `noMedia` | Source has no supported files | block | No photos or videos were found in this folder. Try choosing a different folder. | V této složce nebyly nalezeny žádné fotky ani videa. Zkuste vybrat jinou složku. |
| `notEnoughSpace` | Copy needs more than free space | block | Not enough free space on the destination drive. About {needed} is needed, but only {free} is available. Free up space or switch to Move. | Na cílovém úložišti není dost místa. Je potřeba přibližně {needed}, ale k dispozici je jen {free}. Uvolněte místo, nebo přepněte na Přesunout. |

### Runtime errors (during sorting)

Per-file problems are collected and continue the run; whole-operation problems
stop it and always report how many files were already safely sorted.

| code | When | Behaviour | EN | CS |
|---|---|---|---|---|
| `fileReadSkipped` | A file can't be read (locked/protected) | skip, continue, aggregate | {count} file(s) couldn't be read and were skipped — they may be open in another app or protected. | {count} soubor(ů) se nepodařilo načíst a byly přeskočeny — mohou být otevřené v jiné aplikaci nebo chráněné. |
| `diskFullMidway` | Destination fills up mid-run | stop | The destination drive ran out of space. {done} files were sorted safely before it stopped. Free up space and run Memora again to continue. | Cílovému úložišti došlo místo. Než se proces zastavil, bylo bezpečně seřazeno {done} souborů. Uvolněte místo a spusťte Memoru znovu. |
| `driveRemoved` | Drive disconnected mid-run | stop | The drive was disconnected. {done} files were sorted safely before it stopped. Reconnect it and run Memora again. | Úložiště bylo odpojeno. Než se proces zastavil, bylo bezpečně seřazeno {done} souborů. Připojte ho znovu a spusťte Memoru. |
| `moveDeleteFailed` | Move copied OK but couldn't delete source | warn, continue | {count} file(s) were copied successfully but couldn't be removed from the source. They're safe in the destination — you can delete the originals yourself. | {count} soubor(ů) se podařilo zkopírovat, ale nešlo je odebrat ze zdroje. V cíli jsou v bezpečí — originály můžete smazat sami. |
| `unknownError` | Anything unexpected | stop, no data loss | Something went wrong: {detail}. No files were lost. Please try again. | Něco se pokazilo: {detail}. Žádné soubory nebyly ztraceny. Zkuste to prosím znovu. |

### Success & progress (the happy path)

The user should always feel the app is alive and working, and end with clear
reassurance.

| code | When | EN | CS |
|---|---|---|---|
| `preflightReady` | After validation passes | Found {photos} photos and {videos} videos ({size}). Ready to sort. | Nalezeno {photos} fotek a {videos} videí ({size}). Připraveno k řazení. |
| `progress` | Streaming during sort | Sorting… {processed} of {total} | Řadím… {processed} z {total} |
| `doneFresh` | Finished, destination was empty | Done! Sorted {sorted} files into {newMonths} month folders. | Hotovo! Seřazeno {sorted} souborů do {newMonths} měsíčních složek. |
| `doneMerged` | Finished, library already existed | Merged into your library — {sorted} new files added across {existingMonths} existing month(s) and {newMonths} new one(s). | Sloučeno s vaší knihovnou — přidáno {sorted} nových souborů do {existingMonths} stávajících měsíců a {newMonths} nových. |
| `doneDetail` | Appended to either summary | Skipped {skipped} duplicates · {fallbackDate} file(s) used their file date (no photo metadata). | Přeskočeno {skipped} duplicit · {fallbackDate} souborů použilo datum souboru (bez fot. metadat). |
| `sourceEmptied` | Move finished | Your source folder is now empty — every file was moved. | Vaše zdrojová složka je nyní prázdná — všechny soubory byly přesunuty. |

The `doneMerged` message is what makes the **incremental library** feature
tangible: adding a second source (e.g. screenshots after WhatsApp) shows files
flowing into existing months, confirming nothing was duplicated.

## Documentation Deliverables

- **End-user manual** (bilingual CZ/EN): how to download, install, and use Memora.
- **README** (developer): how to build the installer from source.

## Testing Strategy

Unit tests cover the logic where correctness matters most, using small fixture
files:

- `pathBuilder` — date → `YYYY/YYYY-MM` across month/year boundaries.
- `dateResolver` — EXIF present (uses EXIF), EXIF absent (falls back to mtime).
- `fileSorter` — collision cases: identical file skipped; same-name-different-size
  gets a counter suffix; copy leaves source intact; move removes source.
- `validator` — each pre-flight `code` is produced for its condition (missing
  source/dest, same folder, dest-inside-source, no media) and `ok` for a valid pair.
- `messages` — every `code` resolves to non-empty `en` and `cs` text, and
  `{placeholder}` interpolation fills correctly (catches missing translations).
- `summary` — incremental accounting: existing-vs-new month counts are correct
  when sorting into an empty destination vs one that already has month folders.

## License

- **MIT License**, copyright **Iva Fischerova**, year 2026. Permissive and simple,
  the standard choice for a free downloadable app. A `LICENSE` file lives at the
  repo root and is referenced from the README.

## Project / Repository Naming

- The project, npm package, app `productName`, and GitHub repository are all named
  **memora** (display name "Memora"). The npm `name` is `memora`.
- The GitHub repository will be created as `memora`.
- The local working folder is currently `photoloader`. Renaming the active project
  folder mid-session would break tool paths and may conflict with OneDrive sync, so
  the physical folder rename is a **final manual step** (or done at the very end of
  implementation): close the app, rename `…\soukrome\photoloader` → `…\soukrome\memora`.
  Nothing inside the project hard-codes the folder name, so the rename is safe.

## Branding

- **Name:** Memora.
- **Tagline:** "Your memories, in order." / "Vaše vzpomínky v pořádku."
- **Identity:** modern, light, warm. Shared between app and promo site.

## Distribution

- Git repository; commits authored as **Iva Fischerova <fischerova.ivka@gmail.com>**.
- Windows installer (`.exe`) + portable build published as a GitHub Release.
- Promo site on GitHub Pages linking to the release.
