# Changelog

All notable changes to Gnosis will be documented in this file.

## [0.1.2.0] - 2026-04-06

Design review: 7 visual and accessibility fixes from a full /design-review audit.

### Fixed
- Keyboard users can now see where they are (added focus-visible ring to all interactive elements)
- Nav links enlarged to meet 44px minimum touch target for mobile accessibility
- Input font size bumped to 16px to prevent iOS Safari auto-zoom on focus
- Confidence slider now matches the dark theme (was default browser chrome)
- Page headings normalized to consistent size across all views
- Root layout auth check wrapped in try/catch to prevent total app crash on Supabase outage

### Changed
- Nav links ("Assumptions", "+ New") now hidden for unauthenticated users, reducing confusion on first visit
- Disabled "Save Assumption" button now shows a hint explaining which fields are required
- Extracted shared validation condition to prevent logic duplication between button and hint text

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
