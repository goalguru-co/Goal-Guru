"use client";

import { useEffect, useRef, useState } from "react";

// Parses strings like "10,000+" or "8+" or "95%" into a target number + prefix/suffix,
// counts up from 0 when scrolled into view, and re-renders with the original formatting.
export default function AnimatedCounter({ value, duration = 1400 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(value.replace(/[0-9]/g, "0"));
  const started = useRef(false);

  useEffect(() => {
    const match = value.match(/^([^\d]*)([\d,]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const target = parseInt(numStr.replace(/,/g, ""), 10);

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            function tick(now) {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.round(target * eased);
              setDisplay(`${prefix}${current.toLocaleString()}${suffix}`);
              if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}
