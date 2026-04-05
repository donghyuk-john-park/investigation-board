import { createClient } from "./supabase/server";
import { generateSummary } from "./ai";

export async function recomputeSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assumptionId: string,
  assumption: { belief: string; causal_logic: string; invalidation_conditions: string[] }
) {
  const { data: allEvidence } = await supabase
    .from("evidence_entries")
    .select("summary, stance, created_at")
    .eq("assumption_id", assumptionId)
    .order("created_at", { ascending: false });

  if (!allEvidence || allEvidence.length === 0) return;

  try {
    const summary = await generateSummary(assumption, allEvidence as { summary: string; stance: "supports" | "contradicts" | "neutral"; created_at: string }[]);
    await supabase
      .from("assumptions")
      .update({
        ai_summary: summary,
        ai_summary_updated_at: new Date().toISOString(),
      })
      .eq("id", assumptionId);
  } catch {
    // Summary recompute failed — not critical, fallback to raw counts at display time
  }
}
