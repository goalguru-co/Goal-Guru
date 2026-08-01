"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import VideoEmbed from "@/components/VideoEmbed";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [videos, setVideos] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [material, setMaterial] = useState([]);
  const [tab, setTab] = useState("videos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("student_id", session.user.id)
        .eq("status", "active")
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(sub);

      const classLevel = profileData?.class_level;

      const { data: videoData } = await supabase
        .from("videos")
        .select("*")
        .eq("class_level", classLevel)
        .order("subject", { ascending: true })
        .order("sort_order", { ascending: true });
      setVideos(videoData || []);

      const { data: liveData } = await supabase
        .from("live_classes")
        .select("*")
        .eq("class_level", classLevel)
        .order("scheduled_at", { ascending: true });
      setLiveClasses(liveData || []);

      const { data: materialData } = await supabase
        .from("study_material")
        .select("*")
        .eq("class_level", classLevel);
      setMaterial(materialData || []);

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <p className="p-10 text-center text-ink/60">Loading...</p>;
  }

  const hasAccess = !!subscription;

  return (
    <>
      <Navbar session={session} role="student" />
      <main className="px-6 md:px-10 py-10 max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Class {profile?.class_level} dashboard
        </h1>

        {!hasAccess && (
          <div className="card p-6 mt-6 border-clay/40">
            <p className="font-medium text-ink">
              Aapka koi active subscription nahi hai.
            </p>
            <p className="text-sm text-ink/60 mt-1 mb-4">
              Videos, live classes aur study material access karne ke liye
              subscribe karein.
            </p>
            <a href="/dashboard/subscribe" className="btn-primary inline-block">
              Subscribe now
            </a>
          </div>
        )}

        <div className="flex gap-2 mt-8 border-b border-[#EAE3D3]">
          {["videos", "live", "material"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-clay text-clay" : "border-transparent text-ink/60"
              }`}
            >
              {t === "videos" ? "Video lectures" : t === "live" ? "Live classes" : "Study material"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "videos" && (
            <div className="grid md:grid-cols-2 gap-6">
              {videos.length === 0 && <p className="text-ink/60">Abhi koi video upload nahi hui hai.</p>}
              {videos.map((v) => (
                <div key={v.id} className="card p-4">
                  <p className="label-eyebrow mb-2">{v.subject}</p>
                  <h3 className="font-medium mb-3">{v.title}</h3>
                  {hasAccess ? (
                    <VideoEmbed youtubeId={v.youtube_id} title={v.title} />
                  ) : (
                    <div className="aspect-video bg-ink/5 rounded-xl flex items-center justify-center text-sm text-ink/50">
                      Subscribe to unlock
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "live" && (
            <div className="space-y-4">
              {liveClasses.length === 0 && <p className="text-ink/60">Koi live class schedule nahi hai.</p>}
              {liveClasses.map((l) => (
                <div key={l.id} className="card p-4">
                  <p className="label-eyebrow mb-1">{l.subject}</p>
                  <h3 className="font-medium mb-1">{l.title}</h3>
                  <p className="text-sm text-ink/60 mb-3">
                    {new Date(l.scheduled_at).toLocaleString("en-IN")}
                  </p>
                  {hasAccess ? (
                    <VideoEmbed youtubeId={l.youtube_id} title={l.title} />
                  ) : (
                    <div className="aspect-video bg-ink/5 rounded-xl flex items-center justify-center text-sm text-ink/50">
                      Subscribe to unlock
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "material" && (
            <div className="space-y-3">
              {material.length === 0 && <p className="text-ink/60">Koi study material upload nahi hui hai.</p>}
              {material.map((m) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="label-eyebrow mb-1">{m.subject}</p>
                    <h3 className="font-medium">{m.title}</h3>
                  </div>
                  {hasAccess ? (
                    <a href={m.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-sm py-1.5">
                      Download
                    </a>
                  ) : (
                    <span className="text-sm text-ink/50">Locked</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
