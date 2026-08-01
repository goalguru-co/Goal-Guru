import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service-role client — only ever used server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function randomPassword() {
  return Math.random().toString(36).slice(-8);
}

export async function POST(req) {
  const { students } = await req.json();

  if (!Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: "No students found in CSV" }, { status: 400 });
  }

  const created = [];

  for (const row of students) {
    const fullName = row.full_name?.trim();
    const phone = row.phone?.trim();
    const classLevel = parseInt(row.class_level, 10);
    const schoolName = row.school_name?.trim() || "General";

    if (!fullName || !phone || !classLevel) continue;

    // Build a login email from the phone number since Supabase auth needs an email format.
    const loginEmail = `${phone}@student.goalguru.app`;
    const password = randomPassword();

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      created.push({ full_name: fullName, phone, login_email: loginEmail, password: "", error: authError.message });
      continue;
    }

    // Find or create the school
    let { data: school } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("name", schoolName)
      .maybeSingle();

    if (!school) {
      const { data: newSchool } = await supabaseAdmin
        .from("schools")
        .insert({ name: schoolName })
        .select()
        .single();
      school = newSchool;
    }

    await supabaseAdmin.from("profiles").insert({
      id: authUser.user.id,
      full_name: fullName,
      phone,
      class_level: classLevel,
      role: "student",
      approved: true, // school-provided lists are pre-approved
      school_id: school?.id,
    });

    created.push({ full_name: fullName, phone, login_email: loginEmail, password });
  }

  return NextResponse.json({ created });
}
