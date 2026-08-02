import Link from "next/link";
import Image from "next/image";

function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 360" className="w-full max-w-md mx-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2F6FED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* decorative background blobs */}
      <circle cx="60" cy="60" r="50" fill="#2F6FED" opacity="0.10" />
      <circle cx="370" cy="300" r="70" fill="#06B6D4" opacity="0.12" />
      <circle cx="380" cy="50" r="22" fill="#FFB020" opacity="0.5" />
      <circle cx="30" cy="300" r="14" fill="#FF4D8D" opacity="0.5" />

      {/* laptop */}
      <rect x="70" y="70" width="240" height="160" rx="14" fill="url(#screenGrad)" />
      <rect x="90" y="90" width="200" height="120" rx="6" fill="#ffffff" opacity="0.12" />
      <circle cx="190" cy="150" r="30" fill="#ffffff" opacity="0.95" />
      <path d="M182 136 L182 164 L206 150 Z" fill="#2F6FED" />
      <rect x="40" y="230" width="300" height="16" rx="8" fill="#0A2647" />
      <rect x="120" y="230" width="140" height="4" rx="2" fill="#2F6FED" />

      {/* floating badge: test score */}
      <g transform="translate(255,20)">
        <rect width="130" height="54" rx="14" fill="#ffffff" stroke="#DCE7F7" />
        <circle cx="27" cy="27" r="15" fill="#06B6D420" />
        <text x="27" y="32" fontSize="16" textAnchor="middle">🎯</text>
        <text x="52" y="23" fontSize="11" fontWeight="700" fill="#0A2647">Unit test</text>
        <text x="52" y="38" fontSize="12" fontWeight="700" fill="#06B6D4">9 / 10 correct</text>
      </g>

      {/* floating badge: live class */}
      <g transform="translate(10,255)">
        <rect width="150" height="54" rx="14" fill="#ffffff" stroke="#DCE7F7" />
        <circle cx="27" cy="27" r="15" fill="#FF4D8D20" />
        <text x="27" y="32" fontSize="16" textAnchor="middle">🔴</text>
        <text x="52" y="23" fontSize="11" fontWeight="700" fill="#0A2647">Live class</text>
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

      <section className="px-6 md:px-10 py-12 md:py-20 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
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
        </div>
        <HeroIllustration />
      </section>

      <section className="px-6 md:px-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <p className="font-display text-2xl md:text-3xl font-semibold bg-gradient-to-r from-clay to-leaf bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-xs text-ink/60 mt-1 uppercase tracking-wide font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-10 py-20 max-w-4xl mx-auto">
        <p className="label-eyebrow mb-2 text-center">Why families stick with us</p>
        <h2 className="font-display text-3xl font-semibold text-ink text-center mb-14">
          Built for how students actually study
        </h2>
        <div className="space-y-10">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`flex items-center gap-6 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: `${f.color}1A` }}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink mb-1">{f.title}</h3>
                <p className="text-ink/70">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-10 pb-20 max-w-6xl mx-auto">
        <div className="rounded-2xl p-10 md:p-14 text-center bg-gradient-to-r from-clay to-leaf">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-3">
            Ready to get your school on Goal Guru?
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-6">
            One subscription, every class 6 to 10, every subject — set up in minutes.
          </p>
          <Link href="/signup" className="inline-block bg-white text-clay font-bold rounded-lg px-6 py-3 hover:-translate-y-0.5 transition-transform">
            Get started free
          </Link>
        </div>
      </section>
    </main>
  );
}
