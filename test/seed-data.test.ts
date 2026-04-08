import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => "mocked",
}));

const { ensureSeedData } = await import("@/lib/seed-data");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSupabase(assumptionCount: number): any {
  const insertedData: Array<Record<string, unknown>> = [];

  return {
    _inserted: insertedData,
    from: (table: string) => ({
      select: (_cols: string, opts?: { count: string; head: boolean }) => {
        if (opts?.head) {
          return {
            eq: () => Promise.resolve({ count: assumptionCount, error: null }),
          };
        }
        return {
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        };
      },
      insert: (data: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(data) ? data : [data];
        insertedData.push(...rows.map((r) => ({ ...r, _table: table })));
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: "seed-a-1", confidence: 7, ...rows[0] },
                error: null,
              }),
          }),
        };
      },
    }),
  };
}

describe("ensureSeedData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts seed data when user has zero assumptions", async () => {
    const supabase = makeSupabase(0);
    const result = await ensureSeedData(supabase, "user-1");
    expect(result).toBe(true);

    // Check that data was inserted with is_seed flag
    const inserted = supabase._inserted;
    const seedAssumption = inserted.find(
      (r: Record<string, unknown>) => r._table === "assumptions"
    );
    expect(seedAssumption).toBeDefined();
    expect(seedAssumption!.is_seed).toBe(true);
    expect(seedAssumption!.user_id).toBe("user-1");

    const seedEvidence = inserted.filter(
      (r: Record<string, unknown>) => r._table === "evidence_entries"
    );
    expect(seedEvidence).toHaveLength(3);
    expect(seedEvidence.every((e: Record<string, unknown>) => e.is_seed === true)).toBe(true);
  });

  it("skips when user already has assumptions (idempotent)", async () => {
    const supabase = makeSupabase(5);
    const result = await ensureSeedData(supabase, "user-1");
    expect(result).toBe(false);

    const inserted = supabase._inserted;
    expect(inserted).toHaveLength(0);
  });

  it("creates confidence snapshot alongside seed data", async () => {
    const supabase = makeSupabase(0);
    await ensureSeedData(supabase, "user-1");

    const inserted = supabase._inserted;
    const snapshot = inserted.find(
      (r: Record<string, unknown>) => r._table === "confidence_snapshots"
    );
    expect(snapshot).toBeDefined();
    expect(snapshot!.trigger).toBe("creation");
  });
});
