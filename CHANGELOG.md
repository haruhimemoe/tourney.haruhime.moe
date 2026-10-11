# Changelog

All notable changes to this site are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CodeQL and a gitleaks history scan run in CI, and Dependabot keeps dependencies and pinned actions current.
- A tabbed edition settings page (General, Socials, Contact, Registration, Modules) at `/manage/[lineage]/[edition]/settings`. The Modules tab is a placeholder for now. Lineage-level default editing stays API-only (`/api/manage/[lineage]/defaults`); there's no settings UI for it yet.

### Changed

- Dependencies are on their latest versions, including msw 3 in the tests.
- Times now show the hub's display preferences (time zone, 12h/24h, set at haruhime.moe/account#time) first, falling back to the saved profile zone and then the browser. A time hint with a link to that page sits in the manage and dashboard headers. next-kit 0.18.0.
