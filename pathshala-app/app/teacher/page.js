"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import StatusPill from "@/components/StatusPill";
import PerformanceBadge from "@/components/PerformanceBadge";
import { isLikelyUrl, titleCase } from "@/lib/format";
import { useRouter } from "next/navigation";

const CLASS_OPTIONS = [6, 7, 8, 9, 10];
const TABS = ["overview", "attendance", "assignments", "tests", "remarks", "analytics", "doubts"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("overview");
  const [todayLive, setTodayLive] = useState([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Attendance
  const [attView, setAttView] = useState("mark"); // 'mark' | 'history'
  const [attClass, setAttClass] = useState("6");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStudents, setAttStudents] = useState([]);
  const [attMarks, setAttMarks] = useState({});
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [historyStudents, setHistoryStudents] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Assignment
  const [assignForm, setAssignForm] = useState({ classLevel: "6", title: "", description: "", dueDate: "" });
  const [pastAssignments, setPastAssignments] = useState([]);
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [gradeInputs, setGradeInputs] = useState({});

  // Test creation
  const [testForm, setTestForm] = useState({ classLevel: "6", title: "", scheduledDate: "", scheduledTime: "" });
  const [questions, setQuestions] = useState([{ type: "mcq", q: "", options: ["", "", "", ""], correct: null }]);

  // Analytics
  const [analytics, setAnalytics] = useState([]);

  // Doubts
  const [openDoubts, setOpenDoubts] = useState([]);
  const [responses, setResponses] = useState({});

  // Remarks
  const [remarkClass, setRemarkClass] = useState("6");
  const [remarkStudents, setRemarkStudents] = useState([]);
  const [studentRemarks, setStudentRemarks] = useState({});
  const [remarkInputs, setRemarkInputs] = useState({});
  const [remarkStatus, setRemarkStatus] = useState({});

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

      if (!profileData?.approved) {
        await supabase.auth.signOut();
        router.push("/login?notice=pending-approval");
        return;
      }

      setSession(session);
      setProfile(profileData);

      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { data: live } = await supabase.from("live_classes").select("*").gte("scheduled_at", startOfDay.toISOString()).lte("scheduled_at", endOfDay.toISOString());
      setTodayLive(live || []);

      const { data: doubts } = await supabase.from("doubts").select("*, profiles!doubts_student_id_fkey(full_name, class_level)").eq("status", "open").eq("subject", profileData?.subject).order("created_at", { ascending: false });
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
      loadAssignments(session.user.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadAssignments(userId) {
    const { data } = await supabase.from("assignments").select("*").eq("created_by", userId).order("created_at", { ascending: false });
    setPastAssignments(data || []);
  }

  async function loadSubmissions(assignmentId) {
    if (expandedAssignment === assignmentId) {
      setExpandedAssignment(null);
      return;
    }
    setExpandedAssignment(assignmentId);
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*, profiles!assignment_submissions_student_id_fkey(full_name)")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });
    setAssignmentSubmissions(data || []);
  }

  async function saveGrade(submissionId) {
    const grade = (gradeInputs[submissionId] || "").trim();
    if (!grade) return;
    await supabase.from("assignment_submissions").update({ grade, status: "graded" }).eq("id", submissionId);
    setAssignmentSubmissions((subs) => subs.map((s) => (s.id === submissionId ? { ...s, grade, status: "graded" } : s)));
    setGradeInputs((g) => ({ ...g, [submissionId]: "" }));
  }

  async function loadStudentsForAttendance() {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "student").eq("class_level", parseInt(attClass, 10)).eq("approved", true);
    setAttStudents(data || []);
    const marks = {};
    (data || []).forEach((s) => { marks[s.id] = "present"; });
    setAttMarks(marks);
  }

  function markAll(status) {
    const marks = {};
    attStudents.forEach((s) => { marks[s.id] = status; });
    setAttMarks(marks);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const { data: students } = await supabase.from("profiles").select("id, full_name").eq("role", "student").eq("class_level", parseInt(attClass, 10)).eq("approved", true).order("full_name");
    setHistoryStudents(students || []);

    const studentIds = (students || []).map((s) => s.id);
    if (studentIds.length === 0) {
      setHistoryRecords([]);
      setHistoryLoading(false);
      return;
    }

    const monthStart = `${historyMonth}-01`;
    const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0).toISOString().slice(0, 10);

    const { data: records } = await supabase
      .from("attendance")
      .select("student_id, class_date, status")
      .in("student_id", studentIds)
      .gte("class_date", monthStart)
      .lte("class_date", monthEnd)
      .order("class_date");

    setHistoryRecords(records || []);
    setHistoryLoading(false);
  }

  async function loadStudentsForRemarks() {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "student").eq("class_level", parseInt(remarkClass, 10)).eq("approved", true).order("full_name");
    setRemarkStudents(data || []);

    const studentIds = (data || []).map((s) => s.id);
    if (studentIds.length > 0) {
      const { data: remarks } = await supabase
        .from("teacher_remarks")
        .select("*")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });
      const byStudent = {};
      (remarks || []).forEach((r) => {
        if (!byStudent[r.student_id]) byStudent[r.student_id] = [];
        byStudent[r.student_id].push(r);
      });
      setStudentRemarks(byStudent);
    } else {
      setStudentRemarks({});
    }
  }

  async function addRemark(studentId) {
    const remark = (remarkInputs[studentId] || "").trim();
    if (!remark) return;
    setRemarkStatus((s) => ({ ...s, [studentId]: "Saving..." }));
    const { data, error } = await supabase.from("teacher_remarks").insert({
      student_id: studentId,
      teacher_id: session.user.id,
      remark,
    }).select().single();
    setRemarkStatus((s) => ({ ...s, [studentId]: error ? "Error: " + error.message : "Added." }));
    if (!error) {
      setRemarkInputs((s) => ({ ...s, [studentId]: "" }));
      setStudentRemarks((s) => ({ ...s, [studentId]: [data, ...(s[studentId] || [])] }));
    }
  }

  async function saveAttendance() {
    if (saving) return;
    setSaving(true);
    setStatus("Saving attendance...");
    const rows = attStudents.map((s) => ({
      student_id: s.id,
      class_date: attDate,
      status: attMarks[s.id] || "present",
      marked_by: session.user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,class_date" });
    setStatus(error ? "Error: " + error.message : "Attendance saved.");
    setSaving(false);
  }

  async function submitAssignment(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving assignment...");
    const { error } = await supabase.from("assignments").insert({
      class_level: parseInt(assignForm.classLevel, 10),
      subject: profile?.subject,
      title: assignForm.title.trim(),
      description: assignForm.description.trim(),
      due_date: assignForm.dueDate || null,
      created_by: session.user.id,
    });
    setStatus(error ? "Error: " + error.message : "Assignment added.");
    if (!error) {
      setAssignForm({ ...assignForm, title: "", description: "", dueDate: "" });
      loadAssignments(session.user.id);
    }
    setSaving(false);
  }

  function addQuestion() {
    setQuestions([...questions, { type: "mcq", q: "", options: ["", "", "", ""], correct: null }]);
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
  function setQuestionType(i, type) {
    const copy = [...questions];
    if (type === "mcq") {
      copy[i] = { type: "mcq", q: copy[i].q, options: ["", "", "", ""], correct: null };
    } else {
      copy[i] = { type: "short", q: copy[i].q, sampleAnswer: "" };
    }
    setQuestions(copy);
  }
  function removeQuestion(i) {
    setQuestions(questions.filter((_, idx) => idx !== i));
  }

  async function submitTest(e) {
    e.preventDefault();
    const missingIndex = questions.findIndex((q) => q.type === "mcq" && (q.correct === null || q.correct === undefined));
    if (missingIndex !== -1) {
      setStatus(`Please mark the correct answer for question ${missingIndex + 1} before saving.`);
      return;
    }
    const emptyIndex = questions.findIndex((q) => !q.q.trim());
    if (emptyIndex !== -1) {
      setStatus(`Question ${emptyIndex + 1} is empty.`);
      return;
    }
    if (saving) return;
    setSaving(true);
    setStatus("Saving test...");
    const { error } = await supabase.from("tests").insert({
      class_level: parseInt(testForm.classLevel, 10),
      subject: profile?.subject,
      title: testForm.title.trim(),
      questions,
      scheduled_at: testForm.scheduledDate
        ? new Date(`${testForm.scheduledDate}T${testForm.scheduledTime || "00:00"}`).toISOString()
        : null,
      created_by: session.user.id,
    });
    setStatus(error ? "Error: " + error.message : "Test created.");
    if (!error) {
      setTestForm({ ...testForm, title: "", scheduledDate: "", scheduledTime: "" });
      setQuestions([{ type: "mcq", q: "", options: ["", "", "", ""], correct: null }]);
    }
    setSaving(false);
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
        <PageHeader eyebrow={profile?.subject} title="Teacher dashboard" subtitle={titleCase(profile?.full_name)} />

        <Tabs
          tabs={TABS}
          active={tab}
          onChange={(t) => {
            setTab(t);
            if (t === "attendance") loadStudentsForAttendance();
            if (t === "remarks") loadStudentsForRemarks();
          }}
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
            <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-line w-fit mb-5">
              <button onClick={() => setAttView("mark")} className={`px-4 py-2 text-sm font-semibold rounded-lg ${attView === "mark" ? "bg-white text-clay shadow-sm" : "text-ink/60"}`}>Mark attendance</button>
              <button onClick={() => { setAttView("history"); loadHistory(); }} className={`px-4 py-2 text-sm font-semibold rounded-lg ${attView === "history" ? "bg-white text-clay shadow-sm" : "text-ink/60"}`}>View records</button>
            </div>

            {attView === "mark" && (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <select className="input-field w-40" value={attClass} onChange={(e) => setAttClass(e.target.value)}>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                  <input type="date" className="input-field w-48" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
                  <button onClick={loadStudentsForAttendance} className="btn-secondary text-sm">Load students</button>
                </div>

                {attStudents.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-ink/60">{attStudents.length} student{attStudents.length !== 1 ? "s" : ""} in Class {attClass}</p>
                      <div className="flex gap-2">
                        <button onClick={() => markAll("present")} className="text-xs font-semibold text-leaf bg-leaf/10 px-3 py-1.5 rounded-full">Mark all present</button>
                        <button onClick={() => markAll("absent")} className="text-xs font-semibold text-spark bg-spark/10 px-3 py-1.5 rounded-full">Mark all absent</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {attStudents.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-line last:border-0">
                          <span className="font-medium">{titleCase(s.full_name)}</span>
                          <div className="flex gap-1.5">
                            {["present", "absent", "late"].map((st) => (
                              <button
                                key={st}
                                onClick={() => setAttMarks({ ...attMarks, [s.id]: st })}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-all ${
                                  attMarks[s.id] === st
                                    ? st === "present" ? "bg-leaf text-white" : st === "absent" ? "bg-spark text-white" : "bg-saffron text-white"
                                    : "bg-ink/[0.05] text-ink/50 hover:bg-ink/10"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                      <p className="text-sm font-semibold text-ink/70">
                        <span className="text-leaf">{Object.values(attMarks).filter((v) => v === "present").length} present</span>
                        {" · "}
                        <span className="text-spark">{Object.values(attMarks).filter((v) => v === "absent").length} absent</span>
                        {" · "}
                        <span className="text-saffron">{Object.values(attMarks).filter((v) => v === "late").length} late</span>
                        {" · "}{attStudents.length} total
                      </p>
                      <button onClick={saveAttendance} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save attendance"}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {attView === "history" && (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <select className="input-field w-40" value={attClass} onChange={(e) => setAttClass(e.target.value)}>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                  <input type="month" className="input-field w-44" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} />
                  <button onClick={loadHistory} className="btn-secondary text-sm">{historyLoading ? "Loading..." : "Load records"}</button>
                </div>

                {historyRecords.length === 0 ? (
                  <EmptyState icon="📅" title="No attendance recorded for this month" subtitle="Pick a class and month, then load records." />
                ) : (
                  <div className="space-y-6">
                    <div className="card p-4">
                      <p className="label-eyebrow mb-3">Day-by-day</p>
                      <div className="space-y-1.5">
                        {Object.entries(
                          historyRecords.reduce((acc, r) => {
                            if (!acc[r.class_date]) acc[r.class_date] = { present: 0, absent: 0, late: 0 };
                            acc[r.class_date][r.status] = (acc[r.class_date][r.status] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([date, counts]) => (
                          <div key={date} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
                            <span>{new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                            <span className="text-ink/60">
                              <span className="text-leaf font-semibold">{counts.present || 0} present</span> · <span className="text-spark font-semibold">{counts.absent || 0} absent</span> · <span className="text-saffron font-semibold">{counts.late || 0} late</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-4">
                      <p className="label-eyebrow mb-3">Monthly summary per student</p>
                      <div className="space-y-1.5">
                        {historyStudents.map((s) => {
                          const studentRecords = historyRecords.filter((r) => r.student_id === s.id);
                          const present = studentRecords.filter((r) => r.status === "present").length;
                          const pct = studentRecords.length ? Math.round((present / studentRecords.length) * 100) : null;
                          return (
                            <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
                              <span className="font-medium">{titleCase(s.full_name)}</span>
                              <span className={`font-semibold ${pct === null ? "text-ink/40" : pct >= 75 ? "text-leaf" : pct >= 50 ? "text-saffron" : "text-spark"}`}>
                                {pct === null ? "No records" : `${pct}% (${present}/${studentRecords.length})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-6">
            <form onSubmit={submitAssignment} className="card p-6 space-y-4 max-w-lg">
              <select className="input-field" value={assignForm.classLevel} onChange={(e) => setAssignForm({ ...assignForm, classLevel: e.target.value })}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <div className="text-sm text-ink/60">Subject: <span className="font-semibold text-ink">{profile?.subject}</span></div>
              <input required placeholder="Title" className="input-field" value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} />
              <textarea placeholder="Description" className="input-field" rows={3} value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} />
              <input type="date" className="input-field" value={assignForm.dueDate} onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })} />
              <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Add assignment"}</button>
            </form>

            <div>
              <p className="label-eyebrow mb-3">Past assignments</p>
              <div className="space-y-3">
                {pastAssignments.length === 0 && <EmptyState icon="📚" title="No assignments created yet" />}
                {pastAssignments.map((a) => (
                  <div key={a.id} className="card p-4">
                    <button onClick={() => loadSubmissions(a.id)} className="w-full flex items-center justify-between text-left">
                      <div>
                        <p className="label-eyebrow mb-1">{a.subject} — Class {a.class_level}</p>
                        <p className="font-semibold">{a.title}</p>
                        {a.due_date && <p className="text-xs text-ink/50 mt-1">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                      </div>
                      <span className="text-sm text-clay font-semibold whitespace-nowrap">
                        {expandedAssignment === a.id ? "Hide submissions ▲" : "View submissions ▼"}
                      </span>
                    </button>

                    {expandedAssignment === a.id && (
                      <div className="mt-4 pt-4 border-t border-line space-y-3">
                        {assignmentSubmissions.length === 0 && <p className="text-sm text-ink/50">No submissions yet.</p>}
                        {assignmentSubmissions.map((s) => (
                          <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm bg-ink/[0.02] rounded-lg p-3">
                            <div>
                              <p className="font-medium">{titleCase(s.profiles?.full_name) || "Student"}</p>
                              {isLikelyUrl(s.file_url) ? (
                                <a href={s.file_url} target="_blank" rel="noreferrer" className="text-clay text-xs font-semibold break-all">View submission</a>
                              ) : (
                                <p className="text-xs text-ink/70 whitespace-pre-wrap mt-0.5">{s.file_url}</p>
                              )}
                              {s.grade && <span className="ml-2 text-xs text-leaf font-semibold">Graded — {s.grade}</span>}
                            </div>
                            {!s.grade && (
                              <div className="flex gap-2">
                                <input
                                  placeholder="Grade / feedback"
                                  className="input-field text-sm py-1.5 w-40"
                                  value={gradeInputs[s.id] || ""}
                                  onChange={(e) => setGradeInputs((g) => ({ ...g, [s.id]: e.target.value }))}
                                />
                                <button onClick={() => saveGrade(s.id)} className="btn-primary text-sm py-1.5">Save</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "tests" && (
          <form onSubmit={submitTest} className="card p-6 space-y-4 max-w-2xl">
            <select className="input-field" value={testForm.classLevel} onChange={(e) => setTestForm({ ...testForm, classLevel: e.target.value })}>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <div className="text-sm text-ink/60">Subject: <span className="font-semibold text-ink">{profile?.subject}</span></div>
            <input required placeholder="Test title" className="input-field" value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} />
            <div>
              <label className="text-sm font-semibold text-ink/70">Scheduled date &amp; time (leave empty for always-available practice set)</label>
              <div className="flex gap-3 mt-1">
                <input type="date" className="input-field" value={testForm.scheduledDate} onChange={(e) => setTestForm({ ...testForm, scheduledDate: e.target.value })} />
                <input type="time" className="input-field" value={testForm.scheduledTime} onChange={(e) => setTestForm({ ...testForm, scheduledTime: e.target.value })} disabled={!testForm.scheduledDate} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Questions</p>
              <p className="text-xs text-ink/50">Students earn 10 pts per correct MCQ answer — up to {questions.filter((q) => q.type === "mcq").length * 10} pts on this test</p>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="border border-line rounded-xl p-4 space-y-2 bg-ink/[0.015]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 p-0.5 rounded-lg bg-ink/[0.05]">
                    <button type="button" onClick={() => setQuestionType(i, "mcq")} className={`px-3 py-1 text-xs font-semibold rounded-md ${q.type === "mcq" ? "bg-white text-clay shadow-sm" : "text-ink/50"}`}>Multiple choice</button>
                    <button type="button" onClick={() => setQuestionType(i, "short")} className={`px-3 py-1 text-xs font-semibold rounded-md ${q.type === "short" ? "bg-white text-clay shadow-sm" : "text-ink/50"}`}>Short answer</button>
                  </div>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(i)} className="text-xs text-spark font-semibold">Remove</button>
                  )}
                </div>
                <input required placeholder={`Question ${i + 1}`} className="input-field" value={q.q} onChange={(e) => updateQuestion(i, "q", e.target.value)} />
                {q.type === "mcq" ? (
                  <>
                    <p className="text-xs text-ink/50">Select the radio button next to the correct option:</p>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => updateQuestion(i, "correct", oi)} />
                        <input required placeholder={`Option ${oi + 1}`} className="input-field" value={opt} onChange={(e) => updateOption(i, oi, e.target.value)} />
                      </div>
                    ))}
                  </>
                ) : (
                  <div>
                    <p className="text-xs text-ink/50 mb-1">Students will type a free-text answer. This isn't auto-graded, and there's no review screen yet — you can check responses directly in your Supabase table if needed.</p>
                    <input
                      placeholder="Model answer (optional, for your own reference)"
                      className="input-field"
                      value={q.sampleAnswer || ""}
                      onChange={(e) => updateQuestion(i, "sampleAnswer", e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="btn-secondary text-sm">+ Add question</button>
            <button disabled={saving} className="btn-primary w-full">{saving ? "Saving..." : "Create test"}</button>
          </form>
        )}

        {tab === "remarks" && (
          <div>
            <div className="flex gap-3 mb-4">
              <select className="input-field w-40" value={remarkClass} onChange={(e) => setRemarkClass(e.target.value)}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <button onClick={loadStudentsForRemarks} className="btn-secondary text-sm">Load students</button>
            </div>
            <div className="space-y-3">
              {remarkStudents.length === 0 && <EmptyState icon="📝" title="No students loaded" subtitle="Pick a class and load its students to add a remark." />}
              {remarkStudents.map((s) => (
                <div key={s.id} className="card p-4">
                  <p className="font-medium mb-2">{titleCase(s.full_name)}</p>
                  <div className="flex gap-2">
                    <input
                      placeholder="Write a remark visible to this student's parent..."
                      className="input-field text-sm"
                      value={remarkInputs[s.id] || ""}
                      onChange={(e) => setRemarkInputs((r) => ({ ...r, [s.id]: e.target.value }))}
                    />
                    <button onClick={() => addRemark(s.id)} className="btn-primary text-sm py-1.5 whitespace-nowrap">Add remark</button>
                  </div>
                  {remarkStatus[s.id] && <div className="mt-2"><StatusPill tone={remarkStatus[s.id].startsWith("Error") ? "error" : "info"}>{remarkStatus[s.id]}</StatusPill></div>}

                  {(studentRemarks[s.id] || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                      <p className="text-xs text-ink/50 font-semibold">Past remarks</p>
                      {studentRemarks[s.id].map((r) => (
                        <p key={r.id} className="text-sm text-ink/80">
                          {r.remark} <span className="text-xs text-ink/40">— {new Date(r.created_at).toLocaleDateString()}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="card p-5">
            <p className="label-eyebrow mb-3">Student performance by subject</p>
            {analytics.length === 0 && <EmptyState icon="📊" title="No test attempts recorded yet" />}
            {analytics.map((a) => (
              <div key={a.key} className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{a.key}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{a.pct}% avg &middot; {a.attempts} attempts</span>
                    <PerformanceBadge pct={a.pct} />
                  </span>
                </div>
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
                <p className="text-xs text-ink/50 mb-1">{titleCase(d.profiles?.full_name)} — Class {d.profiles?.class_level} — {d.subject}</p>
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
