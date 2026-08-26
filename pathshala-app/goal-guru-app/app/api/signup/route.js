import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUBJECTS } from "@/lib/subjects";

// Service-role client — only ever used server-side. Never expose this key to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalizes to the last 10 digits, so "+91 83290 42495", "8329042495", and
// "832-904-2495" all match each other regardless of how each was typed.
function normalizePhone(p) {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(req) {
  const {
    email,
    password,
    role,
    fullName,
    phone,
    classLevel,
    subject,
    childPhone,
  } = await req.json();

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Signup is a public endpoint — never trust the client to self-assign a role.
  // Only these three are ever legitimately self-serve; 'admin' must be granted manually.
  const ALLOWED_SELF_SIGNUP_ROLES = ["student", "parent", "teacher"];
  if (!ALLOWED_SELF_SIGNUP_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const ALLOWED_SUBJECTS = SUBJECTS;
  if (role === "teacher" && !ALLOWED_SUBJECTS.includes(subject)) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  }

  // Create the auth user directly via the admin API, marked as already confirmed.
  // This skips Supabase's confirmation-email flow entirely, which is what was
  // hitting the free-tier email rate limit.
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authUser.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    phone,
    role,
    class_level: classLevel || null,
    subject: subject || null,
    approved: false,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account with no profile.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let childLinked = false;
  if (role === "parent" && childPhone) {
    const normalizedChildPhone = normalizePhone(childPhone);
    const { data: candidates } = await supabaseAdmin.from("profiles").select("id, phone").eq("role", "student");
    const matchedStudent = (candidates || []).find((s) => normalizePhone(s.phone) === normalizedChildPhone);

    await supabaseAdmin.from("parent_links").insert({
      parent_id: userId,
      student_id: matchedStudent?.id || null,
      student_phone: childPhone,
    });
    childLinked = !!matchedStudent;
  }

  return NextResponse.json({ success: true, childLinked });
}
