"use client";

import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const ROLE_HOME = {
  admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
  student: "/dashboard",
};

export default function Navbar({ session, role }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-[#DCE7F2] bg-paper/90 backdrop-blur sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <Image src="/logo.png" alt="Goal Guru" width={32} height={32} className="rounded-full" />
        Goal Guru
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        {session ? (
          <>
            <Link href={ROLE_HOME[role] || "/dashboard"} className="hover:underline capitalize">
              {role} home
            </Link>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary text-sm py-1.5">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
