"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SUBJECTS } from "@/lib/subjects";

export default function SignupPage() {
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    classLevel: "6",
    subject: "",
    childPhone: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", done: false, childLinked: false });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ loading: true, error: "", done: false });

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        classLevel: role === "student" ? parseInt(form.classLevel, 10) : null,
        subject: role === "teacher" ? form.subject.trim() : null,
        childPhone: role === "parent" ? form.childPhone.trim() : null,
      }),
    });
    const result = await res.json();

    if (result.error) {
      setStatus({ loading: false, error: result.error, done: false, childLinked: false });
      return;
    }

    setStatus({ loading: false, error: "", done: true, childLinked: !!result.childLinked });
  }

  if (status.done) {
    return (
      <main className="min-h-screen aurora-bg aurora-dark flex items-center justify-center px-6">
        <div className="glass-dark noise rounded-[24px] p-8 max-w-md text-center shadow-glow-lg">
          <h1 className="font-display text-2xl font-extrabold text-white mb-3 tracking-tight">
            Almost there
          </h1>
          <p className="text-white/70">
            Your account has been created. An admin needs to approve it before
            you can log in — you'll be notified once that's done.
          </p>
          {role === "parent" && (
            <p className={`text-sm mt-4 px-3 py-2 rounded-lg ${status.childLinked ? "bg-leaf/15 text-leaf" : "bg-saffron/15 text-saffron"}`}>
              {status.childLinked
                ? "We found and linked your child's account already."
                : "We couldn't find a matching student account yet — no problem, ask your school admin to link it once your child is enrolled."}
            </p>
          )}
          <Link href="/login" className="btn-primary inline-block mt-6">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen aurora-bg aurora-dark flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="glass-dark noise rounded-[24px] p-8 w-full max-w-md shadow-glow-lg">
        <Image src="/logo.png" alt="Goal Guru" width={80} height={80} className="rounded-full mx-auto mb-4" priority />
        <h1 className="font-display text-2xl font-extrabold text-white mb-1 text-center tracking-tight">
          Sign up
        </h1>
        <p className="text-sm text-white/60 mb-6 text-center">
          After signing up, an admin will need to approve your account before
          you can log in.
        </p>

        <div className="flex gap-2 mb-6">
          {["student", "parent", "teacher"].map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg border capitalize transition-colors ${
                role === r ? "bg-clay text-white border-clay" : "border-white/20 text-white/70 hover:bg-white/5"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-white/80">Full name</label>
            <input required className="input-field mt-1" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-white/80">Phone number</label>
            <input required className="input-field mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>

          {role === "student" && (
            <div>
              <label className="text-sm font-semibold text-white/80">Class</label>
              <select className="input-field mt-1" value={form.classLevel} onChange={(e) => update("classLevel", e.target.value)}>
                {[6, 7, 8, 9, 10].map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
          )}

          {role === "teacher" && (
            <div>
              <label className="text-sm font-semibold text-white/80">Subject you teach</label>
              <select required className="input-field mt-1" value={form.subject} onChange={(e) => update("subject", e.target.value)}>
                <option value="">Select a subject</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {role === "parent" && (
            <div>
              <label className="text-sm font-semibold text-white/80">Child's registered phone number (optional)</label>
              <input className="input-field mt-1" value={form.childPhone} onChange={(e) => update("childPhone", e.target.value)} />
              <p className="text-xs text-white/50 mt-1">
                We'll link your account to your child's automatically if it matches. Don't have it handy? Leave this
                blank — your school admin can link it for you afterward.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-white/80">Email</label>
            <input required type="email" className="input-field mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-white/80">Password</label>
            <input required type="password" minLength={6} className="input-field mt-1" value={form.password} onChange={(e) => update("password", e.target.value)} />
          </div>
        </div>

        {status.error && <p className="text-[#FF9FC4] text-sm mt-4">{status.error}</p>}

        <button disabled={status.loading} className="btn-primary w-full mt-6">
          {status.loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-center mt-4 text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="text-[#5FD4EE] font-semibold">Log in</Link>
        </p>
      </form>
    </main>
  );
}
