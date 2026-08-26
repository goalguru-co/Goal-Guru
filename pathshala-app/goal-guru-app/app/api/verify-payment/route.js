import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-side client using the SERVICE ROLE key (bypasses RLS).
// This key must NEVER be exposed to the browser — only used here, server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    studentId,
    classLevel,
  } = body;

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  // A student can only ever pay for their own subscription — never trust studentId
  // from the request body alone.
  if (user.id !== studentId) {
    return NextResponse.json({ success: false, error: "Cannot pay for another account" }, { status: 403 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
  }

  // Fetch the real, paid amount directly from Razorpay rather than trusting
  // whatever the client claims was paid — this is what actually closes the
  // price-tampering hole (the client could otherwise self-report any amount here).
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  const payment = await instance.payments.fetch(razorpay_payment_id);
  const verifiedAmount = payment.amount;

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  const { error } = await supabaseAdmin.from("subscriptions").insert({
    student_id: studentId,
    class_level: classLevel,
    plan_type: "annual",
    status: "active",
    razorpay_order_id,
    razorpay_payment_id,
    amount: verifiedAmount,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
