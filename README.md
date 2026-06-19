# Marketplace Tool

[![CI](https://github.com/Excellonline/market-place/actions/workflows/ci.yml/badge.svg)](https://github.com/Excellonline/market-place/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Electron](https://img.shields.io/badge/Electron-33-47848f)
![React](https://img.shields.io/badge/React-19-149eca)

Marketplace Tool is a Windows desktop app for managing personal Facebook Marketplace and Kijiji Canada listings from one place. It tracks listing age, helps draft cross-platform listings, and provides guarded renew, repost, snooze, scan, and export workflows.

> Important: this app is for personal use. Browser automation against third-party platforms can violate platform terms and may trigger account restrictions. Use only with accounts and listings you own, and keep manual oversight in the loop.

## Highlights

| Area | What it does |
| --- | --- |
| Listing dashboard | Tracks active ads, aging inventory, recent failures, scan progress, and next scheduled scan. |
| Cross-platform compose | Draft one listing with title, description, price, photos, categories, and platform-specific overrides. |
| Safer automation | Uses headed Chromium, action cooldowns, daily caps, pause controls, and captcha/checkpoint detection. |
| Operational history | Records scans, renewals, reposts, creates, deletes, failures, and retryable actions. |
| Local-first data | Stores the SQLite database, photos, browser profiles, logs, and backups on the local machine. |
| Maintenance hooks | Keeps selectors centralized per platform and documents known fragile locator areas. |

## Feature Tour

### Dashboard

- Per-platform health chips with last error details, inline failure screenshot paths, retry actions, and login actions.
- Live scan progress with current platform step and item counters.
- Search plus platform and age filters, with refresh-safe URL state.
- Row actions for renew, repost, snooze, delete, and opening the source listing.
- Bulk renew, repost, delete, and snooze with per-row progress results.

### Compose And Drafts

- Listing composer with title, description, price, notes, and up to 10 photos.
- Drag-to-reorder photos, paste from clipboard, and cover-photo behavior.
- Platform-specific category, condition, and price override fields.
- Draft saving, draft reuse, and multi-platform publish progress.

### Activity And Errors

- Chronological history for scan, renew, repost, create, delete, success, and failure events.
- Filters for platform, action type, and failures-only views.
- One-click retry on failed entries when supported.
- Dedicated errors page with raw messages and screenshot paths.

### Data And Safety

- CSV export for ads and activity.
- Full local backup to zip for database, photos, and logs.
- Browser profiles are excluded from backups for account security.
- Per-ad private notes stay local and are never pushed to platforms.
- Per-platform profile reset for forced re-login.

## Tech Stack

- Electron 33, electron-vite, and electron-builder
- TypeScript, React 19, React Router, TanStack Query, and Zustand
- Tailwind CSS v4 and Lucide icons
- SQLite through `better-sqlite3`
- Playwright with persistent headed Chromium profiles
- Vitest for unit tests

## Getting Started

### Prerequisites

- Windows 10 or Windows 11
- Node.js 22 or newer
- npm
- Git

### Install And Run

```pwsh
npm run setup
npm run dev
```

`npm run setup` installs dependencies, rebuilds native Electron modules, and downloads the Playwright Chromium browser.

### Common Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Electron app in development mode with hot reload. |
| `npm run typecheck` | Run TypeScript checks for main, preload, and renderer code. |
| `npm test` | Run the Vitest unit suite. |
| `npm run build` | Build the Electron app output. |
| `npm run pack:win` | Build an unpacked Windows app directory. |
| `npm run dist:win` | Build a Windows installer into `dist/`. |
| `npm run install:chromium` | Install the Playwright Chromium browser. |
| `npm run rebuild:electron` | Rebuild native dependencies for Electron. |

## Project Structure

```text
src/
  main/         Electron main process, IPC handlers, data layer, schedulers, platform adapters
  preload/      Typed bridge exposed to the renderer
  renderer/     React app, pages, components, hooks, and styles
  shared/       Shared schemas, categories, and TypeScript types
tests/
  unit/         Vitest coverage for data, scheduling, parsing, actions, and photos
docs/
  selectors.md  Selector maintenance notes for marketplace adapters
```

## Local Data

User data is stored under `%APPDATA%\marketplace-tool\`.

| Path | Purpose |
| --- | --- |
| `marketplace.db` | SQLite database for ads, drafts, history, settings, and notes. |
| `photos\` | Content-addressed original photo storage. |
| `photos\thumbs\` | Generated dashboard thumbnails. |
| `profiles\facebook\` | Facebook Marketplace Playwright browser profile. |
| `profiles\kijiji\` | Kijiji Playwright browser profile. |
| `logs\` | App logs and failure screenshots. |

The app keeps platform login state inside local Playwright profiles. Do not commit profiles, cookies, exported backups, logs, screenshots, or database files.

## Automation Posture

Marketplace Tool is intentionally conservative:

- Headed Chromium only.
- One browser profile per platform.
- Mutex-protected platform operations.
- Human-like delays and typing behavior.
- Per-ad cooldown before repeated automated actions.
- Daily action caps per platform.
- Global, per-platform, and per-ad pause controls.
- Captcha and checkpoint detection that pauses automation and surfaces the failure.

## Maintaining Platform Adapters

Marketplace UIs change often. Keep selectors centralized in:

- `src/main/platforms/facebook/selectors.ts`
- `src/main/platforms/kijiji/selectors.ts`

When a locator changes, update the selector file and record the change in [docs/selectors.md](docs/selectors.md).

## Testing

The unit suite covers:

- Database repositories and filters
- Action orchestration with mocked adapters
- Cooldowns, snoozing, and daily caps
- Cron parsing edge cases
- Human-readable time formatting
- Photo import, hashing, type detection, and thumbnails
- Facebook and Kijiji parser behavior

Run:

```pwsh
npm run typecheck
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, pull request expectations, and adapter maintenance notes.

## Security

See [SECURITY.md](SECURITY.md) before reporting vulnerabilities or sharing logs. Do not post cookies, profile folders, database files, screenshots with private listing data, or account details in public issues.

## Status

Version `0.1.0` is a personal-use desktop automation tool. It is not affiliated with Facebook, Meta, Kijiji, or their parent companies.
