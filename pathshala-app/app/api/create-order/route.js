import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { amount } = await req.json();

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await instance.orders.create({
      amount, // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
