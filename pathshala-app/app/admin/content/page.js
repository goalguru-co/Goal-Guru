"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const CLASS_OPTIONS = [6, 7, 8, 9, 10];
const ROLE_HOME = { admin: "/admin", teacher: "/teacher", parent: "/parent", student: "/dashboard" };

export default function ManageContent() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("video");
  const [status, setStatus] = useState("");

  const [videoForm, setVideoForm] = useState({ classLevel: "6", subject: "", title: "", youtubeId: "" });
  const [liveForm, setLiveForm] = useState({ classLevel: "6", subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
  const [materialForm, setMaterialForm] = useState({ classLevel: "6", subject: "", title: "", fileUrl: "" });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role !== "admin") { router.push(ROLE_HOME[profile?.role] || "/login"); return; }
      setSession(session);
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
    setStatus("Saving video...");
    const { error } = await supabase.from("videos").insert({
      class_level: parseInt(videoForm.classLevel, 10),
      subject: videoForm.subject,
      title: videoForm.title,
      youtube_id: extractYoutubeId(videoForm.youtubeId),
    });
    setStatus(error ? "Error: " + error.message : "Video added.");
    if (!error) setVideoForm({ ...videoForm, subject: "", title: "", youtubeId: "" });
  }

  async function submitLive(e) {
    e.preventDefault();
    setStatus("Saving live class...");
    const { error } = await supabase.from("live_classes").insert({
      class_level: parseInt(liveForm.classLevel, 10),
      subject: liveForm.subject,
      title: liveForm.title,
      youtube_id: extractYoutubeId(liveForm.youtubeId),
      scheduled_at: liveForm.scheduledDate
        ? new Date(`${liveForm.scheduledDate}T${liveForm.scheduledTime || "00:00"}`).toISOString()
        : null,
    });
    setStatus(error ? "Error: " + error.message : "Live class added.");
    if (!error) setLiveForm({ ...liveForm, subject: "", title: "", youtubeId: "", scheduledDate: "", scheduledTime: "" });
  }

  async function submitMaterial(e) {
    e.preventDefault();
    setStatus("Saving study material...");
    const { error } = await supabase.from("study_material").insert({
      class_level: parseInt(materialForm.classLevel, 10),
      subject: materialForm.subject,
      title: materialForm.title,
      file_url: materialForm.fileUrl,
    });
    setStatus(error ? "Error: " + error.message : "Study material added.");
    if (!error) setMaterialForm({ ...materialForm, subject: "", title: "", fileUrl: "" });
  }

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-ink">Manage content</h1>

        <div className="flex gap-2 mt-8 border-b border-[#DCE7F2]">
          {["video", "live", "material"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-clay text-clay" : "border-transparent text-ink/60"
              }`}
            >
              {t === "video" ? "Video lecture" : t === "live" ? "Live class" : "Study material"}
            </button>
          ))}
        </div>

        {tab === "video" && (
          <form onSubmit={submitVideo} className="card p-6 mt-6 space-y-4">
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
            <button className="btn-primary">Add video</button>
          </form>
        )}

        {tab === "live" && (
          <form onSubmit={submitLive} className="card p-6 mt-6 space-y-4">
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
            <button className="btn-primary">Add live class</button>
          </form>
        )}

        {tab === "material" && (
          <form onSubmit={submitMaterial} className="card p-6 mt-6 space-y-4">
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
            <button className="btn-primary">Add study material</button>
          </form>
        )}

        {status && <p className="text-sm text-ink/60 mt-4">{status}</p>}
      </main>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}
