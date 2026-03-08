# Quran Looping App

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-stable-success)

A lightweight web app for Quran memorization that lets you repeat verses and verse ranges with precise controls. The project is built with vanilla JavaScript and CSS for a fast load time, and includes PWA + Android (Capacitor) support.

## Features

- Repeat a **single verse** a custom number of times.
- Repeat a **verse range** a custom number of cycles.
- Stream verse-by-verse recitation audio (EveryAyah source).
- Browse rich surah metadata (Quran.com API source).
- Mobile-friendly UI with dark/premium visual style.
- Offline-ready basics via service worker/PWA files.

## Tech Stack

- HTML, CSS, Vanilla JavaScript
- Jest for unit tests
- Playwright for browser E2E tests
- ESLint + Prettier for code quality
- Capacitor for Android packaging

## Getting Started

### Prerequisites

- Node.js 22+ (see `package.json` engines)
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm start
```

Then open: <http://localhost:8000>

## Development Commands

- `npm run lint` — run ESLint
- `npm run format:check` — check formatting
- `npm run test` — run Jest tests
- `npm run test:ui` — run Playwright tests
- `npm run build` — produce a production bundle via `scripts/build.mjs`
- `npm run cap:sync` — build and sync Capacitor Android assets

## Project Structure

- `index.html` — main app shell
- `app.js` — primary app behavior and UI interaction logic
- `logic.js` — core pure logic used by tests
- `style.css` — styling and responsive layout
- `sw.js` + `manifest.json` — PWA assets
- `tests/` — Jest and Playwright test suites
- `android/` — Capacitor Android project

## Testing

Run unit tests:

```bash
npm test
```

Run browser tests:

```bash
npm run test:ui
```

## Deployment

See deployment notes in [DEPLOY.md](DEPLOY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow and expectations.

## License

MIT (project badges may still reference legacy metadata).
