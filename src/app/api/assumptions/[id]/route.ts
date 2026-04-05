import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: assumption, error } = await supabase
    .from("assumptions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !assumption)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: evidence } = await supabase
    .from("evidence_entries")
    .select("*")
    .eq("assumption_id", id)
    .order("created_at", { ascending: false });

  const { data: snapshots } = await supabase
    .from("confidence_snapshots")
    .select("*")
    .eq("assumption_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    assumption,
    evidence: evidence || [],
    snapshots: snapshots || [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.confidence !== undefined) {
    updates.confidence = body.confidence;
    // Create confidence snapshot for manual update
    await supabase.from("confidence_snapshots").insert({
      assumption_id: id,
      confidence: body.confidence,
      trigger: "manual",
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assumptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
