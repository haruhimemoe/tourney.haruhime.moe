# Changelog

All notable changes to this site are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CodeQL and a gitleaks history scan run in CI, and Dependabot keeps dependencies and pinned actions current.
- A tabbed edition settings page (General, Socials, Contact, Registration, Modules) at `/manage/[lineage]/[edition]/settings`. The Modules tab is a placeholder for now. Lineage-level default editing stays API-only (`/api/manage/[lineage]/defaults`); there's no settings UI for it yet.
- The Modules tab now lists every registered module as a card (name, description, a switch, and a Settings link once it's on and the module has one), reading "No modules available yet" while the registry is empty. `PUT /api/manage/[lineage]/modules` turns a module on or off for admins and the owner, refusing an unregistered id and a lineage already at 32 modules, both with 400.
- The public edition page shows the host's social links (Discord gets an icon; the rest show as text) when the edition has any.
- The public edition page shows a "Questions? Contact staff" line with the host's Discord handle and/or a mailto link, when either is set.

### Changed

- Dependencies are on their latest versions, including msw 3 in the tests.
- Times now show the hub's display preferences (time zone, 12h/24h, set at haruhime.moe/account#time) first, falling back to the saved profile zone and then the browser. A time hint with a link to that page sits in the manage and dashboard headers. next-kit 0.18.0.
