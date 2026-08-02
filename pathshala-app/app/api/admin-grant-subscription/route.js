import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service-role client — only ever used server-side. Bypasses RLS, so we must
// verify the caller is actually an admin before doing anything with it.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { action, studentId, classLevel } = await req.json();

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
  }

  if (action === "grant") {
    const starts = new Date();
    const ends = new Date();
    ends.setFullYear(ends.getFullYear() + 1);

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      student_id: studentId,
      class_level: classLevel,
      plan_type: "admin_grant",
      status: "active",
      amount: 0,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "revoke") {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("student_id", studentId)
      .eq("status", "active");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
