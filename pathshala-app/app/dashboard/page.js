"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import VideoEmbed from "@/components/VideoEmbed";
import TestPlayer from "@/components/TestPlayer";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { key: "learn", label: "Learn", icon: "🎥", color: "#2F6FED" },
  { key: "practice", label: "Practice", icon: "📝", color: "#06B6D4" },
  { key: "tests", label: "Tests", icon: "🎯", color: "#FF4D8D" },
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

    const [{ data: videoData }, { data: liveData }, { data: materialData }, { data: testData }, { data: attemptData }, { data: doubtData }, { data: annData }] = await Promise.all([
      supabase.from("videos").select("*").eq("class_level", classLevel).order("subject").order("sort_order"),
      supabase.from("live_classes").select("*").eq("class_level", classLevel).order("scheduled_at"),
      supabase.from("study_material").select("*").eq("class_level", classLevel),
      supabase.from("tests").select("*").eq("class_level", classLevel),
      supabase.from("test_attempts").select("*, tests(subject, title)").eq("student_id", session.user.id),
      supabase.from("doubts").select("*").eq("student_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").or(`class_level.eq.${classLevel},class_level.is.null`).order("created_at", { ascending: false }).limit(5),
    ]);

    setVideos(videoData || []);
    setLiveClasses(liveData || []);
    setMaterial(materialData || []);
    setTests(testData || []);
    setAttempts(attemptData || []);
    setDoubts(doubtData || []);
    setAnnouncements(annData || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

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

  if (loading) return <p className="p-10 text-center text-ink/60">Loading...</p>;

  const hasAccess = !!subscription;
  const upcomingLive = liveClasses.filter((l) => new Date(l.scheduled_at) > new Date()).slice(0, 3);
  const upcomingTests = tests.filter((t) => t.scheduled_at && new Date(t.scheduled_at) > new Date()).slice(0, 3);
  const practiceTests = tests.filter((t) => !t.scheduled_at);
  const scheduledTests = tests.filter((t) => t.scheduled_at);
  const continueVideo = videos[0];

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
      <main className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
        <p className="label-eyebrow mb-1">Class {profile?.class_level}</p>
        <h1 className="font-display text-3xl font-semibold text-ink">👋 Welcome back, {profile?.full_name?.split(" ")[0]}</h1>

        {!hasAccess && (
          <div className="card p-5 mt-5 border-clay/40">
            <p className="font-medium text-ink">You don't have an active subscription.</p>
            <p className="text-sm text-ink/60 mt-1 mb-3">Subscribe to unlock videos, live classes and study material.</p>
            <a href="/dashboard/subscribe" className="btn-primary inline-block">Subscribe now</a>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-6">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.key}
              onClick={() => setTab(qa.key)}
              style={tab === qa.key ? { background: `linear-gradient(135deg, ${qa.color}, #06B6D4)`, borderColor: qa.color } : {}}
              className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border text-xs font-medium transition-all ${
                tab === qa.key ? "text-white shadow-lg scale-[1.03]" : "bg-white border-[#DCE7F7] text-ink/70 hover:border-clay/50"
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
          <div className="mt-8 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow">Points</p>
                <p className="text-2xl font-display font-semibold mt-1">{profile?.points || 0}</p>
                <p className="text-xs text-ink/50 mt-1">Badge: {badgeFor(profile?.points || 0)} 🏆</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow">Streak</p>
                <p className="text-2xl font-display font-semibold mt-1">{profile?.streak_count || 0} tests</p>
                <p className="text-xs text-ink/50 mt-1">Keep completing tests to grow it</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow">Today's plan</p>
                <p className="text-sm mt-1">{continueVideo ? continueVideo.title : "No lectures yet"}</p>
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
                {announcements.map((a) => <p key={a.id} className="text-sm mb-1"><span className="font-medium">{a.title}:</span> {a.message}</p>)}
              </div>
            </div>
          </div>
        )}

        {tab === "learn" && (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {videos.length === 0 && <p className="text-ink/60">No lectures uploaded yet.</p>}
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
          <div className="mt-8">
            {activeTest ? (
              <div>
                <button onClick={() => setActiveTest(null)} className="btn-secondary text-sm mb-4">← Back to list</button>
                <h2 className="font-display text-xl font-semibold mb-4">{activeTest.title}</h2>
                <TestPlayer test={activeTest} studentId={session.user.id} onDone={loadAll} />
              </div>
            ) : (
              <div className="space-y-3">
                {(tab === "practice" ? practiceTests : scheduledTests).length === 0 && (
                  <p className="text-ink/60">No {tab === "practice" ? "practice sets" : "scheduled tests"} yet.</p>
                )}
                {(tab === "practice" ? practiceTests : scheduledTests).map((t) => (
                  <div key={t.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="label-eyebrow mb-1">{t.subject}</p>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-ink/50">{t.questions?.length || 0} questions {t.scheduled_at ? `· ${new Date(t.scheduled_at).toLocaleString()}` : ""}</p>
                    </div>
                    <button onClick={() => setActiveTest(t)} className="btn-primary text-sm py-1.5" disabled={!hasAccess}>
                      {hasAccess ? "Start" : "Locked"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="mt-8 space-y-4">
            {liveClasses.length === 0 && <p className="text-ink/60">No live classes scheduled.</p>}
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
          <div className="mt-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Strongest subject</p>
                <p className="text-lg font-medium">{strongest ? `${strongest.subject} — ${strongest.pct}%` : "Take a test to see this"}</p>
              </div>
              <div className="card p-5">
                <p className="label-eyebrow mb-1">Needs attention</p>
                <p className="text-lg font-medium">{weakest ? `${weakest.subject} — ${weakest.pct}%` : "Take a test to see this"}</p>
              </div>
            </div>
            <div className="card p-5">
              <p className="label-eyebrow mb-3">Subject-wise progress</p>
              {subjectList.length === 0 && <p className="text-sm text-ink/50">No test attempts yet.</p>}
              {subjectList.map((s) => (
                <div key={s.subject} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{s.subject}</span><span>{s.pct}%</span></div>
                  <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
                    <div className="h-full bg-leaf" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <p className="label-eyebrow mb-3">Test history</p>
              {attempts.length === 0 && <p className="text-sm text-ink/50">No attempts yet.</p>}
              {attempts.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-2 border-b border-[#DCE7F7] last:border-0">
                  <span>{a.tests?.title || "Test"}</span>
                  <span>{a.score}/{a.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="mt-8 space-y-3">
            {material.length === 0 && <p className="text-ink/60">No study material uploaded yet.</p>}
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
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <form onSubmit={submitDoubt} className="card p-5 space-y-3">
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
              {doubts.length === 0 && <p className="text-ink/60 text-sm">No doubts asked yet.</p>}
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
          <div className="mt-8 card p-6 max-w-md">
            <p className="label-eyebrow mb-1">Name</p>
            <p className="mb-4">{profile?.full_name}</p>
            <p className="label-eyebrow mb-1">Class</p>
            <p className="mb-4">Class {profile?.class_level}</p>
            <p className="label-eyebrow mb-1">Phone</p>
            <p className="mb-4">{profile?.phone}</p>
            <p className="label-eyebrow mb-1">Points &amp; badge</p>
            <p>{profile?.points || 0} pts — {badgeFor(profile?.points || 0)}</p>
          </div>
        )}
      </main>
    </>
  );
}
