import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeEvidence } from "@/lib/ai";
import { recomputeSummary } from "@/lib/recompute-summary";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { assumption_id, text, source_url } = body;

  if (!assumption_id)
    return NextResponse.json(
      { error: "assumption_id is required" },
      { status: 400 }
    );

  // Fetch the assumption for context
  const { data: assumption, error: aError } = await supabase
    .from("assumptions")
    .select("belief, causal_logic, invalidation_conditions")
    .eq("id", assumption_id)
    .single();

  if (aError || !assumption)
    return NextResponse.json({ error: "Assumption not found" }, { status: 404 });

  // Try AI categorization
  let suggestion;
  try {
    suggestion = await categorizeEvidence(text || "", assumption);
  } catch {
    suggestion = {
      summary: (text || "").slice(0, 300),
      stance: body.stance || "neutral",
      source_label: null,
      body: null,
    };
  }

  const evidenceData = {
    assumption_id,
    stance: body.stance || suggestion.stance,
    summary: body.summary || suggestion.summary,
    source_url: source_url || null,
    source_label: body.source_label || suggestion.source_label,
    body: body.body || suggestion.body,
    related_condition_index: suggestion.related_condition_index ?? body.related_condition_index ?? null,
  };

  const { data: entry, error } = await supabase
    .from("evidence_entries")
    .insert(evidenceData)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Create confidence snapshot if confidence was adjusted
  if (body.confidence !== undefined) {
    await supabase.from("confidence_snapshots").insert({
      assumption_id,
      confidence: body.confidence,
      trigger: "evidence_added",
    });
    await supabase
      .from("assumptions")
      .update({ confidence: body.confidence })
      .eq("id", assumption_id);
  }

  // Invalidate analysis cache so next dashboard load triggers fresh AI analysis
  await supabase
    .from("assumptions")
    .update({ analysis_cache: null, analysis_cached_at: null })
    .eq("id", assumption_id);

  // Trigger summary recompute (async, non-blocking)
  recomputeSummary(supabase, assumption_id, assumption).catch(() => {});

  return NextResponse.json({ entry, suggestion }, { status: 201 });
}

