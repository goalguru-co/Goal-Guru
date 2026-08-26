export default function EmptyState({ icon = "✨", title, subtitle }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-clay/10 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {subtitle && <p className="text-sm text-ink/50 mt-1 max-w-sm mx-auto">{subtitle}</p>}
    </div>
  );
}
