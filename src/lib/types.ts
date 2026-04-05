export interface Assumption {
  id: string;
  belief: string;
  causal_logic: string;
  invalidation_conditions: string[];
  confidence: number;
  status: "active" | "invalidated";
  asset_tags: string[] | null;
  raw_input: string;
  ai_summary: string | null;
  ai_summary_updated_at: string | null;
  created_at: string;
}

export interface EvidenceEntry {
  id: string;
  assumption_id: string;
  stance: "supports" | "contradicts" | "neutral";
  summary: string;
  source_url: string | null;
  source_label: string | null;
  body: string | null;
  created_at: string;
}

export interface ConfidenceSnapshot {
  id: string;
  assumption_id: string;
  confidence: number;
  trigger: "creation" | "evidence_added" | "review_completed" | "manual";
  created_at: string;
}

export interface ReviewEvent {
  id: string;
  assumption_id: string;
  outcome: "intact" | "invalidated" | "unclear";
  met_condition_index: number | null;
  notes: string | null;
  created_at: string;
}

export interface StructuredAssumption {
  belief: string;
  causal_logic: string;
  invalidation_conditions: string[];
  confidence: number;
}

export interface EvidenceSuggestion {
  summary: string;
  stance: "supports" | "contradicts" | "neutral";
  source_label: string | null;
  body: string | null;
}
