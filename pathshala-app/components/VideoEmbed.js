"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VideoEmbed({ youtubeId, title, studentId, videoId }) {
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current && studentId && videoId) {
      logged.current = true;
      supabase.from("video_views").insert({ student_id: studentId, video_id: videoId }).then(() => {});
    }
  }, [studentId, videoId]);

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
