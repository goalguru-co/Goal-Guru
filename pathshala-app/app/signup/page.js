"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    classLevel: "6",
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

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setStatus({ loading: false, error: error.message, done: false });
      return;
    }

    // Create the matching profile row (pending admin approval)
    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: form.fullName,
        phone: form.phone,
        class_level: parseInt(form.classLevel, 10),
        role: "student",
        approved: false,
      });
      if (profileError) {
        setStatus({ loading: false, error: profileError.message, done: false });
        return;
      }
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
            Aapka account ban gaya hai. Admin approval ke baad aap login karke
            classes access kar sakenge. Email verify karna na bhoolein.
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
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">
          Student sign up
        </h1>
        <p className="text-sm text-ink/60 mb-6">
          Sign up karne ke baad admin approval milega, phir aap classes access
          kar sakenge.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              required
              className="input-field mt-1"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone number</label>
            <input
              required
              className="input-field mt-1"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Class</label>
            <select
              className="input-field mt-1"
              value={form.classLevel}
              onChange={(e) => update("classLevel", e.target.value)}
            >
              {[6, 7, 8, 9, 10].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              required
              type="email"
              className="input-field mt-1"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              required
              type="password"
              minLength={6}
              className="input-field mt-1"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
        </div>

        {status.error && (
          <p className="text-clay text-sm mt-4">{status.error}</p>
        )}

        <button disabled={status.loading} className="btn-primary w-full mt-6">
          {status.loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-center mt-4 text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="text-clay font-medium">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
