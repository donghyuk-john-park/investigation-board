-- Gnosis v0.2: Thesis Health Dashboard — Schema additions
-- Adds AI analysis cache, seed data support, evidence-condition mapping,
-- asset tag indexing, and DELETE policies.

-- New columns on assumptions
ALTER TABLE assumptions ADD COLUMN analysis_cache JSONB;
ALTER TABLE assumptions ADD COLUMN analysis_cached_at TIMESTAMPTZ;
ALTER TABLE assumptions ADD COLUMN is_seed BOOLEAN NOT NULL DEFAULT false;

-- New columns on evidence_entries
ALTER TABLE evidence_entries ADD COLUMN is_seed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE evidence_entries ADD COLUMN related_condition_index INTEGER;

-- GIN index for asset tag overlap queries (powers board home grouping + related assumptions strip)
CREATE INDEX idx_assumptions_asset_tags ON assumptions USING gin(asset_tags);

-- DELETE policies (missing from v0.1, needed for seed data cleanup + future delete)
CREATE POLICY "Users can delete own assumptions"
  ON assumptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete evidence for own assumptions"
  ON evidence_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM assumptions
    WHERE assumptions.id = evidence_entries.assumption_id
    AND assumptions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete snapshots for own assumptions"
  ON confidence_snapshots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM assumptions
    WHERE assumptions.id = confidence_snapshots.assumption_id
    AND assumptions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete reviews for own assumptions"
  ON review_events FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM assumptions
    WHERE assumptions.id = review_events.assumption_id
    AND assumptions.user_id = auth.uid()
  ));
