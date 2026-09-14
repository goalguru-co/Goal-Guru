"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// Only matches an actual YouTube URL or a bare 11-character YouTube video ID.
// Anything else (Zoom join links, Google Meet, Microsoft Teams, a raw meeting
// URL) is treated as an external link, not something we can embed in an iframe.
function extractYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

function isValidUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function VideoEmbed({ youtubeId, title, studentId, videoId }) {
  const logged = useRef(false);
  const ytId = extractYoutubeId(youtubeId);

  useEffect(() => {
    if (ytId && !logged.current && studentId && videoId) {
      logged.current = true;
      supabase.from("video_views").insert({ student_id: studentId, video_id: videoId }).then(() => {});
    }
  }, [ytId, studentId, videoId]);

  if (ytId) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-glass">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Not a YouTube video — most likely a Zoom/Google Meet/Teams join link, which
  // can't be embedded in an iframe. Show a button to open it in a new tab instead.
  return (
    <div className="aspect-video w-full rounded-2xl bg-ink/5 shadow-glass flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-ink/60">This is an external meeting/video link — it opens in a new tab instead of playing here.</p>
      {youtubeId && isValidUrl(youtubeId) ? (
        <a href={youtubeId} target="_blank" rel="noreferrer" className="btn-primary">
          Join {title ? `"${title}"` : "meeting"}
        </a>
      ) : (
        <p className="text-sm text-spark font-medium">No valid link has been added yet.</p>
      )}
    </div>
  );
}
