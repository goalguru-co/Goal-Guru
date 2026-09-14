"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/Tabs";
import StatusPill from "@/components/StatusPill";
import { SUBJECTS } from "@/lib/subjects";
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
  const [videoList, setVideoList] = useState([]);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [liveForm, setLiveForm] = useState({ classLevel: "6", subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
  const [liveList, setLiveList] = useState([]);
  const [editingLiveId, setEditingLiveId] = useState(null);
  const [materialForm, setMaterialForm] = useState({ classLevel: "6", subject: "", title: "", fileUrl: "" });
  const [materialList, setMaterialList] = useState([]);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [ptmForm, setPtmForm] = useState({ classLevel: "", scheduledDate: "", scheduledTime: "", notes: "", meetingLink: "" });
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

  async function loadVideos() {
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    setVideoList(data || []);
  }

  async function loadLive() {
    const { data } = await supabase.from("live_classes").select("*").order("scheduled_at", { ascending: false });
    setLiveList(data || []);
  }

  async function loadMaterial() {
    const { data } = await supabase.from("study_material").select("*").order("created_at", { ascending: false });
    setMaterialList(data || []);
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
      loadVideos();
      loadLive();
      loadMaterial();
    }
    init();
  }, [router]);

  async function submitVideo(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(editingVideoId ? "Updating video..." : "Saving video...");
    const payload = {
      class_level: parseInt(videoForm.classLevel, 10),
      subject: videoForm.subject.trim(),
      title: videoForm.title.trim(),
      youtube_id: videoForm.youtubeId.trim(),
    };
    const { error } = editingVideoId
      ? await supabase.from("videos").update(payload).eq("id", editingVideoId)
      : await supabase.from("videos").insert(payload);
    setStatus(error ? "Error: " + error.message : editingVideoId ? "Video updated." : "Video added.");
    if (!error) {
      setVideoForm({ classLevel: "6", subject: "", title: "", youtubeId: "" });
      setEditingVideoId(null);
      loadVideos();
    }
    setSaving(false);
  }

  function editVideo(v) {
    setVideoForm({ classLevel: String(v.class_level), subject: v.subject, title: v.title, youtubeId: v.youtube_id });
    setEditingVideoId(v.id);
  }

  async function deleteVideo(id) {
    await supabase.from("videos").delete().eq("id", id);
    loadVideos();
  }

  async function submitLive(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(editingLiveId ? "Updating live class..." : "Saving live class...");
    const payload = {
      class_level: parseInt(liveForm.classLevel, 10),
      subject: liveForm.subject.trim(),
      title: liveForm.title.trim(),
      youtube_id: liveForm.youtubeId.trim(),
      scheduled_at: liveForm.scheduledDate
        ? new Date(`${liveForm.scheduledDate}T${liveForm.scheduledTime || "00:00"}`).toISOString()
        : null,
    };
    const { error } = editingLiveId
      ? await supabase.from("live_classes").update(payload).eq("id", editingLiveId)
      : await supabase.from("live_classes").insert(payload);
    setStatus(error ? "Error: " + error.message : editingLiveId ? "Live class updated." : "Live class added.");
    if (!error) {
      setLiveForm({ classLevel: "6", subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
      setEditingLiveId(null);
      loadLive();
    }
    setSaving(false);
  }

  function editLive(l) {
    const dt = new Date(l.scheduled_at);
    setLiveForm({
      classLevel: String(l.class_level),
      subject: l.subject,
      title: l.title,
      youtubeId: l.youtube_id,
      scheduledDate: dt.toISOString().slice(0, 10),
      scheduledTime: dt.toTimeString().slice(0, 5),
    });
    setEditingLiveId(l.id);
  }

  async function deleteLive(id) {
    await supabase.from("live_classes").delete().eq("id", id);
    loadLive();
  }

  async function submitMaterial(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(editingMaterialId ? "Updating study material..." : "Saving study material...");
    const payload = {
      class_level: parseInt(materialForm.classLevel, 10),
      subject: materialForm.subject.trim(),
      title: materialForm.title.trim(),
      file_url: materialForm.fileUrl.trim(),
    };
    const { error } = editingMaterialId
      ? await supabase.from("study_material").update(payload).eq("id", editingMaterialId)
      : await supabase.from("study_material").insert({ ...payload, created_by: session.user.id });
    setStatus(error ? "Error: " + error.message : editingMaterialId ? "Study material updated." : "Study material added.");
    if (!error) {
      setMaterialForm({ classLevel: "6", subject: "", title: "", fileUrl: "" });
      setEditingMaterialId(null);
      loadMaterial();
    }
    setSaving(false);
  }

  function editMaterial(m) {
    setMaterialForm({ classLevel: String(m.class_level), subject: m.subject, title: m.title, fileUrl: m.file_url });
    setEditingMaterialId(m.id);
  }

  async function deleteMaterial(id) {
    await supabase.from("study_material").delete().eq("id", id);
    loadMaterial();
  }

  async function deletePtm(id) {
    await supabase.from("ptm_schedule").delete().eq("id", id);
    loadPtm();
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
      meeting_link: ptmForm.meetingLink.trim() || null,
    });
    setStatus(error ? "Error: " + error.message : "PTM scheduled.");
    if (!error) {
      setPtmForm({ classLevel: "", scheduledDate: "", scheduledTime: "", notes: "", meetingLink: "" });
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
          <div className="space-y-6">
            <form onSubmit={submitVideo} className="card p-6 space-y-4">
              <Field label="Class">
                <select className="input-field" value={videoForm.classLevel} onChange={(e) => setVideoForm({ ...videoForm, classLevel: e.target.value })}>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </Field>
              <Field label="Subject">
                <select required className="input-field" value={videoForm.subject} onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })}>
                  <option value="">Select subject</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Title">
                <input required className="input-field" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
              </Field>
              <Field label="Video link (YouTube for recordings, or paste any link)">
                <input required className="input-field" value={videoForm.youtubeId} onChange={(e) => setVideoForm({ ...videoForm, youtubeId: e.target.value })} />
              </Field>
              <div className="flex gap-2">
                <button disabled={saving} className="btn-primary">{saving ? "Saving..." : editingVideoId ? "Update video" : "Add video"}</button>
                {editingVideoId && (
                  <button type="button" onClick={() => { setEditingVideoId(null); setVideoForm({ classLevel: "6", subject: "", title: "", youtubeId: "" }); }} className="btn-secondary">Cancel</button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {videoList.map((v) => (
                <div key={v.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="label-eyebrow mb-1">{v.subject} — Class {v.class_level}</p>
                    <p className="font-semibold">{v.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editVideo(v)} className="text-xs text-clay font-semibold">Edit</button>
                    <button onClick={() => deleteVideo(v.id)} className="text-xs text-spark font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "live" && (
          <div className="space-y-6">
            <form onSubmit={submitLive} className="card p-6 space-y-4">
              <Field label="Class">
                <select className="input-field" value={liveForm.classLevel} onChange={(e) => setLiveForm({ ...liveForm, classLevel: e.target.value })}>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </Field>
              <Field label="Subject">
                <select required className="input-field" value={liveForm.subject} onChange={(e) => setLiveForm({ ...liveForm, subject: e.target.value })}>
                  <option value="">Select subject</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Title">
                <input required className="input-field" value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} />
              </Field>
              <Field label="Live class link (Zoom/Google Meet join link, or YouTube Live)">
                <input required className="input-field" value={liveForm.youtubeId} onChange={(e) => setLiveForm({ ...liveForm, youtubeId: e.target.value })} />
                <p className="text-xs text-ink/50 mt-1">YouTube links play inline. Zoom/Meet/Teams links show a "Join" button that opens in a new tab.</p>
              </Field>
              <Field label="Scheduled date & time">
                <div className="flex gap-3">
                  <input required type="date" className="input-field" value={liveForm.scheduledDate} onChange={(e) => setLiveForm({ ...liveForm, scheduledDate: e.target.value })} />
                  <input required type="time" className="input-field" value={liveForm.scheduledTime} onChange={(e) => setLiveForm({ ...liveForm, scheduledTime: e.target.value })} />
                </div>
              </Field>
              <div className="flex gap-2">
                <button disabled={saving} className="btn-primary">{saving ? "Saving..." : editingLiveId ? "Update live class" : "Add live class"}</button>
                {editingLiveId && (
                  <button type="button" onClick={() => { setEditingLiveId(null); setLiveForm({ classLevel: "6", subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" }); }} className="btn-secondary">Cancel</button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {liveList.map((l) => (
                <div key={l.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="label-eyebrow mb-1">{l.subject} — Class {l.class_level}</p>
                    <p className="font-semibold">{l.title}</p>
                    <p className="text-xs text-ink/50 mt-1">{new Date(l.scheduled_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editLive(l)} className="text-xs text-clay font-semibold">Edit</button>
                    <button onClick={() => deleteLive(l.id)} className="text-xs text-spark font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "material" && (
          <div className="space-y-6">
            <form onSubmit={submitMaterial} className="card p-6 space-y-4">
              <Field label="Class">
                <select className="input-field" value={materialForm.classLevel} onChange={(e) => setMaterialForm({ ...materialForm, classLevel: e.target.value })}>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </Field>
              <Field label="Subject">
                <select required className="input-field" value={materialForm.subject} onChange={(e) => setMaterialForm({ ...materialForm, subject: e.target.value })}>
                  <option value="">Select subject</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Title">
                <input required className="input-field" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} />
              </Field>
              <Field label="File link (Google Drive share link, etc.)">
                <input required className="input-field" value={materialForm.fileUrl} onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })} />
              </Field>
              <div className="flex gap-2">
                <button disabled={saving} className="btn-primary">{saving ? "Saving..." : editingMaterialId ? "Update material" : "Add study material"}</button>
                {editingMaterialId && (
                  <button type="button" onClick={() => { setEditingMaterialId(null); setMaterialForm({ classLevel: "6", subject: "", title: "", fileUrl: "" }); }} className="btn-secondary">Cancel</button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {materialList.map((m) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="label-eyebrow mb-1">{m.subject} — Class {m.class_level}</p>
                    <p className="font-semibold">{m.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editMaterial(m)} className="text-xs text-clay font-semibold">Edit</button>
                    <button onClick={() => deleteMaterial(m.id)} className="text-xs text-spark font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <Field label="Meeting link (optional — Zoom/Google Meet join link)">
                <input className="input-field" value={ptmForm.meetingLink} onChange={(e) => setPtmForm({ ...ptmForm, meetingLink: e.target.value })} />
              </Field>
              <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Schedule PTM"}</button>
            </form>

            <div>
              <p className="label-eyebrow mb-3">Scheduled meetings</p>
              <div className="space-y-3">
                {ptmList.length === 0 && <p className="text-sm text-ink/50">No meetings scheduled yet.</p>}
                {ptmList.map((p) => (
                  <div key={p.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="label-eyebrow mb-1">{p.class_level ? `Class ${p.class_level}` : "All classes"}</p>
                      <p className="font-semibold">{new Date(p.scheduled_at).toLocaleString()}</p>
                      {p.notes && <p className="text-sm text-ink/60 mt-1">{p.notes}</p>}
                      {p.meeting_link && <a href={p.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-clay font-semibold mt-1 inline-block">Meeting link ↗</a>}
                    </div>
                    <button onClick={() => deletePtm(p.id)} className="text-xs text-spark font-semibold shrink-0">Delete</button>
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
