import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assessThesisHealth,
  generateCounterView,
  identifyMissingEvidence,
  generateStateShift,
} from "@/lib/ai";
import type { ThesisAnalysis } from "@/lib/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: assumption, error: aError } = await supabase
    .from("assumptions")
    .select("*")
    .eq("id", id)
    .single();

  if (aError || !assumption)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check cache (skip if force refresh requested)
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && assumption.analysis_cache && assumption.analysis_cached_at) {
    const cachedAt = new Date(assumption.analysis_cached_at).getTime();
    if (Date.now() - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(assumption.analysis_cache);
    }
  }

  // Fetch evidence and reviews for analysis context
  const [evidenceResult, reviewsResult] = await Promise.all([
    supabase
      .from("evidence_entries")
      .select("summary, stance, created_at")
      .eq("assumption_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("review_events")
      .select("outcome, created_at")
      .eq("assumption_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const evidence = (evidenceResult.data || []) as Array<{
    summary: string;
    stance: "supports" | "contradicts" | "neutral";
    created_at: string;
  }>;
  const reviews = (reviewsResult.data || []) as Array<{
    outcome: "intact" | "invalidated" | "unclear";
    created_at: string;
  }>;

  const lastReviewDate = reviews.length > 0 ? reviews[0].created_at : null;

  // Call all 4 AI functions in parallel
  const [healthResult, counterResult, missingResult, shiftResult] =
    await Promise.allSettled([
      assessThesisHealth(assumption, evidence, reviews),
      generateCounterView(assumption, evidence),
      identifyMissingEvidence(assumption, evidence),
      generateStateShift(assumption, evidence, lastReviewDate),
    ]);

  const analysis: ThesisAnalysis = {
    health: healthResult.status === "fulfilled" ? healthResult.value : null,
    counter: counterResult.status === "fulfilled" ? counterResult.value : null,
    missing: missingResult.status === "fulfilled" ? missingResult.value : null,
    stateShift: shiftResult.status === "fulfilled" ? shiftResult.value : null,
  };

  // Write to cache (non-blocking, best-effort)
  supabase
    .from("assumptions")
    .update({
      analysis_cache: analysis,
      analysis_cached_at: new Date().toISOString(),
    })
    .eq("id", id)
    .then(() => {});

  return NextResponse.json(analysis);
}
