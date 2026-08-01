"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

export default function ManageStudents() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvStatus, setCsvStatus] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState([]);

  async function loadPending() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("approved", false);
    setPendingStudents(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setSession(session);
      loadPending();
    }
    init();
  }, [router]);

  async function approve(id) {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    loadPending();
  }

  async function reject(id) {
    await supabase.from("profiles").delete().eq("id", id);
    loadPending();
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
        if (data.error) {
          setCsvStatus("Error: " + data.error);
          return;
        }
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
        <h1 className="font-display text-3xl font-semibold text-ink">Manage students</h1>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold mb-4">
            Pending approvals ({pendingStudents.length})
          </h2>
          <div className="space-y-3">
            {pendingStudents.length === 0 && (
              <p className="text-ink/60 text-sm">Koi pending signup nahi hai.</p>
            )}
            {pendingStudents.map((s) => (
              <div key={s.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-sm text-ink/60">Class {s.class_level} &middot; {s.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(s.id)} className="btn-primary text-sm py-1.5">
                    Approve
                  </button>
                  <button onClick={() => reject(s.id)} className="btn-secondary text-sm py-1.5">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold mb-2">
            Bulk upload school students (CSV)
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            CSV columns needed: <code className="bg-ink/5 px-1 rounded">full_name, phone, class_level, school_name</code>.
            Login ID/password apne aap generate ho jayenge — upload ke baad ek
            credentials file download hogi jo aap school ko de sakte hain.
          </p>
          <div className="card p-6">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="mb-4"
            />
            <button onClick={handleCsvUpload} className="btn-primary">
              Upload & create accounts
            </button>
            {csvStatus && <p className="text-sm text-ink/60 mt-3">{csvStatus}</p>}
            {generatedCreds.length > 0 && (
              <button onClick={downloadCreds} className="btn-secondary mt-4 block">
                Download login credentials CSV
              </button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
