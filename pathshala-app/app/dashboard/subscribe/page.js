"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { useRouter } from "next/navigation";

const PERKS = ["Video lectures for all subjects", "Live classes access", "Study material download"];

export default function SubscribePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [claims, setClaims] = useState([]);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);

      const { data: settings } = await supabase.from("payment_settings").select("*").limit(1).maybeSingle();
      setPaymentSettings(settings);

      const { data: claimsData } = await supabase
        .from("payment_claims")
        .select("*")
        .eq("student_id", session.user.id)
        .order("submitted_at", { ascending: false });
      setClaims(claimsData || []);
    }
    load();
  }, [router]);

  const amountRupees = paymentSettings ? paymentSettings.amount_paise / 100 : null;
  const upiUri = paymentSettings?.upi_vpa
    ? `upi://pay?pa=${encodeURIComponent(paymentSettings.upi_vpa)}&pn=${encodeURIComponent(paymentSettings.payee_name || "Goal Guru")}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(`Goal Guru Class ${profile?.class_level} subscription`)}`
    : null;
  const qrImageUrl = upiUri ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}` : null;

  const pendingClaim = claims.find((c) => c.status === "pending");
  const latestRejected = !pendingClaim && claims.find((c) => c.status === "rejected");

  function copyUpiId() {
    navigator.clipboard.writeText(paymentSettings?.upi_vpa || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submitClaim(e) {
    e.preventDefault();
    if (submitting || !transactionId.trim()) return;
    setSubmitting(true);
    setStatus("");

    const { error } = await supabase.from("payment_claims").insert({
      student_id: session.user.id,
      class_level: profile?.class_level,
      amount_paise: paymentSettings?.amount_paise,
      transaction_id: transactionId.trim(),
    });

    if (error) {
      setStatus("Error: " + error.message);
      setSubmitting(false);
      return;
    }

    setTransactionId("");
    const { data: claimsData } = await supabase
      .from("payment_claims")
      .select("*")
      .eq("student_id", session.user.id)
      .order("submitted_at", { ascending: false });
    setClaims(claimsData || []);
    setSubmitting(false);
  }

  return (
    <>
      <Navbar session={session} role="student" />
      <main className="px-6 md:px-10 py-10 max-w-lg mx-auto">
        <PageHeader eyebrow="Annual plan" title={`Subscribe — Class ${profile?.class_level ?? ""}`} />

        <div className="card-gradient-border p-8 relative overflow-hidden mb-6">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-clay/10 blur-2xl" />
          <p className="font-display text-4xl font-extrabold text-gradient relative">
            {amountRupees !== null ? `₹${amountRupees}` : "—"}
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
        </div>

        {pendingClaim ? (
          <div className="card p-6 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-semibold text-ink mb-1">Payment submitted, awaiting verification</p>
            <p className="text-sm text-ink/60">
              Transaction ID <span className="font-mono">{pendingClaim.transaction_id}</span> — your admin will verify this shortly and your access will unlock automatically.
            </p>
          </div>
        ) : !paymentSettings?.upi_vpa ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-ink/60">Payment isn't set up yet — check back soon, or ask your admin.</p>
          </div>
        ) : (
          <div className="card p-6">
            {latestRejected && (
              <div className="mb-4"><StatusPill tone="error">Your last submission (transaction ID {latestRejected.transaction_id}) couldn't be verified — please check and resubmit.</StatusPill></div>
            )}
            <p className="label-eyebrow mb-3">Step 1 — Pay via UPI</p>
            <div className="flex flex-col items-center gap-3 mb-6">
              {qrImageUrl && <img src={qrImageUrl} alt="UPI QR code" width={200} height={200} className="rounded-xl border border-line" />}
              <p className="text-xs text-ink/50">Scan with any UPI app (GPay, PhonePe, Paytm...)</p>
              <div className="flex items-center gap-2 bg-ink/[0.04] rounded-lg px-3 py-2">
                <span className="font-mono text-sm">{paymentSettings.upi_vpa}</span>
                <button onClick={copyUpiId} className="text-xs text-clay font-semibold whitespace-nowrap">{copied ? "Copied!" : "Copy"}</button>
              </div>
              {paymentSettings.payee_name && <p className="text-xs text-ink/50">Payable to: {paymentSettings.payee_name}</p>}
            </div>

            <form onSubmit={submitClaim}>
              <p className="label-eyebrow mb-2">Step 2 — Confirm your payment</p>
              <p className="text-xs text-ink/50 mb-3">After paying, enter the UPI transaction / reference ID from your payment app (usually 12 digits).</p>
              <input
                required
                placeholder="e.g. 302481029384"
                className="input-field mb-3"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
              <button disabled={submitting} className="btn-primary w-full">{submitting ? "Submitting..." : "Submit for verification"}</button>
              {status && <div className="mt-3"><StatusPill tone="error">{status}</StatusPill></div>}
            </form>
          </div>
        )}
      </main>
    </>
  );
}
