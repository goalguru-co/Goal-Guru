import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import Magnetic from "@/components/Magnetic";

function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 360" className="w-full max-w-md mx-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2F6FED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      <circle cx="380" cy="50" r="22" fill="#FFB020" opacity="0.6" />
      <circle cx="30" cy="300" r="14" fill="#FF4D8D" opacity="0.6" />

      <rect x="70" y="70" width="240" height="160" rx="14" fill="url(#screenGrad)" />
      <rect x="90" y="90" width="200" height="120" rx="6" fill="#ffffff" opacity="0.12" />
      <circle cx="190" cy="150" r="30" fill="#ffffff" opacity="0.95" />
      <path d="M182 136 L182 164 L206 150 Z" fill="#2F6FED" />
      <rect x="40" y="230" width="300" height="16" rx="8" fill="#ffffff" opacity="0.12" />
      <rect x="120" y="230" width="140" height="4" rx="2" fill="#2F6FED" />

      <g transform="translate(255,20)">
        <rect width="130" height="54" rx="14" fill="#ffffff" />
        <circle cx="27" cy="27" r="15" fill="#06B6D420" />
        <text x="27" y="32" fontSize="16" textAnchor="middle">🎯</text>
        <text x="52" y="23" fontSize="11" fontWeight="700" fill="#0A0E1A">Unit test</text>
        <text x="52" y="38" fontSize="12" fontWeight="700" fill="#06B6D4">9 / 10 correct</text>
      </g>

      <g transform="translate(10,255)">
        <rect width="150" height="54" rx="14" fill="#ffffff" />
        <circle cx="27" cy="27" r="15" fill="#FF4D8D20" />
        <text x="27" y="32" fontSize="16" textAnchor="middle">🔴</text>
        <text x="52" y="23" fontSize="11" fontWeight="700" fill="#0A0E1A">Live class</text>
        <text x="52" y="38" fontSize="12" fontWeight="700" fill="#FF4D8D">Starts in 5 min</text>
      </g>
    </svg>
  );
}

const STATS = [
  { value: "10,000+", label: "Students" },
  { value: "8+", label: "Partner schools" },
  { value: "5", label: "Classes, 6 to 10" },
  { value: "1", label: "App for everyone" },
];

const FEATURES = [
  { icon: "🎬", color: "#2F6FED", title: "Bite-sized video lectures", desc: "Class and subject-wise, watch anytime, rewatch as many times as you need before a test." },
  { icon: "🔴", color: "#FF4D8D", title: "Live doubt-clearing classes", desc: "Join real teachers live, ask questions, and never fall behind on a topic." },
  { icon: "🧠", color: "#06B6D4", title: "Practice tests that stick", desc: "Auto-graded unit tests and always-available practice sets to build real exam confidence." },
  { icon: "📈", color: "#FFB020", title: "Progress parents can actually see", desc: "Attendance, scores, and homework status — all in one place, no WhatsApp forwards needed." },
];

export default function Home() {
  return (
    <main className="bg-paper">
      {/* ---------- Hero (dark aurora) ---------- */}
      <section className="aurora-bg aurora-dark relative text-white">
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto">
          <span className="flex items-center gap-2 font-display text-xl font-extrabold text-white tracking-tight">
            <Image src="/logo.png" alt="Goal Guru" width={40} height={40} className="rounded-full" priority />
            Goal Guru
          </span>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/login" className="text-white/80 hover:text-white transition-colors">Log in</Link>
            <Magnetic strength={0.2}>
              <Link href="/signup" className="btn-primary text-sm py-1.5">Get started</Link>
            </Magnetic>
          </div>
        </nav>

        <div className="relative z-10 px-6 md:px-10 py-16 md:py-20 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <p className="label-eyebrow mb-4" style={{ color: "#5FD4EE" }}>
              Classes 6 to 10 &middot; One subscription
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              <span className="bg-gradient-to-r from-[#7FA8FF] via-[#5FD4EE] to-[#FF9FC4] bg-clip-text text-transparent">
                Everything in one place
              </span>
              <span className="text-white"> — lectures, live classes, tests, and progress.</span>
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
              One app for students, parents, teachers and school admins — lectures,
              live classes, practice tests, attendance, and results, all in sync.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Magnetic>
                <Link href="/signup" className="btn-primary">Sign up</Link>
              </Magnetic>
              <Magnetic strength={0.15}>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[10px] px-6 py-[0.7rem] font-bold text-sm border border-white/25 text-white hover:bg-white/10 transition-colors"
                >
                  I already have an account
                </Link>
              </Magnetic>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-clay/30 to-leaf/30 blur-2xl" />
              <div className="relative glass-dark rounded-[24px] p-6 float-el shadow-glow-lg noise">
                <HeroIllustration />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- Stats bento ---------- */}
      <section className="px-6 md:px-10 -mt-10 md:-mt-14 relative z-10 max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 glass rounded-[24px] p-4 md:p-6 shadow-glass">
            {STATS.map((s) => (
              <div key={s.label} className="text-center py-4">
                <p className="font-display text-3xl md:text-4xl font-extrabold text-gradient">
                  <AnimatedCounter value={s.value} />
                </p>
                <p className="text-xs text-ink/60 mt-1 uppercase tracking-wide font-bold">{s.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ---------- Feature zigzag ---------- */}
      <section className="px-6 md:px-10 py-24 max-w-4xl mx-auto">
        <ScrollReveal>
          <p className="label-eyebrow mb-2 text-center">Why families stick with us</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-ink text-center mb-16 tracking-tight">
            Built for how students actually study
          </h2>
        </ScrollReveal>
        <div className="space-y-10">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 80}>
              <div className={`card p-6 flex items-center gap-6 ${i % 2 === 1 ? "md:flex-row-reverse md:text-right" : ""}`}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: `${f.color}1A` }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink mb-1">{f.title}</h3>
                  <p className="text-ink/70">{f.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="aurora-bg aurora-dark rounded-[28px] p-10 md:p-16 text-center relative overflow-hidden noise">
            <div className="relative z-10">
              <h2 className="font-display text-2xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                Ready to get your school on Goal Guru?
              </h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                One subscription, every class 6 to 10, every subject — set up in minutes.
              </p>
              <Magnetic>
                <Link href="/signup" className="btn-primary">Get started free</Link>
              </Magnetic>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-line px-6 md:px-10 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-extrabold text-ink">
            <Image src="/logo.png" alt="Goal Guru" width={28} height={28} className="rounded-full" />
            Goal Guru
          </div>
          <p className="text-sm text-ink/50">&copy; {new Date().getFullYear()} Goal Guru Education. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
