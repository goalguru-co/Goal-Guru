"use client";

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-line overflow-x-auto mb-6 w-fit max-w-full">
      {tabs.map((t) => {
        const key = typeof t === "string" ? t : t.key;
        const label = typeof t === "string" ? t : t.label;
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap capitalize transition-all duration-300 ${
              isActive ? "bg-white text-clay shadow-sm" : "text-ink/60 hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
