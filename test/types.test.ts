import { describe, it, expect } from "vitest";
import type {
  Assumption,
  EvidenceEntry,
  ConfidenceSnapshot,
  ReviewEvent,
} from "@/lib/types";

describe("Type contracts", () => {
  it("Assumption has required fields for display", () => {
    const assumption: Assumption = {
      id: "test-1",
      belief: "Oil will rise",
      causal_logic: "IF demand > supply THEN price rises",
      invalidation_conditions: ["OPEC increases production"],
      confidence: 7,
      status: "active",
      asset_tags: ["CL"],
      raw_input: "I think oil will rise",
      ai_summary: null,
      ai_summary_updated_at: null,
      created_at: new Date().toISOString(),
    };
    expect(assumption.status).toBe("active");
    expect(assumption.invalidation_conditions).toHaveLength(1);
    expect(assumption.confidence).toBeGreaterThanOrEqual(1);
    expect(assumption.confidence).toBeLessThanOrEqual(10);
  });

  it("Assumption status can only be active or invalidated", () => {
    const statuses: Assumption["status"][] = ["active", "invalidated"];
    expect(statuses).toContain("active");
    expect(statuses).toContain("invalidated");
    expect(statuses).toHaveLength(2);
  });

  it("EvidenceEntry stance is one of supports/contradicts/neutral", () => {
    const stances: EvidenceEntry["stance"][] = [
      "supports",
      "contradicts",
      "neutral",
    ];
    expect(stances).toHaveLength(3);
  });

  it("ConfidenceSnapshot trigger types cover all use cases", () => {
    const triggers: ConfidenceSnapshot["trigger"][] = [
      "creation",
      "evidence_added",
      "review_completed",
      "manual",
    ];
    expect(triggers).toHaveLength(4);
  });

  it("ReviewEvent outcome covers all decision paths", () => {
    const outcomes: ReviewEvent["outcome"][] = [
      "intact",
      "invalidated",
      "unclear",
    ];
    expect(outcomes).toHaveLength(3);
  });
});
