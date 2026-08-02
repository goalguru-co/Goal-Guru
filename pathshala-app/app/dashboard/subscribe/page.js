"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const PRICE_PER_CLASS_PAISE = 150000; // ₹1500/year — change as needed

export default function SubscribePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);
    }
    load();
  }, [router]);

  async function handlePay() {
    setStatus("Creating order...");
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: PRICE_PER_CLASS_PAISE }),
    });
    const order = await res.json();

    if (!order.id) {
      setStatus("Order creation failed. Check Razorpay keys in .env");
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      name: "Goal Guru",
      description: `Class ${profile?.class_level} annual subscription`,
      order_id: order.id,
      handler: async function (response) {
        setStatus("Verifying payment...");
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...response,
            studentId: session.user.id,
            classLevel: profile?.class_level,
            amount: PRICE_PER_CLASS_PAISE,
          }),
        });
        const result = await verifyRes.json();
        if (result.success) {
          setStatus("Payment successful! Redirecting...");
          router.push("/dashboard");
        } else {
          setStatus("Payment verification failed. Contact support.");
        }
      },
      prefill: { email: session.user.email },
      theme: { color: "#2F6FED" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar session={session} role="student" />
      <main className="px-6 md:px-10 py-10 max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">
          Subscribe — Class {profile?.class_level}
        </h1>
        <div className="card p-6">
          <p className="text-3xl font-display font-semibold text-ink">
            ₹{PRICE_PER_CLASS_PAISE / 100}
            <span className="text-base font-body text-ink/50"> / year</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink/70">
            <li>✓ Video lectures for all subjects</li>
            <li>✓ Live classes access</li>
            <li>✓ Study material download</li>
          </ul>
          <button onClick={handlePay} className="btn-primary w-full mt-6">
            Pay & subscribe
          </button>
          {status && <p className="text-sm text-ink/60 mt-3">{status}</p>}
        </div>
      </main>
    </>
  );
}
