export default function StatusPill({ children, tone = "info" }) {
  if (!children) return null;
  const tones = {
    info: "bg-ink/[0.05] text-ink/70",
    success: "bg-leaf/10 text-leaf",
    error: "bg-spark/10 text-spark",
  };
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full animate-fade-up ${tones[tone] || tones.info}`}>
      {children}
    </p>
  );
}
