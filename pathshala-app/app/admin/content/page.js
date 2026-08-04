"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import StatusPill from "@/components/StatusPill";
import { useRouter } from "next/navigation";

const CLASS_OPTIONS = [6, 7, 8, 9, 10];
const ROLE_HOME = { admin: "/admin", teacher: "/teacher", parent: "/parent", student: "/dashboard" };
const CONTENT_TABS = [
  { key: "video", label: "Video lecture" },
  { key: "live", label: "Live class" },
  { key: "material", label: "Study material" },
  { key: "ptm", label: "PTM schedule" },
  { key: "faqs", label: "Chatbot FAQs" },
];

export default function ManageContent() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("video");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [videoForm, setVideoForm] = useState({ classLevel: "6", subject: "", title: "", youtubeId: "" });
  const [liveForm, setLiveForm] = useState({ classLevel: "6", subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
  const [materialForm, setMaterialForm] = useState({ classLevel: "6", subject: "", title: "", fileUrl: "" });
  const [ptmForm, setPtmForm] = useState({ classLevel: "", scheduledDate: "", scheduledTime: "", notes: "" });
  const [ptmList, setPtmList] = useState([]);
  const [faqForm, setFaqForm] = useState({ role: "", keywords: "", question: "", answer: "" });
  const [faqList, setFaqList] = useState([]);

  async function loadPtm() {
    const { data } = await supabase.from("ptm_schedule").select("*").order("scheduled_at", { ascending: false });
    setPtmList(data || []);
  }

  async function loadFaqs() {
    const { data } = await supabase.from("chatbot_faqs").select("*").order("created_at", { ascending: false });
    setFaqList(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role, approved").eq("id", session.user.id).single();
      if (profile?.role !== "admin" || !profile?.approved) {
        await supabase.auth.signOut();
        router.push(profile?.role && profile?.approved ? (ROLE_HOME[profile.role] || "/login") : "/login?notice=pending-approval");
        return;
      }
      setSession(session);
      loadPtm();
      loadFaqs();
    }
    init();
  }, [router]);

  function extractYoutubeId(input) {
    // Accepts a full URL or a bare 11-char video ID
    const match = input.match(/(?:v=|\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : input.trim();
  }

  async function submitVideo(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving video...");
    const { error } = await supabase.from("videos").insert({
      class_level: parseInt(videoForm.classLevel, 10),
      subject: videoForm.subject.trim(),
      title: videoForm.title.trim(),
      youtube_id: extractYoutubeId(videoForm.youtubeId),
    });
    setStatus(error ? "Error: " + error.message : "Video added.");
    if (!error) setVideoForm({ ...videoForm, subject: "", title: "", youtubeId: "" });
    setSaving(false);
  }

  async function submitLive(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving live class...");
    const { error } = await supabase.from("live_classes").insert({
      class_level: parseInt(liveForm.classLevel, 10),
      subject: liveForm.subject.trim(),
      title: liveForm.title.trim(),
      youtube_id: extractYoutubeId(liveForm.youtubeId),
      scheduled_at: liveForm.scheduledDate
        ? new Date(`${liveForm.scheduledDate}T${liveForm.scheduledTime || "00:00"}`).toISOString()
        : null,
    });
    setStatus(error ? "Error: " + error.message : "Live class added.");
    if (!error) setLiveForm({ ...liveForm, subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
    setSaving(false);
  }

  async function submitMaterial(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving study material...");
    const { error } = await supabase.from("study_material").insert({
      class_level: parseInt(materialForm.classLevel, 10),
      subject: materialForm.subject.trim(),
      title: materialForm.title.trim(),
      file_url: materialForm.fileUrl.trim(),
    });
    setStatus(error ? "Error: " + error.message : "Study material added.");
    if (!error) setMaterialForm({ ...materialForm, subject: "", title: "", fileUrl: "" });
    setSaving(false);
  }

  async function submitPtm(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving PTM...");
    const { error } = await supabase.from("ptm_schedule").insert({
      class_level: ptmForm.classLevel ? parseInt(ptmForm.classLevel, 10) : null,
      scheduled_at: new Date(`${ptmForm.scheduledDate}T${ptmForm.scheduledTime || "00:00"}`).toISOString(),
      notes: ptmForm.notes.trim(),
    });
    setStatus(error ? "Error: " + error.message : "PTM scheduled.");
    if (!error) {
      setPtmForm({ classLevel: "", scheduledDate: "", scheduledTime: "", notes: "" });
      loadPtm();
    }
    setSaving(false);
  }

  async function submitFaq(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus("Saving FAQ...");
    const { error } = await supabase.from("chatbot_faqs").insert({
      role: faqForm.role || null,
      keywords: faqForm.keywords.trim(),
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
    });
    setStatus(error ? "Error: " + error.message : "FAQ added.");
    if (!error) {
      setFaqForm({ role: "", keywords: "", question: "", answer: "" });
      loadFaqs();
    }
    setSaving(false);
  }

  async function deleteFaq(id) {
    await supabase.from("chatbot_faqs").delete().eq("id", id);
    loadFaqs();
  }

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-2xl mx-auto">
        <PageHeader title="Manage content" />

        <Tabs tabs={CONTENT_TABS} active={tab} onChange={setTab} />

        {tab === "video" && (
          <form onSubmit={submitVideo} className="card p-6 space-y-4">
            <Field label="Class">
              <select className="input-field" value={videoForm.classLevel} onChange={(e) => setVideoForm({ ...videoForm, classLevel: e.target.value })}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <input required className="input-field" value={videoForm.subject} onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })} />
            </Field>
            <Field label="Title">
              <input required className="input-field" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
            </Field>
            <Field label="YouTube link or video ID (unlisted)">
              <input required className="input-field" value={videoForm.youtubeId} onChange={(e) => setVideoForm({ ...videoForm, youtubeId: e.target.value })} />
            </Field>
            <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Add video"}</button>
          </form>
        )}

        {tab === "live" && (
          <form onSubmit={submitLive} className="card p-6 space-y-4">
            <Field label="Class">
              <select className="input-field" value={liveForm.classLevel} onChange={(e) => setLiveForm({ ...liveForm, classLevel: e.target.value })}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <input required className="input-field" value={liveForm.subject} onChange={(e) => setLiveForm({ ...liveForm, subject: e.target.value })} />
            </Field>
            <Field label="Title">
              <input required className="input-field" value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} />
            </Field>
            <Field label="YouTube Live link or video ID (unlisted)">
              <input required className="input-field" value={liveForm.youtubeId} onChange={(e) => setLiveForm({ ...liveForm, youtubeId: e.target.value })} />
            </Field>
            <Field label="Scheduled date & time">
              <div className="flex gap-3">
                <input required type="date" className="input-field" value={liveForm.scheduledDate} onChange={(e) => setLiveForm({ ...liveForm, scheduledDate: e.target.value })} />
                <input required type="time" className="input-field" value={liveForm.scheduledTime} onChange={(e) => setLiveForm({ ...liveForm, scheduledTime: e.target.value })} />
              </div>
            </Field>
            <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Add live class"}</button>
          </form>
        )}

        {tab === "material" && (
          <form onSubmit={submitMaterial} className="card p-6 space-y-4">
            <Field label="Class">
              <select className="input-field" value={materialForm.classLevel} onChange={(e) => setMaterialForm({ ...materialForm, classLevel: e.target.value })}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <input required className="input-field" value={materialForm.subject} onChange={(e) => setMaterialForm({ ...materialForm, subject: e.target.value })} />
            </Field>
            <Field label="Title">
              <input required className="input-field" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} />
            </Field>
            <Field label="File link (Google Drive share link, etc.)">
              <input required className="input-field" value={materialForm.fileUrl} onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })} />
            </Field>
            <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Add study material"}</button>
          </form>
        )}

        {tab === "ptm" && (
          <div className="space-y-6">
            <form onSubmit={submitPtm} className="card p-6 space-y-4">
              <Field label="Class (leave blank for all classes)">
                <select className="input-field" value={ptmForm.classLevel} onChange={(e) => setPtmForm({ ...ptmForm, classLevel: e.target.value })}>
                  <option value="">All classes</option>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </Field>
              <Field label="Date & time">
                <div className="flex gap-3">
                  <input required type="date" className="input-field" value={ptmForm.scheduledDate} onChange={(e) => setPtmForm({ ...ptmForm, scheduledDate: e.target.value })} />
                  <input required type="time" className="input-field" value={ptmForm.scheduledTime} onChange={(e) => setPtmForm({ ...ptmForm, scheduledTime: e.target.value })} />
                </div>
              </Field>
              <Field label="Notes (venue, agenda, etc.)">
                <textarea required className="input-field" rows={3} value={ptmForm.notes} onChange={(e) => setPtmForm({ ...ptmForm, notes: e.target.value })} />
              </Field>
              <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Schedule PTM"}</button>
            </form>

            <div>
              <p className="label-eyebrow mb-3">Scheduled meetings</p>
              <div className="space-y-3">
                {ptmList.length === 0 && <p className="text-sm text-ink/50">No meetings scheduled yet.</p>}
                {ptmList.map((p) => (
                  <div key={p.id} className="card p-4">
                    <p className="label-eyebrow mb-1">{p.class_level ? `Class ${p.class_level}` : "All classes"}</p>
                    <p className="font-semibold">{new Date(p.scheduled_at).toLocaleString()}</p>
                    {p.notes && <p className="text-sm text-ink/60 mt-1">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "faqs" && (
          <div className="space-y-6">
            <p className="text-sm text-ink/60">
              These power the chatbot's "how do I..." answers. <code className="bg-ink/5 px-1.5 py-0.5 rounded font-mono text-xs">Keywords</code> should
              be a comma-separated list of words/phrases the chatbot matches against a user's message.
              Leave role blank to show it to everyone.
            </p>
            <form onSubmit={submitFaq} className="card p-6 space-y-4">
              <Field label="Visible to">
                <select className="input-field" value={faqForm.role} onChange={(e) => setFaqForm({ ...faqForm, role: e.target.value })}>
                  <option value="">Everyone</option>
                  <option value="student">Students</option>
                  <option value="parent">Parents</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </Field>
              <Field label="Keywords (comma-separated)">
                <input required placeholder="e.g. submit assignment, how to submit, upload homework" className="input-field" value={faqForm.keywords} onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })} />
              </Field>
              <Field label="Example question (shown as a suggestion)">
                <input required placeholder="How do I submit an assignment?" className="input-field" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
              </Field>
              <Field label="Answer">
                <textarea required className="input-field" rows={3} value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
              </Field>
              <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Add FAQ"}</button>
            </form>

            <div>
              <p className="label-eyebrow mb-3">All FAQs ({faqList.length})</p>
              <div className="space-y-3">
                {faqList.map((f) => (
                  <div key={f.id} className="card p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="label-eyebrow mb-1">{f.role ? f.role : "Everyone"}</p>
                      <p className="font-semibold">{f.question}</p>
                      <p className="text-sm text-ink/60 mt-1">{f.answer}</p>
                      <p className="text-xs text-ink/40 mt-1">Keywords: {f.keywords}</p>
                    </div>
                    <button onClick={() => deleteFaq(f.id)} className="text-xs text-spark font-semibold whitespace-nowrap">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status && <div className="mt-4"><StatusPill tone={status.startsWith("Error") ? "error" : "info"}>{status}</StatusPill></div>}
      </main>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-semibold text-ink/70 block mb-1">{label}</label>
      {children}
    </div>
  );
}
