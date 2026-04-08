import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock AI functions
const mockAssessHealth = vi.fn();
const mockCounterView = vi.fn();
const mockMissingEvidence = vi.fn();
const mockStateShift = vi.fn();

vi.mock("@/lib/ai", () => ({
  assessThesisHealth: (...args: unknown[]) => mockAssessHealth(...args),
  generateCounterView: (...args: unknown[]) => mockCounterView(...args),
  identifyMissingEvidence: (...args: unknown[]) => mockMissingEvidence(...args),
  generateStateShift: (...args: unknown[]) => mockStateShift(...args),
}));

const { GET } = await import("@/app/api/assumptions/[id]/analysis/route");

function makeRequest(id: string, force = false) {
  const url = `http://localhost/api/assumptions/${id}/analysis${force ? "?force=1" : ""}`;
  return new NextRequest(url);
}

const mockAssumption = {
  id: "a-1",
  belief: "Oil stays above $85",
  causal_logic: "IF OPEC holds THEN price stays high",
  invalidation_conditions: ["OPEC increases production"],
  analysis_cache: null,
  analysis_cached_at: null,
};

const cachedAnalysis = {
  health: { score: 7, label: "moderate_risk", reasoning: "test", condition_status: [] },
  counter: { argument: "test", grounding: "test" },
  missing: { gaps: [] },
  stateShift: { changes: "test", weakest_link: "test", counter_trend: "test", watch_next: "test" },
};

describe("GET /api/assumptions/[id]/analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    // Default: assumption found, no cache
    mockFrom.mockImplementation((table: string) => {
      if (table === "assumptions") {
        return {
          select: () => ({
            eq: () => ({
              single: mockSingle.mockResolvedValue({ data: mockAssumption, error: null }),
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: () => ({ then: (fn: () => void) => fn() }),
          }),
        };
      }
      // evidence_entries or review_events
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    });

    mockAssessHealth.mockResolvedValue(cachedAnalysis.health);
    mockCounterView.mockResolvedValue(cachedAnalysis.counter);
    mockMissingEvidence.mockResolvedValue(cachedAnalysis.missing);
    mockStateShift.mockResolvedValue(cachedAnalysis.stateShift);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest("a-1"), { params: Promise.resolve({ id: "a-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent assumption", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "Not found" } }),
        }),
      }),
    });
    const res = await GET(makeRequest("bad-id"), { params: Promise.resolve({ id: "bad-id" }) });
    expect(res.status).toBe(404);
  });

  it("returns cached analysis when fresh", async () => {
    const freshCachedAssumption = {
      ...mockAssumption,
      analysis_cache: cachedAnalysis,
      analysis_cached_at: new Date().toISOString(), // Fresh
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "assumptions") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: freshCachedAssumption, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }) };
    });

    const res = await GET(makeRequest("a-1"), { params: Promise.resolve({ id: "a-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.health.score).toBe(7);
    // AI functions should NOT have been called
    expect(mockAssessHealth).not.toHaveBeenCalled();
  });

  it("calls AI functions on cache miss", async () => {
    const res = await GET(makeRequest("a-1"), { params: Promise.resolve({ id: "a-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.health).toBeDefined();
    expect(mockAssessHealth).toHaveBeenCalled();
    expect(mockCounterView).toHaveBeenCalled();
    expect(mockMissingEvidence).toHaveBeenCalled();
    expect(mockStateShift).toHaveBeenCalled();
  });

  it("returns partial results when some AI calls fail", async () => {
    mockAssessHealth.mockResolvedValue(cachedAnalysis.health);
    mockCounterView.mockRejectedValue(new Error("API error"));
    mockMissingEvidence.mockResolvedValue(cachedAnalysis.missing);
    mockStateShift.mockRejectedValue(new Error("API error"));

    const res = await GET(makeRequest("a-1"), { params: Promise.resolve({ id: "a-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.health).toBeDefined();
    expect(body.counter).toBeNull();
    expect(body.missing).toBeDefined();
    expect(body.stateShift).toBeNull();
  });

  it("forces refresh when force=1 even with fresh cache", async () => {
    const freshCachedAssumption = {
      ...mockAssumption,
      analysis_cache: cachedAnalysis,
      analysis_cached_at: new Date().toISOString(),
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "assumptions") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: freshCachedAssumption, error: null }),
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: () => ({ then: (fn: () => void) => fn() }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
    });

    const res = await GET(makeRequest("a-1", true), { params: Promise.resolve({ id: "a-1" }) });
    expect(res.status).toBe(200);
    expect(mockAssessHealth).toHaveBeenCalled();
  });
});
