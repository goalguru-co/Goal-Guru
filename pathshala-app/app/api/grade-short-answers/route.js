import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { pointsPerCorrectAnswer } from "@/lib/points";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { attemptId, marks } = await req.json(); // marks: { "<question index>": true | false }

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "teacher"].includes(callerProfile?.role)) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  if (!attemptId || !marks || typeof marks !== "object") {
    return NextResponse.json({ error: "Missing attemptId or marks" }, { status: 400 });
  }

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("test_attempts")
    .select("id, student_id, test_id, score, total, tests(created_by, questions)")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Teachers can only grade attempts on tests they created themselves —
  // matches the same subject/ownership segregation used everywhere else.
  if (callerProfile.role === "teacher" && attempt.tests?.created_by !== user.id) {
    return NextResponse.json({ error: "You can only grade tests you created" }, { status: 403 });
  }

  const questions = attempt.tests?.questions || [];
  const shortIndexes = questions.map((q, i) => (q.type === "short" ? i : null)).filter((i) => i !== null);

  // Only count marks for questions that are actually short-answer on this test —
  // never trust arbitrary indices from the client.
  const shortCorrectCount = shortIndexes.filter((i) => marks[i] === true).length;
  const finalScore = (attempt.score || 0) + shortCorrectCount;
  const total = attempt.total || questions.length;

  const reviewRecord = {};
  shortIndexes.forEach((i) => { reviewRecord[i] = marks[i] === true ? 1 : 0; });

  const { error: updateError } = await supabaseAdmin
    .from("test_attempts")
    .update({
      score: finalScore,
      short_answer_review: reviewRecord,
      pending_review: false,
    })
    .eq("id", attemptId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const percentCorrect = total ? Math.round((finalScore / total) * 100) : 0;
  const pointsAwarded = finalScore * pointsPerCorrectAnswer(percentCorrect);

  const { data: studentProfile } = await supabaseAdmin.from("profiles").select("points").eq("id", attempt.student_id).single();
  await supabaseAdmin.from("profiles").update({ points: (studentProfile?.points || 0) + pointsAwarded }).eq("id", attempt.student_id);

  return NextResponse.json({ finalScore, total, pointsAwarded });
}
