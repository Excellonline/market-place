# Marketplace Tool

Personal desktop app for managing your own listings on Facebook Marketplace and Kijiji Canada. Monitors ad age, lets you renew or repost aging ads with one click, and supports composing a single ad and publishing it to multiple platforms.

> Personal use only. Driving Playwright against Facebook violates their ToS and can result in account bans. Use a non-essential account.

## Stack

- Electron 33 + TypeScript + React 19 + Tailwind v4
- Playwright (headed Chromium, persistent profile per platform)
- SQLite via better-sqlite3 12 (with prebuilt Node 24 + Electron ABI binaries)
- Built with electron-vite, packaged with electron-builder

## Quick start

```pwsh
npm run setup        # installs deps, rebuilds native for Electron, downloads Chromium
npm run dev          # launches dev window with HMR
npm test             # runs vitest (auto-rebuilds for Node, restores for Electron after)
npm run dist:win     # builds a Windows installer to dist/
```

## Data locations

All user data lives under `%APPDATA%/marketplace-tool/`:

- `marketplace.db` — SQLite database (ads, drafts, history, settings, notes)
- `photos/<sha256>.<ext>` — content-addressed photo store (originals)
- `photos/thumbs/<sha256>.jpg` — 96×96 sharp-generated thumbnails for the dashboard
- `profiles/facebook/`, `profiles/kijiji/` — Playwright persistent browser profiles
- `logs/` — pino app log + `failure-*.png` screenshots when an adapter step fails

## Features

### Dashboard
- Per-platform health chips (click for status, last error, inline failure screenshot, retry/login actions)
- Live scan progress bar (per-platform step + counter)
- Stats strip: active ads, aging, actions today, 30-day failure or success rate
- Next-scan countdown
- Search, filter by platform, filter by age range (Fresh / Aging / Old / Any)
- Row actions: Renew (with cooldown indicator), Repost, Snooze, Open on platform
- Bulk select with live progress modal — renew/repost/delete/snooze with per-row results
- URL-synced filters: bookmark `?p=kijiji&q=desk` and refresh-safely

### Compose & Drafts
- Title + description + price + photos (up to 10, drag to reorder, Ctrl/Cmd+V to paste from clipboard, first is the cover)
- Per-platform fields: category, condition, price override
- Save as draft → list all drafts → republish from one click
- Multi-platform publish with progress feedback

### Activity & Errors
- Full chronological history (scan/renew/repost/create/delete + success/fail)
- Filter by platform, action type, failures-only
- One-click retry on failed entries
- Sidebar badge counts recent failures
- Errors page shows raw error message + path to failure screenshot

### Notifications
- Desktop toast + in-app toast for aging ads, scan errors, captchas
- Toggle per category in Settings

### Scheduling & Safety
- node-cron daily scan with cron presets (Daily 9am, Twice daily, etc.) + custom
- Per-platform pause: 1h / 8h / 1d / 1w buttons in Settings
- Global pause toggle for all scheduled scans
- Per-ad snooze with 1h / 8h / 1d / 3d / 1w presets
- 12h cooldown between automated actions on the same ad
- Daily action cap per platform (default 20/30)
- Headed Chromium only, `--disable-blink-features=AutomationControlled`, per-platform mutex
- Captcha / checkpoint detection → pause + notify

### Data
- Export ads to CSV
- Export activity to CSV
- Backup everything (DB + photos + logs) to a zip — excludes browser profiles for security
- Open user data folder
- Per-ad private notes (never pushed to platforms)
- Per-platform reset (deletes the Playwright profile, forces re-login)

### Keyboard shortcuts
- `/` or `⌘K/Ctrl+K` — focus search
- `r` — Scan now
- `x` — clear search
- `g d/c/r/a/e/s` — go to Dashboard / Compose / Drafts / Activity / Errors / Settings
- `?` — show shortcuts
- `Esc` — close dialogs

## Maintenance

When a platform changes its layout and an adapter breaks, you'll see a red health chip with the failing locator name and a screenshot path inside `%APPDATA%/marketplace-tool/logs/`. Update `src/main/platforms/<platform>/selectors.ts` and bump `docs/selectors.md` with the date.

## Tests

40+ unit tests across:
- `repos.test.ts` — DB layer, filtering, undefined-vs-null handling
- `actions.test.ts` — orchestration (renew/delete/repost) with mocked adapters, cooldown, snooze, daily cap
- `cron-next.test.ts` — cron parsing edge cases (lists, ranges, steps, dow=0/7 equivalence, weekday-only)
- `humanize.test.ts` — delay timing, day boundary math
- `photo-store.test.ts` — sha256 dedup, magic-byte detection, import from disk
- `schedule-pause.test.ts` — per-platform pause invariants

Run `npm test` — automatically rebuilds better-sqlite3 for Node first, then restores Electron ABI in `posttest`.

## Safety posture

- Headed browser only (`--disable-blink-features=AutomationControlled`)
- One Chromium per profile, never two operations against the same profile concurrently
- Human-like delays, mouse movement, typing speed
- Per-ad 12h cooldown, configurable daily action cap
- Captcha / checkpoint detection pauses automation and surfaces inline failure screenshots

## Status

v1 complete. See `C:\Users\Sever\.claude\plans\i-want-to-build-zippy-dijkstra.md` for the original implementation plan.
