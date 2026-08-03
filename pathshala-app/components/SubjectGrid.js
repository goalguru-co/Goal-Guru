const SUBJECT_COLORS = ["#2F6FED", "#06B6D4", "#FF4D8D", "#FFB020"];

export default function SubjectGrid({ items, subjectKey = "subject", onSelect, icon = "📁" }) {
  const counts = {};
  items.forEach((item) => {
    const subj = item[subjectKey] || "General";
    counts[subj] = (counts[subj] || 0) + 1;
  });
  const subjects = Object.entries(counts);

  if (subjects.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {subjects.map(([subject, count], i) => (
        <button
          key={subject}
          onClick={() => onSelect(subject)}
          className="card p-5 text-left hover:-translate-y-0.5"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
            style={{ background: `${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}1A` }}
          >
            {icon}
          </div>
          <p className="font-display font-bold text-ink">{subject}</p>
          <p className="text-xs text-ink/50 mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
        </button>
      ))}
    </div>
  );
}
