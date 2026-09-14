import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { userId } = await req.json();

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

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "You can't delete your own account from here" }, { status: 400 });
  }

  const { data: targetProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  if (targetProfile?.role === "admin") {
    return NextResponse.json({ error: "Admin accounts can't be deleted from this screen" }, { status: 400 });
  }

  // Deleting the auth user cascades to delete the profile row automatically.
  // If this account has created content (tests, videos, assignments, etc.),
  // some of those tables don't cascade — Postgres will refuse the deletion
  // rather than silently orphaning that content, so surface a clear reason.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    const message = deleteError.message?.includes("foreign key") || deleteError.code === "23503"
      ? "This account has created content (tests, assignments, videos, etc.) that must be removed first."
      : deleteError.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
