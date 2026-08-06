import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ON_TIME_POINTS = 5;
const LATE_POINTS = 2;

export async function POST(req) {
  const { assignmentId, submission } = await req.json();

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const trimmed = (submission || "").trim();
  if (!assignmentId || !trimmed) {
    return NextResponse.json({ error: "Missing assignmentId or submission" }, { status: 400 });
  }

  // Block duplicate submissions server-side — without this, resubmitting the
  // same assignment repeatedly would award points every time.
  const { data: existing } = await supabaseAdmin
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You've already submitted this assignment." }, { status: 409 });
  }

  const { data: assignment } = await supabaseAdmin.from("assignments").select("due_date").eq("id", assignmentId).single();
  const isOnTime = !assignment?.due_date || new Date() <= new Date(assignment.due_date);
  const pointsAwarded = isOnTime ? ON_TIME_POINTS : LATE_POINTS;

  const { error: insertError } = await supabaseAdmin.from("assignment_submissions").insert({
    assignment_id: assignmentId,
    student_id: user.id,
    file_url: trimmed,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("points").eq("id", user.id).single();
  await supabaseAdmin.from("profiles").update({ points: (profile?.points || 0) + pointsAwarded }).eq("id", user.id);

  return NextResponse.json({ success: true, pointsAwarded, onTime: isOnTime });
}
