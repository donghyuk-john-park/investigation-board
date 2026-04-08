import type { createClient } from "./supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function ensureSeedData(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Check if user already has assumptions
  const { count } = await supabase
    .from("assumptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count !== null && count > 0) return false;

  // Insert seed assumption
  const { data: assumption, error: aError } = await supabase
    .from("assumptions")
    .insert({
      user_id: userId,
      belief:
        "Oil stays above $85 through Q3 2026 due to OPEC discipline and geopolitical supply constraints",
      causal_logic:
        "IF Russia-Ukraine conflict persists AND OPEC maintains production discipline THEN oil stays above $85 BECAUSE supply constraints create a price floor that demand weakness alone cannot break",
      invalidation_conditions: [
        "OPEC announces production increase > 500k bpd",
        "US shale production exceeds 13.5M bpd",
        "Russia-Ukraine ceasefire with sanctions relief timeline",
        "WTI trades below $80 for 5 consecutive sessions",
      ],
      confidence: 7,
      status: "active",
      asset_tags: ["CL", "XLE", "BNO"],
      raw_input:
        "I think oil stays elevated through Q3. OPEC is holding the line, Russia supply is still constrained, and US shale growth is slowing. The floor is around $85 unless something breaks on the demand side.",
      is_seed: true,
    })
    .select()
    .single();

  if (aError || !assumption) return false;

  // Insert seed evidence entries
  const evidenceEntries = [
    {
      assumption_id: assumption.id,
      stance: "supports",
      summary:
        "OPEC+ reaffirms commitment to production quotas at March meeting",
      source_label: "Reuters",
      body: "OPEC+ ministers unanimously agreed to maintain current production targets, with Saudi Arabia signaling willingness to extend voluntary cuts if needed.",
      is_seed: true,
      related_condition_index: 0,
    },
    {
      assumption_id: assumption.id,
      stance: "contradicts",
      summary:
        "EIA reports US crude production hit record 13.3M bpd in latest weekly data",
      source_label: "EIA",
      body: "US crude oil production reached 13.3 million barrels per day, a new weekly record. Permian Basin output continues to grow despite rig count declines.",
      is_seed: true,
      related_condition_index: 1,
    },
    {
      assumption_id: assumption.id,
      stance: "neutral",
      summary:
        "China manufacturing PMI edges up to 50.8, signaling modest demand recovery",
      source_label: "Bloomberg",
      body: "China's official manufacturing PMI rose to 50.8 in March from 50.2, slightly above the expansion threshold. Oil demand implications remain mixed as stimulus measures take effect gradually.",
      is_seed: true,
      related_condition_index: null,
    },
  ];

  await supabase.from("evidence_entries").insert(evidenceEntries);

  // Insert initial confidence snapshot
  await supabase.from("confidence_snapshots").insert({
    assumption_id: assumption.id,
    confidence: 7,
    trigger: "creation",
  });

  return true;
}
