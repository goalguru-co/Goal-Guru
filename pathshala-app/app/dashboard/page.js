"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import VideoEmbed from "@/components/VideoEmbed";
import TestPlayer from "@/components/TestPlayer";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import SubjectGrid from "@/components/SubjectGrid";
import Badge from "@/components/Badge";
import DonutChart from "@/components/DonutChart";
import BarChart from "@/components/BarChart";
import TrendLine from "@/components/TrendLine";
import PerformanceBadge from "@/components/PerformanceBadge";
import { isLikelyUrl, titleCase } from "@/lib/format";
import { SUBJECTS } from "@/lib/subjects";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { key: "learn", label: "Learn", icon: "🎥", color: "#2F6FED" },
  { key: "practice", label: "Practice", icon: "📝", color: "#06B6D4" },
  { key: "tests", label: "Tests", icon: "🎯", color: "#FF4D8D" },
  { key: "assignments", label: "Assignments", icon: "📚", color: "#2F6FED" },
  { key: "live", label: "Live Classes", icon: "📅", color: "#FFB020" },
  { key: "results", label: "Results", icon: "📊", color: "#2F6FED" },
  { key: "notes", label: "Notes", icon: "📄", color: "#06B6D4" },
  { key: "doubts", label: "Doubts", icon: "❓", color: "#FF4D8D" },
  { key: "profile", label: "Profile", icon: "👤", color: "#FFB020" },
];

const ON_TIME_POINTS = 5;
const LATE_POINTS = 2;

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [videos, setVideos] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [material, setMaterial] = useState([]);
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submitLinks, setSubmitLinks] = useState({});
  const [doubts, setDoubts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (requested) return requested;
    }
    return "overview";
  });
  const [activeTest, setActiveTest] = useState(null);
  const [doubtForm, setDoubtForm] = useState({ subject: "", question: "" });
  const [loading, setLoading] = useState(true);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState({});
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState({});
  const [weeklyRank, setWeeklyRank] = useState(null);

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

    if (!profileData?.approved) {
      await supabase.auth.signOut();
      router.push("/login?notice=pending-approval");
      return;
    }

    setSession(session);
    setProfile(profileData);
    const classLevel = profileData?.class_level;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("status", "active")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(sub);

    const [{ data: videoData }, { data: liveData }, { data: materialData }, { data: testData }, { data: attemptData }, { data: assignmentData }, { data: submissionData }, { data: doubtData }, { data: annData }, { data: attendanceData }] = await Promise.all([
      supabase.from("videos").select("*").eq("class_level", classLevel).order("subject").order("sort_order"),
      supabase.from("live_classes").select("*").eq("class_level", classLevel).order("scheduled_at"),
      supabase.from("study_material").select("*").eq("class_level", classLevel),
      supabase.from("tests").select("*").eq("class_level", classLevel),
      supabase.from("test_attempts").select("*, tests(subject, title)").eq("student_id", session.user.id),
      supabase.from("assignments").select("*").eq("class_level", classLevel).order("due_date"),
      supabase.from("assignment_submissions").select("*").eq("student_id", session.user.id),
      supabase.from("doubts").select("*").eq("student_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").or(`class_level.eq.${classLevel},class_level.is.null`).order("created_at", { ascending: false }).limit(5),
      supabase.from("attendance").select("*").eq("student_id", session.user.id).order("class_date", { ascending: false }).limit(30),
    ]);

    setVideos(videoData || []);
    setLiveClasses(liveData || []);
    setMaterial(materialData || []);
    setTests(testData || []);
    setAttempts(attemptData || []);
    setAssignments(assignmentData || []);
    setSubmissions(submissionData || []);
    setDoubts(doubtData || []);
    setAnnouncements(annData || []);
    setAttendance(attendanceData || []);
    setLoading(false);

    fetch("/api/weekly-rank", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((r) => { if (!r.error) setWeeklyRank(r); })
      .catch(() => {});
  }

  useEffect(() => { loadAll(); }, []);

  async function submitAssignment(assignmentId) {
    const fileUrl = (submitLinks[assignmentId] || "").trim();
    if (!fileUrl || submittingAssignment) return;
    setSubmittingAssignment(true);

    const res = await fetch("/api/complete-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ assignmentId, submission: fileUrl }),
    });
    const result = await res.json();

    if (result.error) {
      setAssignmentError((e) => ({ ...e, [assignmentId]: result.error }));
      setSubmittingAssignment(false);
      return;
    }

    setSubmitLinks((s) => ({ ...s, [assignmentId]: "" }));
    await loadAll();
    setSubmittingAssignment(false);
  }

  async function submitDoubt(e) {
    e.preventDefault();
    if (submittingDoubt) return;
    setSubmittingDoubt(true);
    await supabase.from("doubts").insert({
      student_id: session.user.id,
      subject: doubtForm.subject.trim(),
      question: doubtForm.question.trim(),
    });
    setDoubtForm({ subject: "", question: "" });
    await loadAll();
    setSubmittingDoubt(false);
  }

  if (loading) return <PageLoading />;

  const hasAccess = !!subscription;
  const upcomingLive = liveClasses.filter((l) => new Date(l.scheduled_at) > new Date()).slice(0, 3);
  const upcomingTests = tests.filter((t) => t.scheduled_at && new Date(t.scheduled_at) > new Date()).slice(0, 3);
  const practiceTests = tests.filter((t) => !t.scheduled_at);
  const scheduledTests = tests.filter((t) => t.scheduled_at);
  const continueVideo = videos[0];

  const attemptedTests = {};
  attempts.forEach((a) => { attemptedTests[a.test_id] = a; });

  const submittedAssignments = {};
  submissions.forEach((s) => { submittedAssignments[s.assignment_id] = s; });

  const subjectScores = {};
  attempts.forEach((a) => {
    const subj = a.tests?.subject || "General";
    if (!subjectScores[subj]) subjectScores[subj] = { correct: 0, total: 0 };
    subjectScores[subj].correct += a.score || 0;
    subjectScores[subj].total += a.total || 0;
  });
  const subjectList = Object.entries(subjectScores).map(([subject, s]) => ({
    subject,
    pct: s.total ? Math.round((s.correct / s.total) * 100) : 0,
  }));
  const strongest = subjectList.length ? [...subjectList].sort((a, b) => b.pct - a.pct)[0] : null;
  const weakest = subjectList.length ? [...subjectList].sort((a, b) => a.pct - b.pct)[0] : null;

  const scoreTrend = [...attempts]
    .filter((a) => a.completed_at)
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    .slice(-10)
    .map((a) => ({ label: new Date(a.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: a.total ? Math.round((a.score / a.total) * 100) : 0 }));

  const attendanceCounts = { present: 0, absent: 0, late: 0 };
  attendance.forEach((a) => { attendanceCounts[a.status] = (attendanceCounts[a.status] || 0) + 1; });
  const attendanceSegments = [
    { label: "present", value: attendanceCounts.present, color: "#06B6D4" },
    { label: "absent", value: attendanceCounts.absent, color: "#FF4D8D" },
    { label: "late", value: attendanceCounts.late, color: "#FFB020" },
  ].filter((s) => s.value > 0);

  return (
    <>
      <Navbar session={session} role="student" />
      <main className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
        <PageHeader
          eyebrow={`Class ${profile?.class_level}`}
          title={<>👋 Welcome back, {titleCase(profile?.full_name?.split(" ")[0])}</>}
        />

        {!hasAccess && (
          <div className="card-gradient-border p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink">You don't have an active subscription.</p>
              <p className="text-sm text-ink/60 mt-1">Subscribe to unlock videos, live classes and study material.</p>
            </div>
            <a href="/dashboard/subscribe" className="btn-primary shrink-0">Subscribe now</a>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-none">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.key}
              onClick={() => setTab(qa.key)}
              style={tab === qa.key ? { background: `linear-gradient(135deg, ${qa.color}, #06B6D4)`, borderColor: qa.color } : {}}
              className={`flex items-center gap-2 pl-2 pr-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-300 ${
                tab === qa.key ? "text-white shadow-glow" : "bg-white border-line text-ink/70 hover:border-clay/50 hover:-translate-y-0.5"
              }`}
            >
              <span
                className="text-base w-7 h-7 flex items-center justify-center rounded-full shrink-0"
                style={{ background: tab === qa.key ? "rgba(255,255,255,0.25)" : `${qa.color}1A` }}
              >
                {qa.icon}
              </span>
              {qa.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Your badge</p>
                <Badge points={profile?.points || 0} size="lg" />
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-2">Weekly class rank</p>
                {weeklyRank && weeklyRank.rank ? (
                  <>
                    <p className="font-display text-3xl font-extrabold text-ink">#{weeklyRank.rank} <span className="text-base font-body font-medium text-ink/50">of {weeklyRank.totalStudents}</span></p>
                    <p className="text-xs text-ink/50 mt-1">{weeklyRank.weeklyPoints} pts earned this week</p>
                  </>
                ) : (
                  <p className="text-sm text-ink/50 mt-1">Complete a test this week to get ranked among your classmates.</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="label-eyebrow">Points</p>
                  <span className="text-lg">🏆</span>
                </div>
                <p className="font-display text-2xl md:text-3xl font-extrabold text-ink">{profile?.points || 0}</p>
                <p className="text-xs text-ink/50 mt-1.5 leading-relaxed">
                  Tests: up to 10 pts/correct answer (scales with your accuracy). Assignments: 5 pts on time, 2 pts if late.
                </p>
              </div>
              <StatCard label="Streak" value={`${profile?.streak_count || 0} tests`} icon="🔥" accent="spark" />
              <div className="card p-5">
                <p className="label-eyebrow">Today's plan</p>
                <p className="text-sm mt-2 font-medium">{continueVideo ? continueVideo.title : "No lectures yet"}</p>
                <p className="text-xs text-ink/50 mt-1">{upcomingLive[0] ? `Live: ${upcomingLive[0].title}` : "No live class today"}</p>
              </div>
            </div>

            {continueVideo && (
              <div className="card p-5">
                <p className="label-eyebrow mb-2">Continue learning</p>
                <p className="font-medium mb-3">{continueVideo.title} — {continueVideo.subject}</p>
                {hasAccess ? (
                  <VideoEmbed youtubeId={continueVideo.youtube_id} title={continueVideo.title} studentId={session.user.id} videoId={continueVideo.id} />
                ) : (
                  <div className="aspect-video bg-ink/5 rounded-xl flex items-center justify-center text-sm text-ink/50">Subscribe to unlock</div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-2">Upcoming tests &amp; classes</p>
                {upcomingLive.length === 0 && upcomingTests.length === 0 && <p className="text-sm text-ink/50">Nothing scheduled yet.</p>}
                {upcomingLive.map((l) => <p key={l.id} className="text-sm mb-1">📅 {l.title} — {new Date(l.scheduled_at).toLocaleString()}</p>)}
                {upcomingTests.map((t) => <p key={t.id} className="text-sm mb-1">🎯 {t.title} — {new Date(t.scheduled_at).toLocaleString()}</p>)}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-2">🔔 Announcements</p>
                {announcements.length === 0 && <p className="text-sm text-ink/50">No announcements yet.</p>}
                {announcements.map((a) => (
                  <div key={a.id} className="mb-3 last:mb-0">
                    <p className="text-sm"><span className="font-medium">{a.title}:</span> {a.message}</p>
                    {a.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image_url} alt={a.title} className="mt-2 rounded-lg max-h-40 w-auto object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "learn" && (
          <div>
            {videos.length === 0 && <EmptyState icon="🎥" title="No lectures uploaded yet" subtitle="Check back soon — your teacher hasn't added any videos for this class yet." />}
            {videos.length > 0 && !subjectFilter.learn && (
              <SubjectGrid items={videos} icon="🎥" onSelect={(s) => setSubjectFilter((f) => ({ ...f, learn: s }))} />
            )}
            {subjectFilter.learn && (
              <div>
                <button onClick={() => setSubjectFilter((f) => ({ ...f, learn: null }))} className="btn-secondary text-sm mb-4">← All subjects</button>
                <div className="grid md:grid-cols-2 gap-6">
                  {videos.filter((v) => v.subject === subjectFilter.learn).map((v) => (
                    <div key={v.id} className="card p-4">
                      <p className="label-eyebrow mb-2">{v.subject}</p>
                      <h3 className="font-medium mb-3">{v.title}</h3>
                      {hasAccess ? (
                        <VideoEmbed youtubeId={v.youtube_id} title={v.title} studentId={session.user.id} videoId={v.id} />
                      ) : (
                        <div className="aspect-video bg-ink/5 rounded-xl flex items-center justify-center text-sm text-ink/50">Subscribe to unlock</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(tab === "practice" || tab === "tests") && (
          <div>
            {!activeTest && (
              <p className="text-sm text-ink/50 mb-4">
                {tab === "practice"
                  ? "Always-available sets you can attempt anytime to sharpen a topic — not scored against a deadline."
                  : "Scheduled unit tests set by your teacher, released at a specific date and time."}
              </p>
            )}
            {activeTest ? (
              <div>
                <button onClick={() => setActiveTest(null)} className="btn-secondary text-sm mb-4">← Back to list</button>
                <h2 className="font-display text-xl font-bold mb-4">{activeTest.title}</h2>
                <TestPlayer test={activeTest} studentId={session.user.id} onDone={loadAll} />
              </div>
            ) : (
              <div>
                {(tab === "practice" ? practiceTests : scheduledTests).length === 0 && (
                  <EmptyState icon="🎯" title={`No ${tab === "practice" ? "practice sets" : "scheduled tests"} yet`} />
                )}
                {(tab === "practice" ? practiceTests : scheduledTests).length > 0 && !subjectFilter[tab] && (
                  <SubjectGrid items={tab === "practice" ? practiceTests : scheduledTests} icon="🎯" onSelect={(s) => setSubjectFilter((f) => ({ ...f, [tab]: s }))} />
                )}
                {subjectFilter[tab] && (
                  <div className="space-y-3">
                    <button onClick={() => setSubjectFilter((f) => ({ ...f, [tab]: null }))} className="btn-secondary text-sm mb-1">← All subjects</button>
                    {(tab === "practice" ? practiceTests : scheduledTests).filter((t) => t.subject === subjectFilter[tab]).map((t) => {
                      const attempt = attemptedTests[t.id];
                      const maxPoints = (t.questions || []).filter((q) => q.type !== "short").length * 10;
                      return (
                        <div key={t.id} className="card p-4 flex items-center justify-between">
                          <div>
                            <p className="label-eyebrow mb-1">{t.subject}</p>
                            <p className="font-medium">{t.title}</p>
                            <p className="text-xs text-ink/50">{t.questions?.length || 0} questions {t.scheduled_at ? `· ${new Date(t.scheduled_at).toLocaleString()}` : ""}</p>
                            {!attempt && maxPoints > 0 && (
                              <p className="text-xs text-saffron font-semibold mt-1">🏆 Earn up to {maxPoints} pts</p>
                            )}
                          </div>
                          {attempt ? (
                            <span className="text-sm font-semibold text-leaf bg-leaf/10 px-3 py-1.5 rounded-full">Completed — {attempt.score}/{attempt.total}</span>
                          ) : (
                            <button onClick={() => setActiveTest(t)} className="btn-primary text-sm py-1.5" disabled={!hasAccess}>
                              {hasAccess ? "Start" : "Locked"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-3">
            {!hasAccess && (
              <div className="card p-5 text-sm text-ink/60">Subscribe to view and submit assignments.</div>
            )}
            {hasAccess && assignments.length === 0 && <EmptyState icon="📚" title="No assignments yet" subtitle="Your teacher hasn't posted any homework for this class yet." />}
            {hasAccess && assignments.map((a) => {
              const submission = submittedAssignments[a.id];
              const overdue = a.due_date && new Date(a.due_date) < new Date() && !submission;
              return (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="label-eyebrow mb-1">{a.subject}</p>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.description && <p className="text-sm text-ink/60 mt-1">{a.description}</p>}
                      {a.due_date && (
                        <p className={`text-xs mt-2 font-medium ${overdue ? "text-spark" : "text-ink/50"}`}>
                          Due {new Date(a.due_date).toLocaleDateString()}{overdue ? " — overdue" : ""}
                        </p>
                      )}
                      {a.file_url && (
                        <a href={a.file_url} target="_blank" rel="noreferrer" className="text-xs text-clay font-semibold mt-1 inline-block">View attachment</a>
                      )}
                    </div>
                    {submission ? (
                      <span className="text-sm font-semibold text-leaf bg-leaf/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                        {submission.grade ? `Graded — ${submission.grade}` : "Submitted"}
                      </span>
                    ) : null}
                  </div>
                  {submission ? (
                    <div className="mt-3 pt-3 border-t border-line">
                      <p className="text-xs text-ink/50 mb-1">Your submission:</p>
                      {isLikelyUrl(submission.file_url) ? (
                        <a href={submission.file_url} target="_blank" rel="noreferrer" className="text-sm text-clay font-medium break-all">{submission.file_url}</a>
                      ) : (
                        <p className="text-sm text-ink whitespace-pre-wrap">{submission.file_url}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-xs text-saffron font-semibold mb-2">
                        🏆 Earn {ON_TIME_POINTS} pts for submitting on time{a.due_date ? ` (${LATE_POINTS} pts if late)` : ""}
                      </p>
                      <div className="flex flex-col md:flex-row gap-2">
                        <textarea
                          placeholder="Type your answer, or paste a link to your work (Drive, doc, photo, etc.)"
                          className="input-field text-sm"
                          rows={2}
                          value={submitLinks[a.id] || ""}
                          onChange={(e) => setSubmitLinks((s) => ({ ...s, [a.id]: e.target.value }))}
                        />
                        <button onClick={() => submitAssignment(a.id)} disabled={submittingAssignment} className="btn-primary text-sm py-1.5 whitespace-nowrap self-start">{submittingAssignment ? "Submitting..." : "Submit"}</button>
                      </div>
                      {assignmentError[a.id] && <p className="text-xs text-spark mt-1">{assignmentError[a.id]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "live" && (
          <div>
            {liveClasses.length === 0 && <EmptyState icon="📅" title="No live classes scheduled" />}
            {liveClasses.length > 0 && !subjectFilter.live && (
              <SubjectGrid items={liveClasses} icon="📅" onSelect={(s) => setSubjectFilter((f) => ({ ...f, live: s }))} />
            )}
            {subjectFilter.live && (
              <div className="space-y-4">
                <button onClick={() => setSubjectFilter((f) => ({ ...f, live: null }))} className="btn-secondary text-sm">← All subjects</button>
                {liveClasses.filter((l) => l.subject === subjectFilter.live).map((l) => (
                  <div key={l.id} className="card p-4">
                    <p className="label-eyebrow mb-1">{l.subject}</p>
                    <h3 className="font-medium mb-1">{l.title}</h3>
                    <p className="text-sm text-ink/60 mb-3">{new Date(l.scheduled_at).toLocaleString()}</p>
                    {hasAccess ? (
                      <VideoEmbed youtubeId={l.youtube_id} title={l.title} />
                    ) : (
                      <div className="aspect-video bg-ink/5 rounded-xl flex items-center justify-center text-sm text-ink/50">Subscribe to unlock</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "results" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Strongest subject</p>
                <p className="text-lg font-semibold">{strongest ? `${strongest.subject} — ${strongest.pct}%` : "Take a test to see this"}</p>
                {strongest && <PerformanceBadge pct={strongest.pct} className="mt-2" />}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Needs attention</p>
                <p className="text-lg font-semibold">{weakest ? `${weakest.subject} — ${weakest.pct}%` : "Take a test to see this"}</p>
                {weakest && <PerformanceBadge pct={weakest.pct} className="mt-2" />}
              </div>
            </div>

            {scoreTrend.length > 1 && (
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Score trend (last {scoreTrend.length} tests)</p>
                <TrendLine points={scoreTrend} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Subject-wise progress</p>
                {subjectList.length === 0 && <p className="text-sm text-ink/50">No test attempts yet.</p>}
                {subjectList.length > 0 && (
                  <BarChart data={subjectList.map((s) => ({ label: s.subject, value: s.pct }))} />
                )}
                {subjectList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {subjectList.map((s) => (
                      <div key={s.subject} className="flex items-center gap-1.5">
                        <span className="text-xs text-ink/60">{s.subject}</span>
                        <PerformanceBadge pct={s.pct} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-3">Attendance breakdown</p>
                {attendanceSegments.length === 0 && <p className="text-sm text-ink/50">No attendance recorded yet.</p>}
                {attendanceSegments.length > 0 && <DonutChart segments={attendanceSegments} />}
              </div>
            </div>

            <div className="card p-5">
              <p className="label-eyebrow mb-3">Test history</p>
              {attempts.length === 0 && <p className="text-sm text-ink/50">No attempts yet.</p>}
              {attempts.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                  <span>{a.tests?.title || "Test"}</span>
                  <span className="font-semibold">{a.score}/{a.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div>
            {material.length === 0 && <EmptyState icon="📄" title="No study material uploaded yet" />}
            {material.length > 0 && !subjectFilter.notes && (
              <SubjectGrid items={material} icon="📄" onSelect={(s) => setSubjectFilter((f) => ({ ...f, notes: s }))} />
            )}
            {subjectFilter.notes && (
              <div className="space-y-3">
                <button onClick={() => setSubjectFilter((f) => ({ ...f, notes: null }))} className="btn-secondary text-sm mb-1">← All subjects</button>
                {material.filter((m) => m.subject === subjectFilter.notes).map((m) => (
                  <div key={m.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="label-eyebrow mb-1">{m.subject}</p>
                      <h3 className="font-medium">{m.title}</h3>
                    </div>
                    {hasAccess ? (
                      <a href={m.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-sm py-1.5">Download</a>
                    ) : (
                      <span className="text-sm text-ink/50">Locked</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "doubts" && (
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={submitDoubt} className="card p-5 space-y-3 h-fit">
              <p className="label-eyebrow">Ask a doubt</p>
              <select
                required
                className="input-field"
                value={doubtForm.subject}
                onChange={(e) => setDoubtForm({ ...doubtForm, subject: e.target.value })}
              >
                <option value="">Select subject</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea
                required
                placeholder="Type your question..."
                className="input-field"
                rows={4}
                value={doubtForm.question}
                onChange={(e) => setDoubtForm({ ...doubtForm, question: e.target.value })}
              />
              <button disabled={submittingDoubt} className="btn-primary w-full">{submittingDoubt ? "Submitting..." : "Submit"}</button>
            </form>
            <div className="space-y-3">
              {doubts.length === 0 && <EmptyState icon="❓" title="No doubts asked yet" />}
              {doubts.map((d) => (
                <div key={d.id} className="card p-4">
                  <p className="label-eyebrow mb-1">{d.subject}</p>
                  <p className="text-sm font-medium mb-2">{d.question}</p>
                  {d.response ? (
                    <p className="text-sm text-leaf bg-leaf/10 rounded-lg p-2">Answer: {d.response}</p>
                  ) : (
                    <p className="text-xs text-ink/40">Waiting for a teacher's response...</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="card p-6 max-w-md">
            <p className="label-eyebrow mb-1">Name</p>
            <p className="mb-4 font-medium">{titleCase(profile?.full_name)}</p>
            <p className="label-eyebrow mb-1">Class</p>
            <p className="mb-4 font-medium">Class {profile?.class_level}</p>
            <p className="label-eyebrow mb-1">Phone</p>
            <p className="mb-4 font-medium">{profile?.phone}</p>
            <p className="label-eyebrow mb-2">Points &amp; badge</p>
            <Badge points={profile?.points || 0} size="lg" />
            <p className="text-sm text-ink/60 mt-3">{profile?.points || 0} total points</p>
          </div>
        )}
      </main>
    </>
  );
}
