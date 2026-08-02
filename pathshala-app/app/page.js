import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <nav className="flex items-center justify-between px-6 md:px-10 py-4">
        <span className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <Image src="/logo.png" alt="Goal Guru" width={48} height={48} className="rounded-full" priority />
          Goal Guru
        </span>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="hover:underline">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm py-1.5">Get started</Link>
        </div>
      </nav>

      <section className="px-6 md:px-10 py-16 md:py-24 max-w-4xl">
        <p className="label-eyebrow mb-4">Classes 6 to 10 &middot; One subscription</p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight">
          <span className="bg-gradient-to-r from-clay via-[#1E90E8] to-leaf bg-clip-text text-transparent">
            Everything in one place
          </span>
          <span className="text-ink"> — lectures, live classes, tests, and progress tracking.</span>
        </h1>
        <p className="mt-6 text-lg text-ink/70 max-w-xl">
          One app for students, parents, teachers and school admins — lectures,
          live classes, practice tests, attendance, and results, all in sync.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/signup" className="btn-primary">Sign up</Link>
          <Link href="/login" className="btn-secondary">I already have an account</Link>
        </div>
      </section>

      <section className="px-6 md:px-10 pb-20 grid md:grid-cols-4 gap-6 max-w-6xl">
        {[
          { title: "For students", desc: "Video lectures, live classes, practice tests, and progress tracking.", accent: "from-clay to-[#1E90E8]" },
          { title: "For parents", desc: "Attendance, test scores, homework status, and fee details for your child.", accent: "from-leaf to-[#3DD9C5]" },
          { title: "For teachers", desc: "Attendance, assignments, test creation, and doubt resolution.", accent: "from-saffron to-[#FF8A3D]" },
          { title: "For admins", desc: "Students, revenue, content, and school-wide reports in one dashboard.", accent: "from-spark to-[#FF7AA8]" },
        ].map((f) => (
          <div key={f.title} className="card p-6 overflow-hidden relative">
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${f.accent}`} />
            <h3 className="font-display text-lg font-semibold text-ink mb-2 mt-1">{f.title}</h3>
            <p className="text-sm text-ink/70">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
