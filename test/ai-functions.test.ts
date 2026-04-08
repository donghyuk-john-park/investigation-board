import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

const {
  callStructured,
  assessThesisHealth,
  generateCounterView,
  identifyMissingEvidence,
  generateStateShift,
} = await import("@/lib/ai");

function mockAIResponse(content: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

const sampleAssumption = {
  belief: "Oil stays above $85",
  causal_logic: "IF OPEC holds THEN price stays high",
  invalidation_conditions: ["OPEC increases production", "Shale exceeds 13.5M bpd"],
};

const sampleEvidence = [
  { summary: "OPEC holds quotas", stance: "supports" as const, created_at: "2026-03-15" },
  { summary: "Shale hits 13.3M bpd", stance: "contradicts" as const, created_at: "2026-04-01" },
];

describe("callStructured", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validated parsed JSON from AI response", async () => {
    mockAIResponse('{"value": 42}');
    const result = await callStructured(
      "gpt-4o-mini",
      0.2,
      "Return JSON",
      "test",
      (parsed) => ({ value: Number(parsed.value) })
    );
    expect(result).toEqual({ value: 42 });
  });

  it("throws on empty AI response", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(
      callStructured("gpt-4o-mini", 0.2, "Return JSON", "test", (p) => p)
    ).rejects.toThrow("Empty AI response");
  });

  it("throws on malformed JSON", async () => {
    mockAIResponse("not json at all");
    await expect(
      callStructured("gpt-4o-mini", 0.2, "Return JSON", "test", (p) => p)
    ).rejects.toThrow();
  });

  it("propagates OpenAI API errors", async () => {
    mockCreate.mockRejectedValue(new Error("Rate limit exceeded"));
    await expect(
      callStructured("gpt-4o-mini", 0.2, "Return JSON", "test", (p) => p)
    ).rejects.toThrow("Rate limit exceeded");
  });
});

describe("assessThesisHealth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid health score with condition status", async () => {
    mockAIResponse(JSON.stringify({
      score: 6,
      label: "moderate_risk",
      reasoning: "Mixed signals in evidence log.",
      condition_status: [
        { index: 0, status: "unmet", note: "No OPEC increase" },
        { index: 1, status: "approaching", note: "Shale at 13.3M, threshold 13.5M" },
      ],
    }));

    const result = await assessThesisHealth(sampleAssumption, sampleEvidence, []);
    expect(result.score).toBe(6);
    expect(result.label).toBe("moderate_risk");
    expect(result.condition_status).toHaveLength(2);
    expect(result.condition_status[1].status).toBe("approaching");
  });

  it("clamps score to 1-10 range", async () => {
    mockAIResponse(JSON.stringify({
      score: 15,
      label: "healthy",
      reasoning: "Everything is great",
      condition_status: [],
    }));

    const result = await assessThesisHealth(sampleAssumption, [], []);
    expect(result.score).toBe(10);
  });
});

describe("generateCounterView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns counter argument and grounding", async () => {
    mockAIResponse(JSON.stringify({
      argument: "US shale is breaking the supply constraint thesis.",
      grounding: "Based on EIA data showing record 13.3M bpd.",
    }));

    const result = await generateCounterView(sampleAssumption, sampleEvidence);
    expect(result.argument).toContain("shale");
    expect(result.grounding).toContain("EIA");
  });
});

describe("identifyMissingEvidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns evidence gaps array", async () => {
    mockAIResponse(JSON.stringify({
      gaps: [
        { description: "China demand recovery data", importance: "Key swing factor for oil demand" },
        { description: "OPEC meeting signals", importance: "Next meeting Jun 1" },
      ],
    }));

    const result = await identifyMissingEvidence(sampleAssumption, sampleEvidence);
    expect(result.gaps).toHaveLength(2);
    expect(result.gaps[0].description).toContain("China");
  });

  it("works with zero evidence (thesis-only analysis)", async () => {
    mockAIResponse(JSON.stringify({
      gaps: [{ description: "Any evidence at all", importance: "No data to evaluate" }],
    }));

    const result = await identifyMissingEvidence(sampleAssumption, []);
    expect(result.gaps.length).toBeGreaterThan(0);
  });
});

describe("generateStateShift", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns state shift analysis", async () => {
    mockAIResponse(JSON.stringify({
      changes: "2 new contradicting evidence entries since last review.",
      weakest_link: "Supply-side assumption is most vulnerable.",
      counter_trend: "Counter-evidence ratio went from 25% to 50%.",
      watch_next: "EIA inventory report on Apr 10.",
    }));

    const result = await generateStateShift(sampleAssumption, sampleEvidence, "2026-03-20");
    expect(result.changes).toContain("contradicting");
    expect(result.watch_next).toContain("EIA");
  });

  it("handles no prior reviews gracefully", async () => {
    mockAIResponse(JSON.stringify({
      changes: "First analysis. No prior baseline to compare.",
      weakest_link: "Unable to determine without prior data.",
      counter_trend: "1 supporting, 1 contradicting",
      watch_next: "Track OPEC decision",
    }));

    const result = await generateStateShift(sampleAssumption, sampleEvidence, null);
    expect(result.changes).toBeDefined();
  });
});
