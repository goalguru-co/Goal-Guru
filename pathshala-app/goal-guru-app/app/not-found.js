import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen aurora-bg aurora-dark flex items-center justify-center px-6 text-center">
      <div className="glass-dark noise rounded-[24px] p-10 max-w-md shadow-glow-lg">
        <Image src="/logo.png" alt="Goal Guru" width={56} height={56} className="rounded-full mx-auto mb-5" />
        <p className="label-eyebrow mb-2" style={{ color: "#5FD4EE" }}>404</p>
        <h1 className="font-display text-2xl font-extrabold text-white mb-2 tracking-tight">Page not found</h1>
        <p className="text-white/60 mb-6">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link href="/" className="btn-primary inline-block">Back to home</Link>
      </div>
    </main>
  );
}
