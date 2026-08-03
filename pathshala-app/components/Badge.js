const TIERS = {
  Bronze: { gradient: "linear-gradient(135deg, #CD7F32, #8C5A2B)", icon: "🥉", next: 100 },
  Silver: { gradient: "linear-gradient(135deg, #C0C0C0, #8A8A8A)", icon: "🥈", next: 300 },
  Gold: { gradient: "linear-gradient(135deg, #FFD700, #B8860B)", icon: "🥇", next: null },
};

export function badgeForPoints(points) {
  if (points >= 300) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

export default function Badge({ points, size = "md" }) {
  const tierName = badgeForPoints(points);
  const tier = TIERS[tierName];
  const dims = size === "lg" ? "w-20 h-20 text-4xl" : "w-12 h-12 text-xl";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dims} rounded-full flex items-center justify-center shrink-0 shadow-glow`}
        style={{ background: tier.gradient }}
      >
        {tier.icon}
      </div>
      <div>
        <p className="font-display font-extrabold text-ink leading-tight">{tierName} tier</p>
        {tier.next ? (
          <p className="text-xs text-ink/50">{tier.next - points > 0 ? `${tier.next - points} pts to next tier` : "Ready to level up!"}</p>
        ) : (
          <p className="text-xs text-saffron font-semibold">Top tier reached 🎉</p>
        )}
      </div>
    </div>
  );
}
