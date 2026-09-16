import { NextResponse } from "next/server";

// This endpoint is retired — payments now run on UPI (see /api/review-payment-claim).
// Kept as an inert stub, rather than deleted, so that re-uploading this file
// overwrites the old Razorpay version on platforms where a delete isn't
// straightforward (e.g. GitHub's web "Add files via upload" flow).
export async function POST() {
  return NextResponse.json({ error: "This payment method has been retired. Use the UPI payment flow instead." }, { status: 410 });
}
