"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Magnetic from "./Magnetic";

const ROLE_HOME = {
  admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
  student: "/dashboard",
};

export default function Navbar({ session, role }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      className={`flex items-center justify-between px-6 md:px-10 py-3 sticky top-0 z-30 transition-all duration-300 ${
        scrolled ? "glass shadow-glass" : "bg-transparent border-b border-transparent"
      }`}
    >
      <Link href={session ? (ROLE_HOME[role] || "/dashboard") : "/"} className="flex items-center gap-2 font-display text-xl font-extrabold text-ink tracking-tight">
        <Image src="/logo.png" alt="Goal Guru" width={40} height={40} className="rounded-full" priority />
        Goal Guru
      </Link>
      <div className="flex items-center gap-5 text-sm font-semibold">
        {session ? (
          <>
            <Link href={ROLE_HOME[role] || "/dashboard"} className="hover:text-clay transition-colors capitalize">
              {role} home
            </Link>
            <Magnetic strength={0.2}>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5">
                Log out
              </button>
            </Magnetic>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-clay transition-colors">
              Log in
            </Link>
            <Magnetic strength={0.2}>
              <Link href="/signup" className="btn-primary text-sm py-1.5">
                Get started
              </Link>
            </Magnetic>
          </>
        )}
      </div>
    </nav>
  );
}
