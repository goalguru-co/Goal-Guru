"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { useRouter } from "next/navigation";

const PRICE_PER_CLASS_PAISE = 150000; // ₹1500/year — change as needed
const PERKS = ["Video lectures for all subjects", "Live classes access", "Study material download"];

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
        <PageHeader eyebrow="Annual plan" title={`Subscribe — Class ${profile?.class_level ?? ""}`} />
        <div className="card-gradient-border p-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-clay/10 blur-2xl" />
          <p className="font-display text-4xl font-extrabold text-gradient relative">
            ₹{PRICE_PER_CLASS_PAISE / 100}
            <span className="text-base font-body font-medium text-ink/50"> / year</span>
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink/80 relative">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-leaf/15 text-leaf flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                {perk}
              </li>
            ))}
          </ul>
          <button onClick={handlePay} className="btn-primary w-full mt-8">
            Pay &amp; subscribe
          </button>
          {status && <div className="mt-3"><StatusPill tone={status.startsWith("Payment successful") ? "success" : status.startsWith("Order creation failed") || status.startsWith("Payment verification") ? "error" : "info"}>{status}</StatusPill></div>}
        </div>
      </main>
    </>
  );
}
