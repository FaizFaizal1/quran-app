# Contributing to Quran App

We follow the **AGY Golden Standard** to ensure code quality and collaboration efficiency. Please verify your changes against these guidelines before submitting a Pull Request.

## 1. Branching Strategy

We use a simplified Git Flow:

- **`main`**: Production-ready code. Deployed automatically.
- **`dev`**: Integration branch. All features merge here first.
- **Feature Branches**:
    - Format: `feat/short-description`
    - Example: `feat/add-dark-mode-toggle`
- **Bug Fixes**:
    - Format: `fix/issue-description`
    - Example: `fix/mobile-menu-overflow`
- **Chores/Refactors**:
    - Format: `chore/setup-eslint` or `refactor/audio-engine`

## 2. Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/). Messages must be structured as follows:

```
<type>(<scope>): <short description>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Example:**
> `feat(player): add playback speed control`

## 3. Pull Request Process

1.  Ensure all tests pass by running `tests/test.html`.
2.  Update the `README.md` with details of changes to the interface, if applicable.
3.  The PR title should match the Commit Convention.
4.  Request a review from at least one other developer.

## 4. Code Style

- Use **camelCase** for variables and functions.
- Use **Prettier** defaults for formatting (2 spaces indentation).
- Keep functions small and pure where possible.
