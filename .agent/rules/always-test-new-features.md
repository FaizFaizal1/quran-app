# Always Test New Features

Whenever a new feature is implemented, you must ensure it is covered by appropriate tests.

1.  **Requirement**: Do not consider a feature "complete" until it has verification.
2.  **Types of Tests**:
    *   **Unit Tests**: For logic-heavy functions (e.g., in `logic.js`).
    *   **Browser/E2E Tests**: For UI interactions and user flows.
3.  **Procedure**:
    *   Create a test plan or use the `browser_subagent` to verify the feature.
    *   If using automated testing frameworks (like Jest), add new test cases.
    *   Document the verification in the `walkthrough.md` or PR description.
