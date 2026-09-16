import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { claimId, action } = await req.json();

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!claimId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Missing claimId or invalid action" }, { status: 400 });
  }

  const { data: claim, error: claimError } = await supabaseAdmin
    .from("payment_claims")
    .select("*")
    .eq("id", claimId)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "pending") {
    return NextResponse.json({ error: "This claim has already been reviewed" }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("payment_claims")
    .update({
      status: action === "approve" ? "verified" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "approve") {
    const starts = new Date();
    const ends = new Date();
    ends.setFullYear(ends.getFullYear() + 1);

    const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
      student_id: claim.student_id,
      class_level: claim.class_level,
      plan_type: "upi_manual",
      status: "active",
      amount: claim.amount_paise,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });

    if (subError) {
      return NextResponse.json({ error: "Claim marked verified, but activating the subscription failed: " + subError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
