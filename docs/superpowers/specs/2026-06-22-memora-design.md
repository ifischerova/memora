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
  - Renderer → main: `pick-folder`, `start-sort({ source, dest, mode })`.
  - Main → renderer: `sort:progress({ processed, total, current })`,
    `sort:done(summary)`, `sort:error(message)`.

### Components (each independently testable)

- `dateResolver` — given a file path, returns its date (EXIF `DateTimeOriginal`
  → fallback to `mtime`). Depends on `exifr`.
- `pathBuilder` — pure function: given a `Date`, returns the relative path
  `YYYY/YYYY-MM`. No dependencies. Trivial to unit-test.
- `fileSorter` — performs copy/move into a target folder, including
  collision/duplicate handling. Depends on `fs`.
- `scanner` — recursively walks the source folder and yields supported media
  files (by extension), skipping the destination folder if nested inside source.
- `i18n` — CZ/EN string lookup used by the renderer; a plain key→string map per
  language with a current-language switch.

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

## Branding

- **Name:** Memora.
- **Tagline:** "Your memories, in order." / "Vaše vzpomínky v pořádku."
- **Identity:** modern, light, warm. Shared between app and promo site.

## Distribution

- Git repository; commits authored as **Iva Fischerova <fischerova.ivka@gmail.com>**.
- Windows installer (`.exe`) + portable build published as a GitHub Release.
- Promo site on GitHub Pages linking to the release.
