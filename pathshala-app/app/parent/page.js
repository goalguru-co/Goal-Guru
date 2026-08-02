"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
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

  if (loading) return <p className="p-10 text-center text-ink/60">Loading...</p>;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const avgScorePct = attempts.length
    ? Math.round((attempts.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / attempts.length) * 100)
    : null;

  return (
    <>
      <Navbar session={session} role="parent" />
      <main className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-ink">Parent dashboard</h1>

        {children.length === 0 ? (
          <div className="card p-6 mt-6">
            <p className="font-medium">No linked child account yet.</p>
            <p className="text-sm text-ink/60 mt-1">
              An admin needs to confirm the link between your account and your
              child's student account. This usually happens automatically if
              your child's phone number matched what you entered at signup.
            </p>
          </div>
        ) : (
          <>
            {children.length > 1 && (
              <div className="flex gap-2 mt-6">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChild(c)}
                    className={`text-sm px-4 py-2 rounded-lg border ${selectedChild?.id === c.id ? "bg-clay text-paper border-clay" : "border-[#CBDCF0]"}`}
                  >
                    {c.full_name}
                  </button>
                ))}
              </div>
            )}

            <p className="text-ink/60 mt-6 mb-2">Showing data for <span className="font-medium text-ink">{selectedChild?.full_name}</span> — Class {selectedChild?.class_level}</p>

            <div className="grid md:grid-cols-4 gap-4 mt-4">
              <div className="card p-5">
                <p className="label-eyebrow">Attendance</p>
                <p className="text-2xl font-display font-semibold mt-1">{attendancePct !== null ? `${attendancePct}%` : "—"}</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow">Avg. test score</p>
                <p className="text-2xl font-display font-semibold mt-1">{avgScorePct !== null ? `${avgScorePct}%` : "—"}</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow">Lectures watched</p>
                <p className="text-2xl font-display font-semibold mt-1">{videoViewCount}</p>
                <p className="text-xs text-ink/50 mt-1">Exact time spent isn't tracked yet</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow">Homework pending</p>
                <p className="text-2xl font-display font-semibold mt-1">{submissions.filter((s) => s.status === "missing").length}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Test scores &amp; rankings</p>
                {attempts.length === 0 && <p className="text-sm text-ink/50">No tests taken yet.</p>}
                {attempts.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm py-2 border-b border-[#DCE7F7] last:border-0">
                    <span>{a.tests?.title || "Test"} ({a.tests?.subject})</span>
                    <span>{a.score}/{a.total}</span>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Homework status</p>
                {submissions.length === 0 && <p className="text-sm text-ink/50">No assignments yet.</p>}
                {submissions.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm py-2 border-b border-[#DCE7F7] last:border-0">
                    <span>{s.assignments?.title}</span>
                    <span className="capitalize">{s.status}</span>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Fee / payment details</p>
                {fees.length === 0 && <p className="text-sm text-ink/50">No fee records yet.</p>}
                {fees.map((f) => (
                  <div key={f.id} className="flex justify-between text-sm py-2 border-b border-[#DCE7F7] last:border-0">
                    <span>₹{f.amount} {f.due_date ? `— due ${f.due_date}` : ""}</span>
                    <span className="capitalize">{f.status}</span>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Teacher remarks</p>
                {remarks.length === 0 && <p className="text-sm text-ink/50">No remarks yet.</p>}
                {remarks.map((r) => (
                  <p key={r.id} className="text-sm py-2 border-b border-[#DCE7F7] last:border-0">{r.remark}</p>
                ))}
              </div>
            </div>

            <div className="card p-5 mt-6">
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
