"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approved")
      .eq("id", data.user.id)
      .single();

    if (!profile?.approved) {
      setError("Aapka account abhi admin approval ka wait kar raha hai.");
      setLoading(false);
      return;
    }

    router.push(profile.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">
          Log in
        </h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              required
              type="email"
              className="input-field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              required
              type="password"
              className="input-field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-clay text-sm mt-4">{error}</p>}

        <button disabled={loading} className="btn-primary w-full mt-6">
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-center mt-4 text-ink/60">
          Naye ho?{" "}
          <Link href="/signup" className="text-clay font-medium">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
