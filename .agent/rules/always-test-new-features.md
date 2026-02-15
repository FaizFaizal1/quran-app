---
trigger: always_on
---

# Always Test New Features

whenever a new feature is implemented, you must ensure it is covered by appropriate tests.

1.  **Strict Requirement**: Do not consider a feature "complete" until it has automated verification.
2.  **Test Strategy**:
    - **Logic (Unit Tests)**: Use `jest` for pure JavaScript functions (e.g., parsing `2:255` string, state calculations). It runs fast and tests logic in isolation.
    - **UI (E2E Tests)**: Use `playwright` for verifiable user interactions (e.g., clicking 'Import', checking page title, verifying audio playback). It tests the actual app experience in a browser.
3.  **Verification**:
    - Run **BOTH** `npm test` (unit) AND `npm run test:ui` (E2E) when suitable.
    - `npm test` checks logic integrity.
    - `npm run test:ui` checks user experience.

4.  **Maintenance**:
    - If a feature is modified or deleted, update or remove the corresponding tests to prevent false failures. Do not leave broken tests in the codebase.
