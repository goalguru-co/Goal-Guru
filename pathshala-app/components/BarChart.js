export default function BarChart({ data, height = 160, unit = "%" }) {
  if (!data.length) return null;
  const max = Math.max(100, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 24);
          const x = i * barWidth + barWidth * 0.2;
          const w = barWidth * 0.6;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={height - 24 - barHeight}
                width={w}
                height={barHeight}
                rx="2"
                fill="url(#barGrad)"
              />
              <text x={x + w / 2} y={height - 24 - barHeight - 4} textAnchor="middle" fontSize="6" fill="#0A0E1A" fontWeight="700">
                {d.value}{unit}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F6FED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex mt-1">
        {data.map((d) => (
          <div key={d.label} style={{ width: `${barWidth}%` }} className="text-center text-xs text-ink/60 truncate px-0.5">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
