import { NextResponse } from "next/server";

// This endpoint was removed for security reasons (it accepted an arbitrary
// role with no authentication). Signup now goes through /api/signup instead.
// Kept as an inert stub, rather than deleted, so that re-uploading this file
// overwrites the old dangerous version on platforms where a delete isn't
// straightforward (e.g. GitHub's web "Add files via upload" flow).
export async function POST() {
  return NextResponse.json({ error: "This endpoint is no longer available." }, { status: 410 });
}
