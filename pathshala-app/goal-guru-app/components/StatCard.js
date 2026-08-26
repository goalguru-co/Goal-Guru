export default function StatCard({ label, value, icon, accent = "clay" }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="label-eyebrow">{label}</p>
        {icon && (
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
            style={{ background: `color-mix(in srgb, var(--${accent}) 12%, transparent)` }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="font-display text-2xl md:text-3xl font-extrabold text-ink">{value ?? "—"}</p>
    </div>
  );
}
