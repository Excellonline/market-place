# Contributing

Thanks for helping keep Marketplace Tool useful and maintainable. This app touches local user data and browser automation, so changes should stay conservative, testable, and easy to inspect.

## Local Setup

```pwsh
npm run setup
npm run dev
```

`npm run setup` installs dependencies, rebuilds Electron native modules, and installs Playwright Chromium.

## Development Workflow

1. Create a focused branch for the change.
2. Keep platform-specific automation logic inside the existing adapter boundaries.
3. Update or add tests for behavior changes.
4. Run the validation commands before opening a pull request.

```pwsh
npm run typecheck
npm test
```

## Code Style

- Prefer existing helpers and local patterns over new abstractions.
- Keep TypeScript types explicit at process boundaries, IPC boundaries, and database boundaries.
- Keep comments short and only use them where they explain non-obvious behavior.
- Do not commit generated output, local databases, logs, browser profiles, photos, or backups.

## Platform Adapter Changes

Marketplace pages are fragile. When changing Facebook or Kijiji automation:

- Keep selectors in the platform `selectors.ts` file.
- Prefer accessible locators such as roles and labels before CSS selectors.
- Add fallback locators only where the platform is known to vary.
- Throw clear platform errors so the dashboard can surface useful recovery details.
- Update [docs/selectors.md](docs/selectors.md) when a selector breaks or is replaced.

## Pull Requests

Pull requests should include:

- A short summary of what changed.
- Any relevant screenshots or notes for UI changes.
- Validation commands that passed.
- Any platform behavior that could not be tested locally.
