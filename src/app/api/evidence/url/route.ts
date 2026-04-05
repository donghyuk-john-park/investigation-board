import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromUrl } from "@/lib/ai";
import { recomputeSummary } from "@/lib/recompute-summary";
import { fetchUrlContent, validateUrl } from "@/lib/url-fetch";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { assumption_id, url } = body;

  if (!assumption_id || !url)
    return NextResponse.json(
      { error: "assumption_id and url are required" },
      { status: 400 }
    );

  // Validate URL (SSRF check)
  try {
    validateUrl(url);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }

  // Fetch assumption for context
  const { data: assumption, error: aError } = await supabase
    .from("assumptions")
    .select("belief, causal_logic, invalidation_conditions")
    .eq("id", assumption_id)
    .single();

  if (aError || !assumption)
    return NextResponse.json({ error: "Assumption not found" }, { status: 404 });

  // Try to fetch and extract from URL
  let suggestion;
  try {
    const { title, content } = await fetchUrlContent(url);
    suggestion = await extractFromUrl(content, title, assumption);
  } catch {
    // URL fetch or AI extraction failed — return partial data
    return NextResponse.json({
      fallback: true,
      suggestion: {
        summary: "",
        stance: "neutral" as const,
        source_label: null,
        body: null,
        source_url: url,
      },
    });
  }

  // Save the evidence entry
  const { data: entry, error } = await supabase
    .from("evidence_entries")
    .insert({
      assumption_id,
      stance: suggestion.stance,
      summary: suggestion.summary,
      source_url: url,
      source_label: suggestion.source_label,
      body: suggestion.body,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger summary recompute
  recomputeSummary(supabase, assumption_id, assumption).catch(() => {});

  return NextResponse.json({ entry, suggestion }, { status: 201 });
}

