import Link from "next/link";

export default function Home() {
  return (
    <main>
      <nav className="flex items-center justify-between px-6 md:px-10 py-4">
        <span className="font-display text-xl font-semibold text-ink">Goal Guru</span>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="hover:underline">Log in</Link>
          <Link href="/signup" className="btn-primary text-sm py-1.5">Get started</Link>
        </div>
      </nav>

      <section className="px-6 md:px-10 py-16 md:py-24 max-w-4xl">
        <p className="label-eyebrow mb-4">Classes 6 to 10 &middot; One subscription</p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold text-ink leading-tight">
          Sab kuch ek jagah — lectures, live classes, study material.
        </h1>
        <p className="mt-6 text-lg text-ink/70 max-w-xl">
          Apni class chuniye, subscribe kijiye, aur video lectures, live classes
          aur notes ka access turant paiye — apne phone par, apni bhasha me.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/signup" className="btn-primary">Student sign up</Link>
          <Link href="/login" className="btn-secondary">I already have an account</Link>
        </div>
      </section>

      <section className="px-6 md:px-10 pb-20 grid md:grid-cols-3 gap-6 max-w-5xl">
        {[
          { title: "Video lectures", desc: "Class aur subject ke hisaab se organized recorded lectures." },
          { title: "Live classes", desc: "Teacher ke saath live doubt-solving aur teaching sessions." },
          { title: "Study material", desc: "Notes aur practice sheets, kabhi bhi download karke padhein." },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <h3 className="font-display text-lg font-semibold text-ink mb-2">{f.title}</h3>
            <p className="text-sm text-ink/70">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
