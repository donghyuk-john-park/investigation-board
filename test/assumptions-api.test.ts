import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Assumption } from "@/lib/types";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockOverlaps = vi.fn();
const mockNeq = vi.fn();
const mockStructureAssumption = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/ai", () => ({
  structureAssumption: (...args: unknown[]) => mockStructureAssumption(...args),
}));

const { GET, POST } = await import("@/app/api/assumptions/route");

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/assumptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAssumption(
  id: string,
  overrides: Partial<Assumption> = {}
): Assumption {
  return {
    id,
    belief: `Belief ${id}`,
    causal_logic: "IF signal THEN thesis",
    invalidation_conditions: ["Signal breaks"],
    confidence: 7,
    status: "active",
    asset_tags: ["CL"],
    raw_input: `Raw ${id}`,
    ai_summary: null,
    ai_summary_updated_at: null,
    analysis_cache: null,
    analysis_cached_at: null,
    is_seed: false,
    created_at: "2026-04-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("GET /api/assumptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const queryBuilder = {
      overlaps: mockOverlaps,
      neq: mockNeq,
      order: mockOrder,
    };

    mockOverlaps.mockReturnValue(queryBuilder);
    mockNeq.mockReturnValue(queryBuilder);

    mockFrom.mockImplementation((table: string) => {
      if (table === "assumptions") {
        return {
          select: mockSelect.mockReturnValue(queryBuilder),
        };
      }

      return {};
    });
  });

  it("filters by shared asset tags, excludes the current assumption, and sorts related results", async () => {
    mockOrder.mockResolvedValue({
      data: [
        makeAssumption("newest-no-score", {
          asset_tags: ["XLE"],
          created_at: "2026-04-22T00:00:00.000Z",
        }),
        makeAssumption("risk-mid", {
          asset_tags: ["CL", "BNO"],
          analysis_cache: {
            health: {
              score: 6,
              label: "moderate_risk",
              reasoning: "Watch closely",
              condition_status: [],
            },
            counter: null,
            missing: null,
            stateShift: null,
          },
        }),
        makeAssumption("risk-high", {
          asset_tags: ["CL"],
          analysis_cache: {
            health: {
              score: 2,
              label: "critical",
              reasoning: "At risk",
              condition_status: [],
            },
            counter: null,
            missing: null,
            stateShift: null,
          },
        }),
        makeAssumption("older-no-score", {
          asset_tags: ["XLE"],
          created_at: "2026-04-01T00:00:00.000Z",
        }),
      ],
      error: null,
    });

    const res = await GET(
      new NextRequest(
        "http://localhost/api/assumptions?asset_tags=CL,XLE&exclude_id=current-id&limit=3"
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockOverlaps).toHaveBeenCalledWith("asset_tags", ["CL", "XLE"]);
    expect(mockNeq).toHaveBeenCalledWith("id", "current-id");
    expect(body.map((item: Assumption) => item.id)).toEqual([
      "risk-high",
      "risk-mid",
      "newest-no-score",
    ]);
  });

  it("returns the default assumption list unchanged when no related filters are provided", async () => {
    mockOrder.mockResolvedValue({
      data: [
        makeAssumption("a-1", { created_at: "2026-04-23T00:00:00.000Z" }),
        makeAssumption("a-2", { created_at: "2026-04-22T00:00:00.000Z" }),
      ],
      error: null,
    });

    const res = await GET(new NextRequest("http://localhost/api/assumptions"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockOverlaps).not.toHaveBeenCalled();
    expect(mockNeq).not.toHaveBeenCalled();
    expect(body.map((item: Assumption) => item.id)).toEqual(["a-1", "a-2"]);
  });
});

describe("POST /api/assumptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === "assumptions") {
        return {
          insert: mockInsert.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: { id: "a-1", confidence: 7 },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "confidence_snapshots") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      return {};
    });
  });

  it("returns 502 with actual AI error when AI fails and no manual fields provided", async () => {
    mockStructureAssumption.mockRejectedValue(
      new Error("Incorrect API key provided")
    );

    const req = makePostRequest({ raw_input: "Oil thesis" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Incorrect API key provided");
  });

  it("returns 422 when AI detects no thesis in input", async () => {
    const err = new Error(
      "Could not identify an investment thesis in this text."
    );
    err.name = "NoThesisError";
    mockStructureAssumption.mockRejectedValue(err);

    const req = makePostRequest({ raw_input: "Hello world" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("Could not identify");
  });

  it("falls back to manual fields when AI fails but manual fields are present", async () => {
    mockStructureAssumption.mockRejectedValue(new Error("API error"));

    const req = makePostRequest({
      raw_input: "Oil thesis",
      belief: "Oil will rise",
      invalidation_conditions: ["OPEC increases production"],
      confidence: 8,
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns AI-structured data on success", async () => {
    mockStructureAssumption.mockResolvedValue({
      belief: "Oil prices will rise",
      causal_logic: "IF OPEC cuts THEN price rises",
      invalidation_conditions: ["OPEC reverses cuts"],
      confidence: 7,
    });

    const req = makePostRequest({ raw_input: "Oil thesis" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.assumption.id).toBe("a-1");
  });
});
