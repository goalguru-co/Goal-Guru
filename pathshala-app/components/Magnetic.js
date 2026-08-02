"use client";

import { useRef } from "react";

// Wraps a single child (e.g. a button/link) with a subtle magnetic hover pull.
// Respects prefers-reduced-motion by simply not attaching the effect.
export default function Magnetic({ children, strength = 0.25 }) {
  const ref = useRef(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function handleMove(e) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  }

  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "translate(0px, 0px)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ display: "inline-block", transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </div>
  );
}
