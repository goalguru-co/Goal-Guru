import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service-role client — bypasses RLS. Only ever used server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { userId, fullName, phone, classLevel } = await req.json();

  if (!userId || !fullName || !classLevel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    phone,
    class_level: classLevel,
    role: "student",
    approved: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
