export default function TrendLine({ points, height = 140 }) {
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  const max = Math.max(100, ...values);
  const min = 0;
  const w = 100;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : w / 2;
    const y = height - 20 - ((p.value - min) / (max - min)) * (height - 40);
    return { x, y, value: p.value, label: p.label };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - 20} L ${coords[0].x} ${height - 20} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F6FED" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2F6FED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" stroke="#2F6FED" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="1.8" fill="#2F6FED" />
      ))}
    </svg>
  );
}
