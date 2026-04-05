import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { structureAssumption } from "@/lib/ai";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("assumptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { raw_input, asset_tags } = body;

  if (!raw_input || typeof raw_input !== "string") {
    return NextResponse.json(
      { error: "raw_input is required" },
      { status: 400 }
    );
  }

  // Try AI structuring, fall back to manual fields from body
  let structured;
  try {
    structured = await structureAssumption(raw_input);
  } catch {
    // AI failed — use manually provided fields or defaults
    structured = {
      belief: body.belief || "",
      causal_logic: body.causal_logic || "",
      invalidation_conditions: body.invalidation_conditions || [],
      confidence: body.confidence || 5,
    };
  }

  // Allow user overrides
  const finalData = {
    belief: body.belief || structured.belief,
    causal_logic: body.causal_logic || structured.causal_logic,
    invalidation_conditions:
      body.invalidation_conditions || structured.invalidation_conditions,
    confidence: body.confidence ?? structured.confidence,
    status: "active" as const,
    asset_tags: asset_tags || null,
    raw_input,
    user_id: user.id,
  };

  if (
    !finalData.belief ||
    !finalData.invalidation_conditions.length
  ) {
    return NextResponse.json(
      { error: "belief and at least one invalidation condition are required" },
      { status: 400 }
    );
  }

  const { data: assumption, error } = await supabase
    .from("assumptions")
    .insert(finalData)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Create initial confidence snapshot
  await supabase.from("confidence_snapshots").insert({
    assumption_id: assumption.id,
    confidence: assumption.confidence,
    trigger: "creation",
  });

  return NextResponse.json({ assumption, structured }, { status: 201 });
}
