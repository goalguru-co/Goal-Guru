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

function badgeFor(points) {
  if (points >= 300) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

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
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submitLinks, setSubmitLinks] = useState({});
  const [doubts, setDoubts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tab, setTab] = useState("overview");
  const [activeTest, setActiveTest] = useState(null);
  const [doubtForm, setDoubtForm] = useState({ subject: "", question: "" });
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    setSession(session);

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
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

    const [{ data: videoData }, { data: liveData }, { data: materialData }, { data: testData }, { data: attemptData }, { data: assignmentData }, { data: submissionData }, { data: doubtData }, { data: annData }] = await Promise.all([
      supabase.from("videos").select("*").eq("class_level", classLevel).order("subject").order("sort_order"),
      supabase.from("live_classes").select("*").eq("class_level", classLevel).order("scheduled_at"),
      supabase.from("study_material").select("*").eq("class_level", classLevel),
      supabase.from("tests").select("*").eq("class_level", classLevel),
      supabase.from("test_attempts").select("*, tests(subject, title)").eq("student_id", session.user.id),
      supabase.from("assignments").select("*").eq("class_level", classLevel).order("due_date"),
      supabase.from("assignment_submissions").select("*").eq("student_id", session.user.id),
      supabase.from("doubts").select("*").eq("student_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").or(`class_level.eq.${classLevel},class_level.is.null`).order("created_at", { ascending: false }).limit(5),
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
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function submitAssignment(assignmentId) {
    const fileUrl = (submitLinks[assignmentId] || "").trim();
    if (!fileUrl) return;
    await supabase.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      student_id: session.user.id,
      file_url: fileUrl,
    });
    setSubmitLinks((s) => ({ ...s, [assignmentId]: "" }));
    loadAll();
  }

  async function submitDoubt(e) {
    e.preventDefault();
    await supabase.from("doubts").insert({
      student_id: session.user.id,
      subject: doubtForm.subject,
      question: doubtForm.question,
    });
    setDoubtForm({ subject: "", question: "" });
    loadAll();
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

  return (
    <>
      <Navbar session={session} role="student" />
      <main className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
        <PageHeader
          eyebrow={`Class ${profile?.class_level}`}
          title={<>👋 Welcome back, {profile?.full_name?.split(" ")[0]}</>}
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
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-8">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.key}
              onClick={() => setTab(qa.key)}
              style={tab === qa.key ? { background: `linear-gradient(135deg, ${qa.color}, #06B6D4)`, borderColor: qa.color } : {}}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border text-xs font-medium transition-all duration-300 ${
                tab === qa.key ? "text-white shadow-glow scale-[1.03]" : "bg-white border-line text-ink/70 hover:border-clay/50 hover:-translate-y-0.5"
              }`}
            >
              <span
                className="text-lg w-8 h-8 flex items-center justify-center rounded-full"
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
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="Points" value={profile?.points || 0} icon="🏆" accent="saffron" />
              <StatCard label="Streak" value={`${profile?.streak_count || 0} tests`} icon="🔥" accent="spark" />
              <div className="card p-5">
                <p className="label-eyebrow">Today's plan</p>
                <p className="text-sm mt-2 font-medium">{continueVideo ? continueVideo.title : "No lectures yet"}</p>
                <p className="text-xs text-ink/50 mt-1">{upcomingLive[0] ? `Live: ${upcomingLive[0].title}` : "No live class today"}</p>
              </div>
            </div>
            <p className="text-xs text-ink/40 -mt-4">Badge: {badgeFor(profile?.points || 0)} 🏆</p>

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
                {announcements.map((a) => <p key={a.id} className="text-sm mb-1"><span className="font-medium">{a.title}:</span> {a.message}</p>)}
              </div>
            </div>
          </div>
        )}

        {tab === "learn" && (
          <div className="grid md:grid-cols-2 gap-6">
            {videos.length === 0 && <EmptyState icon="🎥" title="No lectures uploaded yet" subtitle="Check back soon — your teacher hasn't added any videos for this class yet." />}
            {videos.map((v) => (
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
        )}

        {(tab === "practice" || tab === "tests") && (
          <div>
            {activeTest ? (
              <div>
                <button onClick={() => setActiveTest(null)} className="btn-secondary text-sm mb-4">← Back to list</button>
                <h2 className="font-display text-xl font-bold mb-4">{activeTest.title}</h2>
                <TestPlayer test={activeTest} studentId={session.user.id} onDone={loadAll} />
              </div>
            ) : (
              <div className="space-y-3">
                {(tab === "practice" ? practiceTests : scheduledTests).length === 0 && (
                  <EmptyState icon="🎯" title={`No ${tab === "practice" ? "practice sets" : "scheduled tests"} yet`} />
                )}
                {(tab === "practice" ? practiceTests : scheduledTests).map((t) => {
                  const attempt = attemptedTests[t.id];
                  return (
                    <div key={t.id} className="card p-4 flex items-center justify-between">
                      <div>
                        <p className="label-eyebrow mb-1">{t.subject}</p>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-ink/50">{t.questions?.length || 0} questions {t.scheduled_at ? `· ${new Date(t.scheduled_at).toLocaleString()}` : ""}</p>
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

        {tab === "assignments" && (
          <div className="space-y-3">
            {assignments.length === 0 && <EmptyState icon="📚" title="No assignments yet" subtitle="Your teacher hasn't posted any homework for this class yet." />}
            {assignments.map((a) => {
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
                  {!submission && (
                    <div className="flex gap-2 mt-3">
                      <input
                        placeholder="Paste a link to your work (Drive, doc, photo, etc.)"
                        className="input-field text-sm"
                        value={submitLinks[a.id] || ""}
                        onChange={(e) => setSubmitLinks((s) => ({ ...s, [a.id]: e.target.value }))}
                      />
                      <button onClick={() => submitAssignment(a.id)} className="btn-primary text-sm py-1.5 whitespace-nowrap">Submit</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "live" && (
          <div className="space-y-4">
            {liveClasses.length === 0 && <EmptyState icon="📅" title="No live classes scheduled" />}
            {liveClasses.map((l) => (
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

        {tab === "results" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Strongest subject</p>
                <p className="text-lg font-semibold">{strongest ? `${strongest.subject} — ${strongest.pct}%` : "Take a test to see this"}</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Needs attention</p>
                <p className="text-lg font-semibold">{weakest ? `${weakest.subject} — ${weakest.pct}%` : "Take a test to see this"}</p>
              </div>
            </div>
            <div className="card p-5">
              <p className="label-eyebrow mb-3">Subject-wise progress</p>
              {subjectList.length === 0 && <p className="text-sm text-ink/50">No test attempts yet.</p>}
              {subjectList.map((s) => (
                <div key={s.subject} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{s.subject}</span><span className="font-semibold">{s.pct}%</span></div>
                  <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-clay to-leaf rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
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
          <div className="space-y-3">
            {material.length === 0 && <EmptyState icon="📄" title="No study material uploaded yet" />}
            {material.map((m) => (
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

        {tab === "doubts" && (
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={submitDoubt} className="card p-5 space-y-3 h-fit">
              <p className="label-eyebrow">Ask a doubt</p>
              <input
                required
                placeholder="Subject"
                className="input-field"
                value={doubtForm.subject}
                onChange={(e) => setDoubtForm({ ...doubtForm, subject: e.target.value })}
              />
              <textarea
                required
                placeholder="Type your question..."
                className="input-field"
                rows={4}
                value={doubtForm.question}
                onChange={(e) => setDoubtForm({ ...doubtForm, question: e.target.value })}
              />
              <button className="btn-primary w-full">Submit</button>
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
            <p className="mb-4 font-medium">{profile?.full_name}</p>
            <p className="label-eyebrow mb-1">Class</p>
            <p className="mb-4 font-medium">Class {profile?.class_level}</p>
            <p className="label-eyebrow mb-1">Phone</p>
            <p className="mb-4 font-medium">{profile?.phone}</p>
            <p className="label-eyebrow mb-1">Points &amp; badge</p>
            <p className="font-medium">{profile?.points || 0} pts — {badgeFor(profile?.points || 0)}</p>
          </div>
        )}
      </main>
    </>
  );
}
