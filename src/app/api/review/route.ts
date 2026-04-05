import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSummary } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { assumption_id, outcome, met_condition_index, notes, confidence } = body;

  if (!assumption_id || !outcome)
    return NextResponse.json(
      { error: "assumption_id and outcome are required" },
      { status: 400 }
    );

  if (!["intact", "invalidated", "unclear"].includes(outcome))
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });

  // Log the review event
  const { error: reviewError } = await supabase
    .from("review_events")
    .insert({
      assumption_id,
      outcome,
      met_condition_index: met_condition_index ?? null,
      notes: notes || null,
    });

  if (reviewError)
    return NextResponse.json({ error: reviewError.message }, { status: 500 });

  // Update assumption status if invalidated
  if (outcome === "invalidated") {
    await supabase
      .from("assumptions")
      .update({ status: "invalidated" })
      .eq("id", assumption_id);
  }

  // Create confidence snapshot for review completion
  if (confidence !== undefined) {
    await supabase.from("confidence_snapshots").insert({
      assumption_id,
      confidence,
      trigger: "review_completed",
    });
    await supabase
      .from("assumptions")
      .update({ confidence })
      .eq("id", assumption_id);
  }

  return NextResponse.json({ success: true });
}

// GET: Check if summary needs recompute (stale check for crisis review)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assumptionId = request.nextUrl.searchParams.get("assumption_id");
  if (!assumptionId)
    return NextResponse.json({ error: "assumption_id required" }, { status: 400 });

  // Fetch assumption
  const { data: assumption } = await supabase
    .from("assumptions")
    .select("*")
    .eq("id", assumptionId)
    .single();

  if (!assumption)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if summary is stale (last evidence is newer than last summary)
  const { data: latestEvidence } = await supabase
    .from("evidence_entries")
    .select("created_at")
    .eq("assumption_id", assumptionId)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastEvidenceTime = latestEvidence?.[0]?.created_at;
  const summaryTime = assumption.ai_summary_updated_at;

  const isStale =
    lastEvidenceTime && (!summaryTime || lastEvidenceTime > summaryTime);

  if (isStale) {
    // Recompute synchronously
    try {
      const { data: allEvidence } = await supabase
        .from("evidence_entries")
        .select("summary, stance, created_at")
        .eq("assumption_id", assumptionId)
        .order("created_at", { ascending: false });

      if (allEvidence && allEvidence.length > 0) {
        const summary = await generateSummary(assumption, allEvidence);
        await supabase
          .from("assumptions")
          .update({
            ai_summary: summary,
            ai_summary_updated_at: new Date().toISOString(),
          })
          .eq("id", assumptionId);

        return NextResponse.json({
          recomputed: true,
          summary,
        });
      }
    } catch {
      // Fallback to existing summary
      return NextResponse.json({
        recomputed: false,
        summary: assumption.ai_summary,
        stale: true,
      });
    }
  }

  return NextResponse.json({
    recomputed: false,
    summary: assumption.ai_summary,
    stale: false,
  });
}
