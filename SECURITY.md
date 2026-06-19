# Security Policy

Marketplace Tool stores listing data, photos, logs, and browser profiles locally. Treat those files as private user data.

## Supported Versions

| Version | Supported |
| --- | --- |
| `main` | Yes |
| `0.1.x` | Yes |

## Reporting A Vulnerability

If GitHub private vulnerability reporting is available for this repository, use it for sensitive reports. If it is not available, open a public issue with only a minimal description and ask for a private contact path.

Please do not post any of the following in public issues:

- Cookies, session tokens, or browser profile folders
- SQLite databases or exported backups
- Full logs containing account, listing, or filesystem details
- Screenshots that reveal private listings, conversations, or account data
- Working exploit details

## Local Data Handling

By default, user data lives under `%APPDATA%\marketplace-tool\`. The repository `.gitignore` excludes local databases, photos, browser profiles, logs, and generated build output. Keep those exclusions intact.
