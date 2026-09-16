"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusPill from "@/components/StatusPill";
import PageLoading from "@/components/PageLoading";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ROLE_HOME = { admin: "/admin", teacher: "/teacher", parent: "/parent", student: "/dashboard" };

export default function AdminHome() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState({});
  const [announceForm, setAnnounceForm] = useState({ classLevel: "", title: "", message: "", imageUrl: "" });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [upcomingLive, setUpcomingLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState({ id: null, upiVpa: "", payeeName: "", amount: "" });
  const [paymentStatus, setPaymentStatus] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  async function loadStats(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const startOfMonth = new Date(); startOfMonth.setDate(1);

    const [
      { count: pending }, { count: totalStudents }, { count: totalTeachers }, { count: totalParents },
      { count: activeSubs }, { data: subsData }, { count: activeToday }, { count: admissions },
      { count: videoCount }, { count: materialCount }, { count: assignmentCount }, { count: testCount },
      { data: liveData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approved", false),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "parent"),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("amount").eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("last_active_date", today),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
      supabase.from("videos").select("*", { count: "exact", head: true }),
      supabase.from("study_material").select("*", { count: "exact", head: true }),
      supabase.from("assignments").select("*", { count: "exact", head: true }),
      supabase.from("tests").select("*", { count: "exact", head: true }),
      supabase.from("live_classes").select("*").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
    ]);

    const revenue = (subsData || []).reduce((sum, s) => sum + (s.amount || 0), 0) / 100;

    setStats({
      pending: pending || 0, totalStudents: totalStudents || 0, totalTeachers: totalTeachers || 0,
      totalParents: totalParents || 0, activeSubs: activeSubs || 0, revenue, activeToday: activeToday || 0,
      admissions: admissions || 0, contentCount: (videoCount || 0) + (materialCount || 0) + (assignmentCount || 0) + (testCount || 0),
    });
    setUpcomingLive(liveData || []);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role, approved").eq("id", session.user.id).single();
      if (profile?.role !== "admin" || !profile?.approved) {
        await supabase.auth.signOut();
        router.push(profile?.role && profile?.approved ? (ROLE_HOME[profile.role] || "/login") : "/login?notice=pending-approval");
        return;
      }
      setSession(session);
      loadStats(session.user.id);

      const { data: settings } = await supabase.from("payment_settings").select("*").limit(1).maybeSingle();
      if (settings) {
        setPaymentForm({ id: settings.id, upiVpa: settings.upi_vpa || "", payeeName: settings.payee_name || "", amount: settings.amount_paise / 100 });
      }
    }
    init();
  }, [router]);

  async function submitPaymentSettings(e) {
    e.preventDefault();
    if (savingPayment) return;
    setSavingPayment(true);
    setPaymentStatus("Saving...");
    const payload = {
      upi_vpa: paymentForm.upiVpa.trim(),
      payee_name: paymentForm.payeeName.trim(),
      amount_paise: Math.round(parseFloat(paymentForm.amount) * 100),
    };
    const { error } = paymentForm.id
      ? await supabase.from("payment_settings").update(payload).eq("id", paymentForm.id)
      : await supabase.from("payment_settings").insert(payload);
    setPaymentStatus(error ? "Error: " + error.message : "Saved.");
    setSavingPayment(false);
  }

  async function submitAnnouncement(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Posting...");
    const { error } = await supabase.from("announcements").insert({
      class_level: announceForm.classLevel ? parseInt(announceForm.classLevel, 10) : null,
      title: announceForm.title.trim(),
      message: announceForm.message.trim(),
      image_url: announceForm.imageUrl.trim() || null,
      created_by: session.user.id,
    });
    setStatus(error ? "Error: " + error.message : "Announcement posted.");
    if (!error) setAnnounceForm({ classLevel: "", title: "", message: "", imageUrl: "" });
    setSaving(false);
  }

  if (loading) return <PageLoading />;

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-6xl mx-auto">
        <PageHeader eyebrow="Overview" title="Admin dashboard" />

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total students" value={stats.totalStudents} icon="🎓" accent="clay" />
          <StatCard label="Active today" value={stats.activeToday} icon="⚡" accent="leaf" />
          <StatCard label="Revenue collected" value={`₹${stats.revenue || 0}`} icon="💰" accent="saffron" />
          <StatCard label="New admissions (this month)" value={stats.admissions} icon="📈" accent="spark" />
          <StatCard label="Pending approvals" value={stats.pending} icon="⏳" accent="clay" />
          <StatCard label="Active subscriptions" value={stats.activeSubs} icon="✅" accent="leaf" />
          <StatCard label="Teachers / Parents" value={`${stats.totalTeachers || 0} / ${stats.totalParents || 0}`} icon="👥" accent="saffron" />
          <StatCard label="Content items uploaded" value={stats.contentCount} icon="📚" accent="spark" />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link href="/admin/students" className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-clay/10 flex items-center justify-center text-xl mb-3">👥</div>
            <h3 className="font-display font-bold text-ink mb-1">Manage users</h3>
            <p className="text-sm text-ink/60">Approve signups, bulk upload student lists, link parents</p>
          </Link>
          <Link href="/admin/content" className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-leaf/10 flex items-center justify-center text-xl mb-3">🎬</div>
            <h3 className="font-display font-bold text-ink mb-1">Manage content</h3>
            <p className="text-sm text-ink/60">Add video lectures, live classes and study material</p>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="label-eyebrow mb-3">Live class schedule</p>
            {upcomingLive.length === 0 && <p className="text-sm text-ink/50">Nothing scheduled.</p>}
            {upcomingLive.map((l) => (
              <p key={l.id} className="text-sm py-1">{new Date(l.scheduled_at).toLocaleString()} — {l.title} (Class {l.class_level})</p>
            ))}
          </div>

          <form onSubmit={submitAnnouncement} className="card p-5 space-y-3">
            <p className="label-eyebrow">Post an announcement / notification</p>
            <select className="input-field" value={announceForm.classLevel} onChange={(e) => setAnnounceForm({ ...announceForm, classLevel: e.target.value })}>
              <option value="">All classes</option>
              {[6, 7, 8, 9, 10].map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <input required placeholder="Title" className="input-field" value={announceForm.title} onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })} />
            <textarea required placeholder="Message" className="input-field" rows={2} value={announceForm.message} onChange={(e) => setAnnounceForm({ ...announceForm, message: e.target.value })} />
            <input placeholder="Image URL (optional)" className="input-field" value={announceForm.imageUrl} onChange={(e) => setAnnounceForm({ ...announceForm, imageUrl: e.target.value })} />
            <button disabled={saving} className="btn-primary w-full">{saving ? "Posting..." : "Post"}</button>
            <StatusPill tone={status.startsWith("Error") ? "error" : "info"}>{status}</StatusPill>
          </form>

          <form onSubmit={submitPaymentSettings} className="card p-5 space-y-3">
            <p className="label-eyebrow">UPI payment settings</p>
            <p className="text-xs text-ink/50">Students see this as a QR code + UPI ID on the Subscribe page, and submit their transaction ID for you to verify under Manage Users.</p>
            <input required placeholder="Your UPI ID (e.g. school@upi)" className="input-field" value={paymentForm.upiVpa} onChange={(e) => setPaymentForm({ ...paymentForm, upiVpa: e.target.value })} />
            <input placeholder="Payee name shown to students (optional)" className="input-field" value={paymentForm.payeeName} onChange={(e) => setPaymentForm({ ...paymentForm, payeeName: e.target.value })} />
            <input required type="number" placeholder="Annual price in ₹ (e.g. 1500)" className="input-field" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            <button disabled={savingPayment} className="btn-primary w-full">{savingPayment ? "Saving..." : "Save payment settings"}</button>
            {paymentStatus && <StatusPill tone={paymentStatus.startsWith("Error") ? "error" : "info"}>{paymentStatus}</StatusPill>}
          </form>
        </div>
      </main>
    </>
  );
}
