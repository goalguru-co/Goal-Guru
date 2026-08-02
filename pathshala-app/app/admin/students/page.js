"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

export default function ManageUsers() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [unlinkedParents, setUnlinkedParents] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvStatus, setCsvStatus] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState([]);

  async function loadData() {
    const { data: pending } = await supabase.from("profiles").select("*").eq("approved", false);
    setPendingUsers(pending || []);

    const { data: links } = await supabase.from("parent_links").select("*, profiles!parent_links_parent_id_fkey(full_name)").is("student_id", null);
    setUnlinkedParents(links || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setSession(session);
      loadData();
    }
    init();
  }, [router]);

  async function approve(id) {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    loadData();
  }

  async function reject(id) {
    await supabase.from("profiles").delete().eq("id", id);
    loadData();
  }

  async function linkParent(linkId, studentPhone) {
    const { data: student } = await supabase.from("profiles").select("id").eq("phone", studentPhone).eq("role", "student").maybeSingle();
    if (!student) {
      alert("No student found with that phone number.");
      return;
    }
    await supabase.from("parent_links").update({ student_id: student.id }).eq("id", linkId);
    loadData();
  }

  function handleCsvUpload() {
    if (!csvFile) return;
    setCsvStatus("Reading CSV...");
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setCsvStatus(`Creating ${results.data.length} student accounts...`);
        const res = await fetch("/api/bulk-create-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: results.data }),
        });
        const data = await res.json();
        if (data.error) { setCsvStatus("Error: " + data.error); return; }
        setGeneratedCreds(data.created || []);
        setCsvStatus(`Done. ${data.created?.length || 0} accounts created.`);
      },
    });
  }

  function downloadCreds() {
    const csv = Papa.unparse(generatedCreds);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_login_credentials.csv";
    a.click();
  }

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-4xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-ink">Manage users</h1>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold mb-4">
            Pending approvals ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.length === 0 && <p className="text-ink/60 text-sm">No pending signups.</p>}
            {pendingUsers.map((u) => (
              <div key={u.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.full_name} <span className="text-xs text-ink/50 capitalize">({u.role})</span></p>
                  <p className="text-sm text-ink/60">
                    {u.role === "student" && `Class ${u.class_level} · `}
                    {u.role === "teacher" && `${u.subject} · `}
                    {u.phone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id)} className="btn-primary text-sm py-1.5">Approve</button>
                  <button onClick={() => reject(u.id)} className="btn-secondary text-sm py-1.5">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {unlinkedParents.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-semibold mb-4">Unlinked parent accounts</h2>
            <p className="text-sm text-ink/60 mb-4">
              These parents signed up but their child's phone number didn't match any student yet.
            </p>
            <div className="space-y-3">
              {unlinkedParents.map((l) => (
                <div key={l.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{l.profiles?.full_name}</p>
                    <p className="text-sm text-ink/60">Child's phone: {l.student_phone}</p>
                  </div>
                  <button onClick={() => linkParent(l.id, l.student_phone)} className="btn-primary text-sm py-1.5">
                    Retry link
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold mb-2">Bulk upload school students (CSV)</h2>
          <p className="text-sm text-ink/60 mb-4">
            Required CSV columns: <code className="bg-ink/5 px-1 rounded">full_name, phone, class_level, school_name</code>.
            Login IDs/passwords are auto-generated — after upload you can download a
            credentials file to share with the school.
          </p>
          <div className="card p-6">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="mb-4" />
            <button onClick={handleCsvUpload} className="btn-primary">Upload &amp; create accounts</button>
            {csvStatus && <p className="text-sm text-ink/60 mt-3">{csvStatus}</p>}
            {generatedCreds.length > 0 && (
              <button onClick={downloadCreds} className="btn-secondary mt-4 block">Download login credentials CSV</button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
