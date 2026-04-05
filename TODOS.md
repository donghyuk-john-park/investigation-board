# TODOS

## P2: Cold Start Sample Data
Pre-load one example assumption (oil/geopolitics thesis) with sample invalidation conditions and 2-3 evidence entries. Demonstrates the circuit breaker flow on day one without the user having to build up state first.
- **Effort:** S (human: ~30 min / CC: ~5 min)
- **Depends on:** Core assumption creation flow + evidence log
- **Context:** Flagged by outside voice in eng review (2026-04-05). The circuit breaker only works if the evidence log has entries. An empty app at first crisis is worse than no app. Seed data mirrors the founder's own oil trade experience.

## P3: Assumption Templates
Pre-built templates for common thesis types (Geopolitical, Macro/Rates, Earnings/Sector, Commodity, Crypto) with pre-populated invalidation condition suggestions. Reduces creation friction and helps users think about conditions they might miss.
- **Effort:** S (human: ~2 hours / CC: ~15 min)
- **Depends on:** Core assumption creation flow
- **Context:** Deferred from CEO review (2026-04-05). Static JSON templates + UI selector on assumption creation form. Start with 5 categories, each with 4-6 suggested invalidation conditions.
