export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        {eyebrow && <p className="label-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink/60 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
