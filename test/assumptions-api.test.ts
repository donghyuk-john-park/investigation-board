import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock AI
const mockStructureAssumption = vi.fn();
vi.mock("@/lib/ai", () => ({
  structureAssumption: (...args: unknown[]) => mockStructureAssumption(...args),
}));

// Import after mocks
const { POST } = await import("@/app/api/assumptions/route");

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/assumptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/assumptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: "a-1", confidence: 7 },
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        order: mockOrder,
      }),
    });
  });

  it("returns 502 with actual AI error when AI fails and no manual fields provided", async () => {
    mockStructureAssumption.mockRejectedValue(new Error("Incorrect API key provided"));

    const req = makeRequest({ raw_input: "Oil thesis" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("Incorrect API key provided");
  });

  it("returns 422 when AI detects no thesis in input", async () => {
    const err = new Error("Could not identify an investment thesis in this text.");
    err.name = "NoThesisError";
    mockStructureAssumption.mockRejectedValue(err);

    const req = makeRequest({ raw_input: "Hello world" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("Could not identify");
  });

  it("falls back to manual fields when AI fails but manual fields are present", async () => {
    mockStructureAssumption.mockRejectedValue(new Error("API error"));

    const req = makeRequest({
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

    const req = makeRequest({ raw_input: "Oil thesis" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.assumption.id).toBe("a-1");
  });
});
