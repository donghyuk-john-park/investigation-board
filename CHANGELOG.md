# Changelog

All notable changes to Gnosis will be documented in this file.

## [0.2.0.0] - 2026-04-08

Gnosis becomes an investigation board. AI now actively manages your theses instead of just structuring them. One screen shows everything you need during a market crisis.

### Added
- **AI Thesis Health Score** — rates each thesis 1-10 with per-condition status (unmet, approaching, met). Uses GPT-4o for judgment-quality assessment.
- **AI Strongest Counter-View** — devil's advocate panel generates the best argument against your thesis, grounded in your logged evidence.
- **AI Missing Evidence** — identifies 3-5 specific data points, events, or signals you should be tracking but haven't logged.
- **AI State-Shift Summary** — shows what changed since your last review: new evidence patterns, weakest link, counter-evidence trends, what to watch next.
- **Thesis Dashboard** — single-screen view replacing the old 3-page flow. Hero thesis, 2x2 AI intelligence grid, invalidation conditions with AI status, confidence chart, evidence timeline, and related assumptions strip.
- **Board Home with Asset Grouping** — assumptions grouped by asset tag (CL, XLE, BNO) with color-coded health badges for instant triage. Most at-risk theses surface first.
- **Crisis Modal** — "Check Thesis" now opens as an overlay on the dashboard (via ?crisis=1 URL param), keeping all context visible while you decide.
- **Cold Start Seed Data** — first-time users see a pre-loaded oil thesis with 3 evidence entries demonstrating how Gnosis works. Dismissible "Clear sample data" banner.
- **Thesis Templates** — 5 category templates (Geopolitical, Macro/Rates, Earnings/Sector, Commodity, Crypto) pre-fill invalidation conditions on the creation form.
- **Related Assumptions Strip** — horizontal scroll showing other theses sharing the same asset tags, with health scores.
- **Evidence-Condition Mapping** — AI now links each evidence entry to the specific invalidation condition it relates to.
- **DELETE endpoint** for assumptions (with ON DELETE CASCADE cleanup).
- **callStructured() helper** — DRY helper for all OpenAI structured JSON calls, reducing boilerplate across 8 AI functions.
- CSS custom properties for health badge and AI panel colors.
- 19 new tests across 3 test files (AI functions, analysis API, seed data).

### Changed
- Assumption detail page rebuilt as thesis dashboard (absorbs crisis review page).
- Board home refactored from flat list to asset-grouped layout with health indicators.
- Evidence categorization now returns `related_condition_index` mapping evidence to specific invalidation conditions.
- Both evidence and review routes now invalidate the AI analysis cache to ensure fresh data.

### Fixed
- QuickAddEvidence error message positioning changed from absolute to relative layout (no more viewport-dependent misalignment).

### Removed
- Standalone crisis review page (`/assumptions/[id]/review`) — absorbed into thesis dashboard modal.

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
