"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import StatusPill from "@/components/StatusPill";
import { useRouter } from "next/navigation";

const CLASS_OPTIONS = [6, 7, 8, 9, 10];
const TABS = ["overview", "attendance", "assignments", "tests", "analytics", "doubts"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("overview");
  const [todayLive, setTodayLive] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // Attendance
  const [attClass, setAttClass] = useState("6");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStudents, setAttStudents] = useState([]);
  const [attMarks, setAttMarks] = useState({});

  // Assignment
  const [assignForm, setAssignForm] = useState({ classLevel: "6", subject: "", title: "", description: "", dueDate: "" });

  // Test creation
  const [testForm, setTestForm] = useState({ classLevel: "6", subject: "", title: "", scheduledDate: "", scheduledTime: "" });
  const [questions, setQuestions] = useState([{ q: "", options: ["", "", "", ""], correct: null }]);

  // Analytics
  const [analytics, setAnalytics] = useState([]);

  // Doubts
  const [openDoubts, setOpenDoubts] = useState([]);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setSession(session);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);

      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { data: live } = await supabase.from("live_classes").select("*").gte("scheduled_at", startOfDay.toISOString()).lte("scheduled_at", endOfDay.toISOString());
      setTodayLive(live || []);

      const { data: doubts } = await supabase.from("doubts").select("*, profiles!doubts_student_id_fkey(full_name, class_level)").eq("status", "open").order("created_at", { ascending: false });
      setOpenDoubts(doubts || []);

      const { data: attempts } = await supabase.from("test_attempts").select("score, total, tests(subject, class_level)");
      const bySubject = {};
      (attempts || []).forEach((a) => {
        const key = `${a.tests?.subject || "General"} (Class ${a.tests?.class_level || "-"})`;
        if (!bySubject[key]) bySubject[key] = { correct: 0, total: 0, count: 0 };
        bySubject[key].correct += a.score || 0;
        bySubject[key].total += a.total || 0;
        bySubject[key].count += 1;
      });
      setAnalytics(Object.entries(bySubject).map(([k, v]) => ({ key: k, pct: v.total ? Math.round((v.correct / v.total) * 100) : 0, attempts: v.count })));
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadStudentsForAttendance() {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "student").eq("class_level", parseInt(attClass, 10)).eq("approved", true);
    setAttStudents(data || []);
    const marks = {};
    (data || []).forEach((s) => { marks[s.id] = "present"; });
    setAttMarks(marks);
  }

  async function saveAttendance() {
    setStatus("Saving attendance...");
    const rows = attStudents.map((s) => ({
      student_id: s.id,
      class_date: attDate,
      status: attMarks[s.id] || "present",
      marked_by: session.user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,class_date" });
    setStatus(error ? "Error: " + error.message : "Attendance saved.");
  }

  async function submitAssignment(e) {
    e.preventDefault();
    setStatus("Saving assignment...");
    const { error } = await supabase.from("assignments").insert({
      class_level: parseInt(assignForm.classLevel, 10),
      subject: assignForm.subject,
      title: assignForm.title,
      description: assignForm.description,
      due_date: assignForm.dueDate || null,
      created_by: session.user.id,
    });
    setStatus(error ? "Error: " + error.message : "Assignment added.");
    if (!error) setAssignForm({ ...assignForm, subject: "", title: "", description: "", dueDate: "" });
  }

  function addQuestion() {
    setQuestions([...questions, { q: "", options: ["", "", "", ""], correct: null }]);
  }
  function updateQuestion(i, field, value) {
    const copy = [...questions];
    copy[i][field] = value;
    setQuestions(copy);
  }
  function updateOption(i, oi, value) {
    const copy = [...questions];
    copy[i].options[oi] = value;
    setQuestions(copy);
  }

  async function submitTest(e) {
    e.preventDefault();
    const missingIndex = questions.findIndex((q) => q.correct === null || q.correct === undefined);
    if (missingIndex !== -1) {
      setStatus(`Please mark the correct answer for question ${missingIndex + 1} before saving.`);
      return;
    }
    setStatus("Saving test...");
    const { error } = await supabase.from("tests").insert({
      class_level: parseInt(testForm.classLevel, 10),
      subject: testForm.subject,
      title: testForm.title,
      questions,
      scheduled_at: testForm.scheduledDate
        ? new Date(`${testForm.scheduledDate}T${testForm.scheduledTime || "00:00"}`).toISOString()
        : null,
      created_by: session.user.id,
    });
    setStatus(error ? "Error: " + error.message : "Test created.");
    if (!error) {
      setTestForm({ ...testForm, subject: "", title: "", scheduledDate: "", scheduledTime: "" });
      setQuestions([{ q: "", options: ["", "", "", ""], correct: null }]);
    }
  }

  async function respondToDoubt(id) {
    const response = responses[id];
    if (!response) return;
    await supabase.from("doubts").update({ response, status: "resolved", responded_by: session.user.id, responded_at: new Date().toISOString() }).eq("id", id);
    setOpenDoubts(openDoubts.filter((d) => d.id !== id));
  }

  if (loading) return <PageLoading />;

  return (
    <>
      <Navbar session={session} role="teacher" />
      <main className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
        <PageHeader eyebrow={profile?.subject} title="Teacher dashboard" subtitle={profile?.full_name} />

        <Tabs
          tabs={TABS}
          active={tab}
          onChange={(t) => { setTab(t); if (t === "attendance") loadStudentsForAttendance(); }}
        />

        {tab === "overview" && (
          <div className="card p-5">
            <p className="label-eyebrow mb-3">Today's timetable</p>
            {todayLive.length === 0 && <EmptyState icon="📅" title="No live classes scheduled today" />}
            {todayLive.map((l) => (
              <p key={l.id} className="text-sm py-1">{new Date(l.scheduled_at).toLocaleTimeString()} — {l.title} (Class {l.class_level})</p>
            ))}
          </div>
        )}

        {tab === "attendance" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <select className="input-field w-40" value={attClass} onChange={(e) => setAttClass(e.target.value)}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <input type="date" className="input-field w-48" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
              <button onClick={loadStudentsForAttendance} className="btn-secondary text-sm">Load students</button>
            </div>
            {attStudents.length > 0 && (
              <div className="card p-4 space-y-2">
                {attStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
                    <span className="font-medium">{s.full_name}</span>
                    <select className="input-field w-32 py-1" value={attMarks[s.id]} onChange={(e) => setAttMarks({ ...attMarks, [s.id]: e.target.value })}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                ))}
                <button onClick={saveAttendance} className="btn-primary mt-3">Save attendance</button>
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <form onSubmit={submitAssignment} className="card p-6 space-y-4 max-w-lg">
            <select className="input-field" value={assignForm.classLevel} onChange={(e) => setAssignForm({ ...assignForm, classLevel: e.target.value })}>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <input required placeholder="Subject" className="input-field" value={assignForm.subject} onChange={(e) => setAssignForm({ ...assignForm, subject: e.target.value })} />
            <input required placeholder="Title" className="input-field" value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} />
            <textarea placeholder="Description" className="input-field" rows={3} value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} />
            <input type="date" className="input-field" value={assignForm.dueDate} onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })} />
            <button className="btn-primary">Add assignment</button>
          </form>
        )}

        {tab === "tests" && (
          <form onSubmit={submitTest} className="card p-6 space-y-4 max-w-2xl">
            <select className="input-field" value={testForm.classLevel} onChange={(e) => setTestForm({ ...testForm, classLevel: e.target.value })}>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <input required placeholder="Subject" className="input-field" value={testForm.subject} onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })} />
            <input required placeholder="Test title" className="input-field" value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} />
            <div>
              <label className="text-sm font-semibold text-ink/70">Scheduled date &amp; time (leave empty for always-available practice set)</label>
              <div className="flex gap-3 mt-1">
                <input type="date" className="input-field" value={testForm.scheduledDate} onChange={(e) => setTestForm({ ...testForm, scheduledDate: e.target.value })} />
                <input type="time" className="input-field" value={testForm.scheduledTime} onChange={(e) => setTestForm({ ...testForm, scheduledTime: e.target.value })} disabled={!testForm.scheduledDate} />
              </div>
            </div>

            <p className="label-eyebrow">Questions</p>
            {questions.map((q, i) => (
              <div key={i} className="border border-line rounded-xl p-4 space-y-2 bg-ink/[0.015]">
                <input required placeholder={`Question ${i + 1}`} className="input-field" value={q.q} onChange={(e) => updateQuestion(i, "q", e.target.value)} />
                <p className="text-xs text-ink/50">Select the radio button next to the correct option:</p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => updateQuestion(i, "correct", oi)} />
                    <input required placeholder={`Option ${oi + 1}`} className="input-field" value={opt} onChange={(e) => updateOption(i, oi, e.target.value)} />
                  </div>
                ))}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="btn-secondary text-sm">+ Add question</button>
            <button className="btn-primary w-full">Create test</button>
          </form>
        )}

        {tab === "analytics" && (
          <div className="card p-5">
            <p className="label-eyebrow mb-3">Student performance by subject</p>
            {analytics.length === 0 && <EmptyState icon="📊" title="No test attempts recorded yet" />}
            {analytics.map((a) => (
              <div key={a.key} className="mb-3">
                <div className="flex justify-between text-sm mb-1"><span>{a.key}</span><span className="font-semibold">{a.pct}% avg &middot; {a.attempts} attempts</span></div>
                <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-clay to-leaf rounded-full transition-all duration-700" style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "doubts" && (
          <div className="space-y-3">
            <p className="text-sm text-ink/60 mb-2">Doubts and messages from students appear here.</p>
            {openDoubts.length === 0 && <EmptyState icon="❓" title="No open doubts" />}
            {openDoubts.map((d) => (
              <div key={d.id} className="card p-4">
                <p className="text-xs text-ink/50 mb-1">{d.profiles?.full_name} — Class {d.profiles?.class_level} — {d.subject}</p>
                <p className="font-medium mb-2">{d.question}</p>
                <textarea placeholder="Type your response..." className="input-field mb-2" rows={2} value={responses[d.id] || ""} onChange={(e) => setResponses({ ...responses, [d.id]: e.target.value })} />
                <button onClick={() => respondToDoubt(d.id)} className="btn-primary text-sm py-1.5">Send response</button>
              </div>
            ))}
          </div>
        )}

        {status && <div className="mt-4"><StatusPill tone={status.startsWith("Error") ? "error" : "info"}>{status}</StatusPill></div>}
      </main>
    </>
  );
}
