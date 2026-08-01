"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState({ pending: 0, total: 0, activeSubs: 0 });

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setSession(session);

      const { count: pending } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("approved", false)
        .eq("role", "student");

      const { count: total } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      const { count: activeSubs } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setStats({ pending: pending || 0, total: total || 0, activeSubs: activeSubs || 0 });
    }
    load();
  }, [router]);

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-5xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin panel</h1>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="card p-5">
            <p className="label-eyebrow">Pending approval</p>
            <p className="text-3xl font-display font-semibold mt-2">{stats.pending}</p>
          </div>
          <div className="card p-5">
            <p className="label-eyebrow">Total students</p>
            <p className="text-3xl font-display font-semibold mt-2">{stats.total}</p>
          </div>
          <div className="card p-5">
            <p className="label-eyebrow">Active subscriptions</p>
            <p className="text-3xl font-display font-semibold mt-2">{stats.activeSubs}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-10">
          <Link href="/admin/students" className="card p-6 hover:border-clay">
            <h3 className="font-medium mb-1">Manage students</h3>
            <p className="text-sm text-ink/60">Approve signups, bulk upload school lists via CSV</p>
          </Link>
          <Link href="/admin/content" className="card p-6 hover:border-clay">
            <h3 className="font-medium mb-1">Manage content</h3>
            <p className="text-sm text-ink/60">Add video lectures, live classes and study material</p>
          </Link>
        </div>
      </main>
    </>
  );
}
