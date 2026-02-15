# Quran App Roadmap: MVP to Enterprise

This document outlines the strategic technical evolution of the Quran Looping App.

## 🟢 Phase 1: The MVP (Current State)

**Focus:** Core Functionality & UI Polish.
**Status:** **Stable**.

### Technical Stack

- **Frontend:** Vanilla HTML/JS/CSS.
- **Backend:** None (Serverless/API-dependent).
- **Persistence:** None (Session only).
- **Deployment:** Manual (Static file serving).

### Gap Analysis

- ❌ **No Persistence:** User settings (selected Reciter, configured Loops) are lost on refresh.
- ❌ **No Offline Mode:** Requires active internet connection for every session.
- ❌ **Developer Experience:** No type safety (JavaScript), no build optimization (minification).

---

## 🟡 Phase 2: Production Readiness ("Pro" App)

**Focus:** Reliability, User Retention & Offline Support.
**Target Timeline:** 1-2 Months.

### 1. Modernize Stack (Migration)

- [ ] **Migrate to TypeScript**: Prevent runtime errors and ensure strict typing for API responses.
- [ ] **Adopt Vite**: For hot-module-replacement (HMR), minification, and bundling assets.

### 2. Progressive Web App (PWA)

- [ ] **Service Workers**: Cache the App Shell (HTML/CSS/JS) so it loads instantly.
- [ ] **Audio Caching**: Use Common Cache API to store previously played verses for offline listening.
- [ ] **Installability**: `manifest.json` to allow "Add to Home Screen" on iOS/Android.

### 3. CI/CD Pipeline

- [ ] **GitHub Actions**:
  - Run `tests/test.html` (via headless browser) on every Pull Request.
  - specialized linter checks (`eslint`, `prettier`).
  - Auto-deploy to Vercel/Netlify on merge to `master`.

### 4. Local Persistence

- [ ] **LocalStorage Adapter**: Save `state` object changes to browser storage so users return to where they left off.

---

## 🔴 Phase 3: Enterprise Level ("Scale")

**Focus:** Security, multi-user, and Ecosystem.
**Target Timeline:** 3-6 Months+.

### 1. User Management & Cloud Sync

- [ ] **Auth Layer**: Integrate Auth0 or Firebase Auth for secure login.
- [ ] **Database (PostgreSQL/Supabase)**: Store user preferences, saved "Loop Presets" (e.g., "Surah Kahf Friday Routine"), and progress logs in the cloud.
- [ ] **Cross-Device Sync**: Start a loop on Desktop, finish on Mobile.

### 2. Scalability & Performance

- [ ] **CDN Strategy**: If specific reciters are slow, proxy audio through a custom high-performance CDN (Cloudflare R2/AWS S3).
- [ ] **Analytics**: Integrate Telemetry (PostHog/Mixpanel) to understand which features (Verse Repeat vs Range Repeat) are used most.

### 3. Enterprise Features

- [ ] **Classroom Mode**: Allow "Teachers" to create loop assignments and send links to "Students".
- [ ] **SSO**: For Islamic Schools/Organizations integration.
- [ ] **Audit Logs**: For admin actions.

## 📋 Recommended Next Steps

To move from MVP to Production immediately, I recommend:

1.  **Refactor to TypeScript/Vite** (sets the foundation).
2.  **Add Service Workers** (enables offline usage).
3.  **Implement LocalStorage** (quick win for persistence).
