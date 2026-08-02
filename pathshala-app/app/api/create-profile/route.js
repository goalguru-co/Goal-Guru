import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { userId, role, fullName, phone, classLevel, subject, childPhone } = await req.json();

  if (!userId || !fullName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    phone,
    role,
    class_level: classLevel || null,
    subject: subject || null,
    approved: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this is a parent, try to auto-link to a matching student by phone.
  if (role === "parent" && childPhone) {
    const { data: matchedStudent } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", childPhone)
      .eq("role", "student")
      .maybeSingle();

    await supabaseAdmin.from("parent_links").insert({
      parent_id: userId,
      student_id: matchedStudent?.id || null,
      student_phone: childPhone,
    });
  }

  return NextResponse.json({ success: true });
}
