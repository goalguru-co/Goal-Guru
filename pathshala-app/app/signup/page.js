"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
  const [status, setStatus] = useState({ loading: false, error: "", done: false });

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
        email: form.email,
        password: form.password,
        role,
        fullName: form.fullName,
        phone: form.phone,
        classLevel: role === "student" ? parseInt(form.classLevel, 10) : null,
        subject: role === "teacher" ? form.subject : null,
        childPhone: role === "parent" ? form.childPhone : null,
      }),
    });
    const result = await res.json();

    if (result.error) {
      setStatus({ loading: false, error: result.error, done: false });
      return;
    }

    setStatus({ loading: false, error: "", done: true });
  }

  if (status.done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-ink mb-3">
            Almost there
          </h1>
          <p className="text-ink/70">
            Your account has been created. An admin needs to approve it before
            you can log in — you'll be notified once that's done.
          </p>
          <Link href="/login" className="btn-primary inline-block mt-6">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-md">
        <Image src="/logo.png" alt="Goal Guru" width={56} height={56} className="rounded-full mx-auto mb-4" />
        <h1 className="font-display text-2xl font-semibold text-ink mb-1 text-center">
          Sign up
        </h1>
        <p className="text-sm text-ink/60 mb-6">
          After signing up, an admin will need to approve your account before
          you can log in.
        </p>

        <div className="flex gap-2 mb-6">
          {["student", "parent", "teacher"].map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg border capitalize ${
                role === r ? "bg-clay text-paper border-clay" : "border-[#CBDCF0] text-ink/70"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input required className="input-field mt-1" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Phone number</label>
            <input required className="input-field mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>

          {role === "student" && (
            <div>
              <label className="text-sm font-medium">Class</label>
              <select className="input-field mt-1" value={form.classLevel} onChange={(e) => update("classLevel", e.target.value)}>
                {[6, 7, 8, 9, 10].map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
          )}

          {role === "teacher" && (
            <div>
              <label className="text-sm font-medium">Subject you teach</label>
              <input required className="input-field mt-1" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="e.g. Mathematics" />
            </div>
          )}

          {role === "parent" && (
            <div>
              <label className="text-sm font-medium">Child's registered phone number</label>
              <input required className="input-field mt-1" value={form.childPhone} onChange={(e) => update("childPhone", e.target.value)} />
              <p className="text-xs text-ink/50 mt-1">
                We'll link your account to your child's account automatically if the number matches.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Email</label>
            <input required type="email" className="input-field mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input required type="password" minLength={6} className="input-field mt-1" value={form.password} onChange={(e) => update("password", e.target.value)} />
          </div>
        </div>

        {status.error && <p className="text-clay text-sm mt-4">{status.error}</p>}

        <button disabled={status.loading} className="btn-primary w-full mt-6">
          {status.loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-center mt-4 text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="text-clay font-medium">Log in</Link>
        </p>
      </form>
    </main>
  );
}
