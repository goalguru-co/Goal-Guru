"use client";

import Image from "next/image";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen aurora-bg aurora-dark flex items-center justify-center px-6 text-center font-body">
          <div className="glass-dark noise rounded-[24px] p-10 max-w-md shadow-glow-lg">
            <Image src="/logo.png" alt="Goal Guru" width={56} height={56} className="rounded-full mx-auto mb-5" />
            <p className="label-eyebrow mb-2" style={{ color: "#5FD4EE" }}>Something went wrong</p>
            <h1 className="font-display text-2xl font-extrabold text-white mb-2 tracking-tight">
              An unexpected error occurred
            </h1>
            <p className="text-white/60 mb-6">
              This has been logged. Try again, or head back home if it keeps happening.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => reset()} className="btn-primary">Try again</button>
              <a href="/" className="btn-secondary">Back to home</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
