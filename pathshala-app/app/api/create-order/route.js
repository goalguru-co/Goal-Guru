import Razorpay from "razorpay";
import { NextResponse } from "next/server";

// The real price is fixed here, server-side — never trust a client-supplied amount,
// or someone could create an order for ₹1 and legitimately "pay" that tiny amount,
// which would still produce a valid Razorpay signature.
const SUBSCRIPTION_PRICE_PAISE = 150000; // ₹1500/year — keep in sync with app/dashboard/subscribe/page.js

export async function POST(req) {
  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await instance.orders.create({
      amount: SUBSCRIPTION_PRICE_PAISE,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
