import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { testId, answers } = await req.json();

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }

  // Block duplicate attempts server-side — the UI already hides the button after
  // a completed test, but that's trivially bypassable by calling this (or the old
  // direct insert) again, so this is the real enforcement point.
  const { data: existing } = await supabaseAdmin
    .from("test_attempts")
    .select("id")
    .eq("test_id", testId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You've already completed this test." }, { status: 409 });
  }

  const { data: test, error: testError } = await supabaseAdmin
    .from("tests")
    .select("questions")
    .eq("id", testId)
    .single();

  if (testError || !test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = test.questions || [];
  const mcqQuestions = questions.filter((q) => q.type !== "short");

  // Score is computed here, server-side, against the real stored answer key —
  // the client's submitted "score" (if any) is never trusted.
  let score = 0;
  questions.forEach((q, i) => {
    if (q.type !== "short" && answers?.[i] === q.correct) score += 1;
  });

  const { error: insertError } = await supabaseAdmin.from("test_attempts").insert({
    test_id: testId,
    student_id: user.id,
    answers: answers || {},
    score,
    total: mcqQuestions.length,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("points, streak_count")
    .eq("id", user.id)
    .single();

  await supabaseAdmin
    .from("profiles")
    .update({
      points: (profile?.points || 0) + score * 10,
      streak_count: (profile?.streak_count || 0) + 1,
    })
    .eq("id", user.id);

  return NextResponse.json({ score, total: mcqQuestions.length, pointsAwarded: score * 10 });
}
