# Security

Please report vulnerabilities privately, not in an issue or the Discord server:

1. **GitHub private vulnerability reporting** (preferred): [report a vulnerability](https://github.com/haruhimemoe/tourney.haruhime.moe/security/advisories/new) on this repository.
2. **Email**: haruhime@haruhime.moe, if you can't use GitHub.

Include steps to reproduce and the impact you expect. You'll get a reply within 7 days.

In scope: this repository and the live site at https://tourney.haruhime.moe, its JSON routes (`/api/manage/*` for hosts, `/api/editions/*` for registration, `/api/availability`, `/api/admin/*`), how it reads the haruhime.moe session and signs out of it (`/api/session`, `/api/signout`, `src/lib/auth.ts`; sign-in itself is the hub's), and the account export and delete routes the hub calls (`/api/internal/account/*`). Host rules text is rendered through a small Markdown subset, never as HTML or MDX; report a way around that the same way. Only the current `main` branch and the live site are supported.

The `@haruhimemoe` packages tourney uses have their own repositories and SECURITY.md files; report problems with them there. Report problems in third-party services (osu!, pools.haruhime.moe) to those services.

## Database user

tourney expects a MongoDB user with readWrite on the `tourney` database and read on the hub's `identity` database, and refuses to run when its user can reach any other database or write to `identity`. Setting `TOURNEY_ALLOW_SHARED_DB_USER=true` turns the first check off. The user must still have readWrite on `tourney`, and tourney logs a warning naming the other databases (never the connection string). The risk: a bug in tourney, or a leaked tourney credential, could then read and change those databases too. Leave it unset unless you accept that.
