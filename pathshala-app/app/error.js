"use client";

import Image from "next/image";

export default function ErrorBoundary({ error, reset }) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 text-center">
      <div className="card p-10 max-w-md">
        <Image src="/logo.png" alt="Goal Guru" width={56} height={56} className="rounded-full mx-auto mb-5" />
        <p className="label-eyebrow mb-2">Something went wrong</p>
        <h1 className="font-display text-2xl font-extrabold text-ink mb-2 tracking-tight">
          This page hit an unexpected error
        </h1>
        <p className="text-ink/60 mb-6">
          Try again — if it keeps happening, let your admin know what you were doing when it occurred.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => reset()} className="btn-primary">Try again</button>
          <a href="/" className="btn-secondary">Back to home</a>
        </div>
      </div>
    </main>
  );
}
