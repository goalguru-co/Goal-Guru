export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export default function PageLoading() {
  return (
    <div className="px-6 md:px-10 py-10 max-w-5xl mx-auto">
      <SkeletonBlock className="h-4 w-32 mb-3" />
      <SkeletonBlock className="h-8 w-64 mb-8" />
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
}
