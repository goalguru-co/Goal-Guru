export function performanceTier(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 80) return { label: "Excellent", classes: "bg-leaf/10 text-leaf" };
  if (pct >= 50) return { label: "Good", classes: "bg-saffron/10 text-saffron" };
  return { label: "Needs attention", classes: "bg-spark/10 text-spark" };
}

export default function PerformanceBadge({ pct, className = "" }) {
  const tier = performanceTier(pct);
  if (!tier) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${tier.classes} ${className}`}>
      {tier.label}
    </span>
  );
}
