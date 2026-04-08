# TODOS

## P3: Asset Tag Case-Insensitive Matching
Normalize asset tags so "CL" and "cl" link to the same group. Currently free-text, case-sensitive. Options: normalize to uppercase on insert, or use `lower()` in overlap queries.
- **Effort:** S (human: ~30 min / CC: ~5 min)
- **Depends on:** v0.2 board home with asset grouping (shipped)
- **Context:** Flagged during eng review (2026-04-08). Keep free-text for now, add case-insensitive matching when real usage reveals case mismatches. Full normalization (synonym resolution, ticker lookup) is Phase 3.

## P3: QuickAddEvidence error positioning
~~Fix the absolute-positioned error message in `src/components/QuickAddEvidence.tsx:82`.~~
**DONE** — Fixed in v0.2, replaced with relative-positioned error below the form.
