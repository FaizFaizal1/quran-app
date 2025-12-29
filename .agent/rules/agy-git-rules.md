---
trigger: always_on
glob: "*"
description: Enforce AGY Golden Standard Git Workflow
---

# AGY Golden Standard Rules

You must follow these rules for all Git operations in this workspace:

1. **Feature Branches**:
   - NEVER start a new feature or task directly on `master` or `main`.
   - ALWAYS create a new branch using the format: `feat/<feature-name>`, `fix/<issue>`, or `chore/<task>`.

2. **Commit Procedure**:
   - When the user asks to "save" or "commit", you must:
     1. Stage changes (`git add`).
     2. Commit with a Conventional Commit message (e.g., `feat(ui): add verse display`).

3. **Merge Procedure**:
   - When the user asks to "merge", you must:
     1. Switch to `master` (`git checkout master`).
     2. Merge the feature branch (`git merge <feature-branch>`).
     3. Notify the user of the success.

4. **Safety**:
   - Do not force push without explicit permission.
