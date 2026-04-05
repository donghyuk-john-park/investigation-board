# Changelog

All notable changes to Gnosis will be documented in this file.

## [0.1.1.0] - 2026-04-05

### Fixed
- Invalidation condition inputs on the new assumption form are now accessible to screen readers (added aria-labels)
- Unauthenticated users who try to create an assumption now see a helpful "sign in" link instead of a generic "Unauthorized" error
- Crisis review submission now surfaces API errors instead of silently swallowing them
- Review page no longer shows a misleading creation date as the invalidation date

### Added
- Vitest + Testing Library test framework with 19 passing tests across 4 suites
- GitHub Actions CI pipeline for automated test runs on push and PR
- gstack skill routing rules in CLAUDE.md for better AI workflow integration
- QA report with health score baseline (92 → 100)
