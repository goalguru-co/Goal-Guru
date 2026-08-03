"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import { titleCase } from "@/lib/format";
import { useRouter } from "next/navigation";

export default function ParentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [fees, setFees] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [ptm, setPtm] = useState([]);
  const [videoViewCount, setVideoViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedStat, setExpandedStat] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setSession(session);

      const { data: links } = await supabase
        .from("parent_links")
        .select("student_id, profiles!parent_links_student_id_fkey(id, full_name, class_level)")
        .eq("parent_id", session.user.id)
        .not("student_id", "is", null);

      const kids = (links || []).map((l) => l.profiles).filter(Boolean);
      setChildren(kids);
      if (kids.length > 0) setSelectedChild(kids[0]);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    async function loadChildData() {
      if (!selectedChild) return;
      const [{ data: att }, { data: att2 }, { data: sub }, { data: fee }, { data: rem }, { data: ptmData }, { count: views }] = await Promise.all([
        supabase.from("attendance").select("*").eq("student_id", selectedChild.id).order("class_date", { ascending: false }).limit(30),
        supabase.from("test_attempts").select("*, tests(subject, title)").eq("student_id", selectedChild.id),
        supabase.from("assignment_submissions").select("*, assignments(title, due_date)").eq("student_id", selectedChild.id),
        supabase.from("fees").select("*").eq("student_id", selectedChild.id).order("due_date"),
        supabase.from("teacher_remarks").select("*").eq("student_id", selectedChild.id).order("created_at", { ascending: false }),
        supabase.from("ptm_schedule").select("*").or(`class_level.eq.${selectedChild.class_level},class_level.is.null`).order("scheduled_at"),
        supabase.from("video_views").select("*", { count: "exact", head: true }).eq("student_id", selectedChild.id),
      ]);
      setAttendance(att || []);
      setAttempts(att2 || []);
      setSubmissions(sub || []);
      setFees(fee || []);
      setRemarks(rem || []);
      setPtm(ptmData || []);
      setVideoViewCount(views || 0);
    }
    loadChildData();
  }, [selectedChild]);

  if (loading) return <PageLoading />;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const avgScorePct = attempts.length
    ? Math.round((attempts.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / attempts.length) * 100)
    : null;

  return (
    <>
      <Navbar session={session} role="parent" />
      <main className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
        <PageHeader title="Parent dashboard" />

        {children.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              icon="👨‍👩‍👧"
              title="No linked child account yet"
              subtitle="An admin needs to confirm the link between your account and your child's student account. This usually happens automatically if your child's phone number matched what you entered at signup."
            />
          </div>
        ) : (
          <>
            {children.length > 1 && (
              <div className="flex gap-2 mb-6">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedChild(c); setExpandedStat(null); }}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${
                      selectedChild?.id === c.id ? "bg-clay text-white border-clay shadow-glow" : "border-line hover:border-clay/40"
                    }`}
                  >
                    {titleCase(c.full_name)}
                  </button>
                ))}
              </div>
            )}

            <p className="text-ink/60 mb-6">Showing data for <span className="font-semibold text-ink">{titleCase(selectedChild?.full_name)}</span> — Class {selectedChild?.class_level}</p>

            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <button
                onClick={() => setExpandedStat(expandedStat === "attendance" ? null : "attendance")}
                className={`card p-5 text-left transition-all ${expandedStat === "attendance" ? "border-clay ring-2 ring-clay/20" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="label-eyebrow">Attendance</p>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-clay/10">📅</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-extrabold text-ink">{attendancePct !== null ? `${attendancePct}%` : "—"}</p>
                <p className="text-xs text-clay font-semibold mt-1">{expandedStat === "attendance" ? "Hide day-by-day ▲" : "View day-by-day ▼"}</p>
              </button>

              <button
                onClick={() => setExpandedStat(expandedStat === "scores" ? null : "scores")}
                className={`card p-5 text-left transition-all ${expandedStat === "scores" ? "border-clay ring-2 ring-clay/20" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="label-eyebrow">Avg. test score</p>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-leaf/10">🎯</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-extrabold text-ink">{avgScorePct !== null ? `${avgScorePct}%` : "—"}</p>
                <p className="text-xs text-clay font-semibold mt-1">{expandedStat === "scores" ? "Hide breakdown ▲" : "View breakdown ▼"}</p>
              </button>

              <div className="card p-5">
                <p className="label-eyebrow">Lectures watched</p>
                <p className="font-display text-2xl md:text-3xl font-extrabold text-ink mt-1">{videoViewCount}</p>
                <p className="text-xs text-ink/50 mt-1">Exact time spent isn't tracked yet</p>
              </div>
              <StatCard label="Homework pending" value={submissions.filter((s) => s.status === "missing").length} icon="📝" accent="spark" />
            </div>

            {expandedStat === "attendance" && (
              <div className="card p-5 mb-6">
                <p className="label-eyebrow mb-3">Day-by-day attendance (last {attendance.length})</p>
                {attendance.length === 0 && <p className="text-sm text-ink/50">No attendance recorded yet.</p>}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {attendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-ink/[0.02]">
                      <span>{new Date(a.class_date).toLocaleDateString()}</span>
                      <span className={`font-semibold capitalize text-xs px-2 py-0.5 rounded-full ${
                        a.status === "present" ? "bg-leaf/10 text-leaf" : a.status === "late" ? "bg-saffron/10 text-saffron" : "bg-spark/10 text-spark"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedStat === "scores" && (
              <div className="card p-5 mb-6">
                <p className="label-eyebrow mb-3">Test score breakdown</p>
                {attempts.length === 0 && <p className="text-sm text-ink/50">No tests taken yet.</p>}
                {attempts.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                    <span>{a.tests?.title || "Test"} ({a.tests?.subject})</span>
                    <span className="font-semibold">{a.score}/{a.total} {a.total ? `— ${Math.round((a.score / a.total) * 100)}%` : ""}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Homework status</p>
                {submissions.length === 0 && <p className="text-sm text-ink/50">No assignments yet.</p>}
                {submissions.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                    <span>{s.assignments?.title}</span>
                    <span className="capitalize font-semibold">
                      {s.status === "graded" && s.grade ? `Graded — ${s.grade}` : s.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Fee / payment details</p>
                {fees.length === 0 && <p className="text-sm text-ink/50">No fee records yet.</p>}
                {fees.map((f) => (
                  <div key={f.id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                    <span>₹{f.amount} {f.due_date ? `— due ${f.due_date}` : ""}</span>
                    <span className="capitalize font-semibold">{f.status}</span>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Teacher remarks</p>
                {remarks.length === 0 && <p className="text-sm text-ink/50">No remarks yet.</p>}
                {remarks.map((r) => (
                  <p key={r.id} className="text-sm py-2 border-b border-line last:border-0">{r.remark}</p>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="label-eyebrow mb-3">Parent-teacher meeting schedule</p>
              {ptm.length === 0 && <p className="text-sm text-ink/50">No meetings scheduled.</p>}
              {ptm.map((p) => (
                <p key={p.id} className="text-sm py-1">{new Date(p.scheduled_at).toLocaleString()} — {p.notes}</p>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
