import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
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
    .select("class_level, role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "student" || !callerProfile.class_level) {
    return NextResponse.json({ error: "Only students have a class rank" }, { status: 403 });
  }

  // Start of this week (Sunday, matches JS Date.getDay() convention).
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { data: classmates } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("class_level", callerProfile.class_level)
    .eq("approved", true);

  const classmateIds = (classmates || []).map((c) => c.id);
  if (classmateIds.length === 0) {
    return NextResponse.json({ rank: null, totalStudents: 0, weeklyPoints: 0 });
  }

  const { data: attempts } = await supabaseAdmin
    .from("test_attempts")
    .select("student_id, score, completed_at")
    .in("student_id", classmateIds)
    .gte("completed_at", startOfWeek.toISOString());

  const pointsByStudent = {};
  classmateIds.forEach((id) => { pointsByStudent[id] = 0; });
  (attempts || []).forEach((a) => {
    pointsByStudent[a.student_id] = (pointsByStudent[a.student_id] || 0) + (a.score || 0) * 10;
  });

  const ranked = Object.entries(pointsByStudent).sort((a, b) => b[1] - a[1]);
  const rank = ranked.findIndex(([id]) => id === user.id) + 1;
  const weeklyPoints = pointsByStudent[user.id] || 0;

  return NextResponse.json({ rank, totalStudents: classmateIds.length, weeklyPoints });
}
