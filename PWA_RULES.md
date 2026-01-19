# PWA Development Rules

To prevent stale cache issues during development where users see old versions of the app, follow these strict rules for the Service Worker (`sw.js`).

## 1. Force Immediate Activation
New Service Workers must NOT wait for tabs to close. They must skip waiting and claim clients immediately.

**Code Pattern:**
```javascript
// Install Event
self.addEventListener('install', (e) => {
    self.skipWaiting(); // <--- CRITICAL
    // ... cache logic ...
});

// Activate Event
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim()); // <--- CRITICAL
    // ... cleanup logic ...
});
```

## 2. Version Bumping
Whenever *any* static file (html, css, js) is modified, you MUST increment the `CACHE_NAME` version in `sw.js`.

```javascript
// Change v2 -> v3
const CACHE_NAME = 'quran-loop-v3'; 
```

## 3. Deployment Check
After deploying or serving (e.g., `npx serve .`), proactively ask the user to:
- **Refresh the page** (the new SW will install and take over immediately due to Rule 1).
- Close and reopen the tab if behavior persists.
