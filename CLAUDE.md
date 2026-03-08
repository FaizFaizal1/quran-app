# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (Python)
npm start          # Serves on http://localhost:8000

# Build (bundles logic.js + app.js into dist/assets/app.bundle.js via esbuild)
npm run build

# Tests
npm test           # Jest unit tests (tests/logic.test.js)
npm run test:ui    # Playwright E2E tests (tests/*.spec.js) — requires dist/ built first

# Lint & Format
npm run lint       # ESLint
npm run format     # Prettier (writes)
npm run format:check
```

Run a single Jest test file: `npx jest tests/logic.test.js`

## Architecture

This is a **static-site** Quran memorization/looping tool. No framework, no bundler for development — plain Vanilla JS + CSS.

### Script load order (development)

`index.html` loads two scripts in order:

1. `logic.js` — Pure functions, no DOM access. Exposes `window.AppLogic` (and `module.exports` for Node/Jest compatibility).
2. `app.js` — DOM-dependent UI logic. Reads `window.AppLogic`; throws if it isn't present.

### Build output (`dist/`)

`scripts/build.mjs` uses **esbuild** to bundle via `src/entry.js` (which imports `logic.js` then `app.js`) into `dist/assets/app.bundle.js`. The HTML `<script>` tags are replaced with a single `<script defer src="assets/app.bundle.js">`. The service worker (`sw.js`) gets a new cache name stamped with the build timestamp.

### Key files

| File                  | Purpose                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `logic.js`            | Pure functions: `validateRange`, `constructAudioUrl`, `calculateNextState`. Dual-env (browser + Node). |
| `app.js`              | State object, DOM `ui` map, all event handlers, API calls, audio engine, `localStorage` persistence.   |
| `style.css`           | All styles — CSS variables, glassmorphism dark theme, responsive layout.                               |
| `sw.js`               | PWA service worker; caches app shell assets.                                                           |
| `tests/logic.test.js` | Jest unit tests for `AppLogic` pure functions.                                                         |
| `tests/*.spec.js`     | Playwright E2E tests (serve `dist/` first).                                                            |

### State & persistence

`app.js` maintains a single `state` object. Settings are persisted to `localStorage` via `saveSettings()` / `loadSettings()`. The app supports two modes: **RANGE** (loop a surah verse range) and **PLAYLIST** (ordered list of surah+range items).

### External APIs

- **[Quran.com API](https://api.quran.com/)** — Surah metadata and verse text/translation.
- **[EveryAyah](https://everyayah.com)** — Per-verse audio MP3s. URL format: `https://everyayah.com/data/{reciterId}/{surah3}{verse3}.mp3`. Exception: `minshawi_mushaf_muallim` uses `https://mp3quran.net/minshawi_mushaf/{surah3}.mp3` (full-surah files).

## Conventions

- **Branch naming**: `feat/`, `fix/`, `chore/`, `refactor/`
- **Commits**: Conventional Commits — `feat(scope): description`
- **Code style**: camelCase, Prettier defaults (2-space indent), functions small and pure where possible.
- **`logic.js` must stay pure** — no DOM access, no side effects, testable in Node.
