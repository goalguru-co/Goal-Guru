"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import StatusPill from "@/components/StatusPill";
import { titleCase, normalizePhone } from "@/lib/format";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

const ROLE_HOME = { admin: "/admin", teacher: "/teacher", parent: "/parent", student: "/dashboard" };

export default function ManageUsers() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [parents, setParents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [linkPhoneInputs, setLinkPhoneInputs] = useState({});
  const [linkStatus, setLinkStatus] = useState({});
  const [students, setStudents] = useState([]);
  const [subStatus, setSubStatus] = useState({});
  const [userActionStatus, setUserActionStatus] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [expandedFeesStudent, setExpandedFeesStudent] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [feeInputs, setFeeInputs] = useState({});
  const [feeStatus, setFeeStatus] = useState({});
  const [csvFile, setCsvFile] = useState(null);
  const [csvStatus, setCsvStatus] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState([]);

  async function loadData() {
    const { data: pending } = await supabase.from("profiles").select("*").eq("approved", false);
    setPendingUsers(pending || []);

    const { data: parentsData } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "parent")
      .eq("approved", true)
      .order("full_name");

    const { data: allLinks } = await supabase
      .from("parent_links")
      .select("id, parent_id, student_id, student_phone, profiles!parent_links_student_id_fkey(full_name)");

    const linkMap = {};
    (allLinks || []).forEach((l) => { linkMap[l.parent_id] = l; });

    setParents((parentsData || []).map((p) => ({ ...p, link: linkMap[p.id] || null })));

    const { data: teachersData } = await supabase
      .from("profiles")
      .select("id, full_name, phone, subject")
      .eq("role", "teacher")
      .eq("approved", true)
      .order("subject")
      .order("full_name");
    setTeachers(teachersData || []);

    const { data: studentsData } = await supabase
      .from("profiles")
      .select("id, full_name, phone, class_level")
      .eq("role", "student")
      .eq("approved", true)
      .order("class_level")
      .order("full_name");

    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("student_id, ends_at")
      .eq("status", "active");

    const subMap = {};
    (activeSubs || []).forEach((s) => { subMap[s.student_id] = s.ends_at; });

    setStudents((studentsData || []).map((s) => ({ ...s, subEndsAt: subMap[s.id] || null })));
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role, approved").eq("id", session.user.id).single();
      if (profile?.role !== "admin" || !profile?.approved) {
        await supabase.auth.signOut();
        router.push(profile?.role && profile?.approved ? (ROLE_HOME[profile.role] || "/login") : "/login?notice=pending-approval");
        return;
      }
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
    await deleteUser(id);
  }

  async function deleteUser(id) {
    setDeletingId(id);
    setUserActionStatus((s) => ({ ...s, [id]: "" }));
    const { data: { session: current } } = await supabase.auth.getSession();
    const res = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${current?.access_token}` },
      body: JSON.stringify({ userId: id }),
    });
    const result = await res.json();
    setDeletingId(null);
    if (result.error) {
      setUserActionStatus((s) => ({ ...s, [id]: "Error: " + result.error }));
      return;
    }
    loadData();
  }

  async function linkParent(parent) {
    const phone = (linkPhoneInputs[parent.id] || "").trim();
    if (!phone) return;
    setLinkStatus((s) => ({ ...s, [parent.id]: "Linking..." }));

    const student = students.find((s) => normalizePhone(s.phone) === normalizePhone(phone));
    if (!student) {
      setLinkStatus((s) => ({ ...s, [parent.id]: "No approved student found with that phone number." }));
      return;
    }

    const { error } = parent.link
      ? await supabase.from("parent_links").update({ student_id: student.id, student_phone: phone }).eq("id", parent.link.id)
      : await supabase.from("parent_links").insert({ parent_id: parent.id, student_id: student.id, student_phone: phone });

    if (error) {
      setLinkStatus((s) => ({ ...s, [parent.id]: "Error: " + error.message }));
      return;
    }
    setLinkStatus((s) => ({ ...s, [parent.id]: "" }));
    setLinkPhoneInputs((s) => ({ ...s, [parent.id]: "" }));
    loadData();
  }

  async function unlinkParent(parent) {
    if (!parent.link) return;
    await supabase.from("parent_links").update({ student_id: null }).eq("id", parent.link.id);
    loadData();
  }

  async function toggleFees(studentId) {
    if (expandedFeesStudent === studentId) {
      setExpandedFeesStudent(null);
      return;
    }
    setExpandedFeesStudent(studentId);
    const { data } = await supabase.from("fees").select("*").eq("student_id", studentId).order("due_date");
    setStudentFees(data || []);
  }

  async function addFee(studentId) {
    const input = feeInputs[studentId] || {};
    const amount = parseInt(input.amount, 10);
    if (!amount) return;
    setFeeStatus((s) => ({ ...s, [studentId]: "Saving..." }));
    const { error } = await supabase.from("fees").insert({
      student_id: studentId,
      amount,
      due_date: input.dueDate || null,
    });
    if (error) {
      setFeeStatus((s) => ({ ...s, [studentId]: "Error: " + error.message }));
      return;
    }
    setFeeInputs((s) => ({ ...s, [studentId]: { amount: "", dueDate: "" } }));
    setFeeStatus((s) => ({ ...s, [studentId]: "" }));
    const { data } = await supabase.from("fees").select("*").eq("student_id", studentId).order("due_date");
    setStudentFees(data || []);
  }

  async function markFeePaid(feeId, studentId) {
    await supabase.from("fees").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", feeId);
    const { data } = await supabase.from("fees").select("*").eq("student_id", studentId).order("due_date");
    setStudentFees(data || []);
  }

  async function grantSubscription(student) {
    setSubStatus((s) => ({ ...s, [student.id]: "Granting..." }));
    const { data: { session: current } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin-grant-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current?.access_token}`,
      },
      body: JSON.stringify({ action: "grant", studentId: student.id, classLevel: student.class_level }),
    });
    const result = await res.json();
    if (result.error) {
      setSubStatus((s) => ({ ...s, [student.id]: "Error: " + result.error }));
      return;
    }
    setSubStatus((s) => ({ ...s, [student.id]: "" }));
    loadData();
  }

  async function revokeSubscription(student) {
    setSubStatus((s) => ({ ...s, [student.id]: "Revoking..." }));
    const { data: { session: current } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin-grant-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current?.access_token}`,
      },
      body: JSON.stringify({ action: "revoke", studentId: student.id }),
    });
    const result = await res.json();
    if (result.error) {
      setSubStatus((s) => ({ ...s, [student.id]: "Error: " + result.error }));
      return;
    }
    setSubStatus((s) => ({ ...s, [student.id]: "" }));
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
        const { data: { session: current } } = await supabase.auth.getSession();
        const res = await fetch("/api/bulk-create-students", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${current?.access_token}` },
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

  if (loading) return <PageLoading />;

  return (
    <>
      <Navbar session={session} role="admin" />
      <main className="px-6 md:px-10 py-10 max-w-4xl mx-auto">
        <PageHeader title="Manage users" />

        <section className="mb-12">
          <h2 className="font-display text-xl font-bold mb-4">
            Pending approvals <span className="text-ink/40">({pendingUsers.length})</span>
          </h2>
          <div className="space-y-3">
            {pendingUsers.length === 0 && <EmptyState icon="✅" title="No pending signups" />}
            {pendingUsers.map((u) => (
              <div key={u.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{titleCase(u.full_name)} <span className="text-xs text-ink/50 font-normal capitalize">({u.role})</span></p>
                  <p className="text-sm text-ink/60">
                    {u.role === "student" && `Class ${u.class_level} · `}
                    {u.role === "teacher" && `${u.subject} · `}
                    {u.phone}
                  </p>
                  {userActionStatus[u.id] && <div className="mt-1"><StatusPill tone="error">{userActionStatus[u.id]}</StatusPill></div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id)} className="btn-primary text-sm py-1.5">Approve</button>
                  <button onClick={() => reject(u.id)} disabled={deletingId === u.id} className="btn-secondary text-sm py-1.5">{deletingId === u.id ? "Rejecting..." : "Reject"}</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-bold mb-2">Parent-child links</h2>
          <p className="text-sm text-ink/60 mb-4">
            Each parent needs to be linked to their child's student account by phone number.
            This normally happens automatically at signup, but you can link or relink manually here.
          </p>
          <div className="space-y-3">
            {parents.length === 0 && <EmptyState icon="👨‍👩‍👧" title="No approved parent accounts yet" />}
            {parents.map((p) => (
              <div key={p.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{titleCase(p.full_name)} <span className="text-xs text-ink/50 font-normal">— {p.phone}</span></p>
                  <p className="text-xs mt-1">
                    {p.link?.student_id ? (
                      <span className="text-leaf font-semibold">Linked to {titleCase(p.link.profiles?.full_name) || "a student"}</span>
                    ) : (
                      <span className="text-ink/50">Not linked to a student yet</span>
                    )}
                  </p>
                  {linkStatus[p.id] && <div className="mt-1"><StatusPill tone={linkStatus[p.id].startsWith("Error") || linkStatus[p.id].startsWith("No approved") ? "error" : "info"}>{linkStatus[p.id]}</StatusPill></div>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Child's phone"
                    className="input-field w-40 text-sm py-1.5"
                    value={linkPhoneInputs[p.id] || ""}
                    onChange={(e) => setLinkPhoneInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                  />
                  <button onClick={() => linkParent(p)} className="btn-primary text-sm py-1.5 whitespace-nowrap">
                    {p.link?.student_id ? "Relink" : "Link"}
                  </button>
                  {p.link?.student_id && (
                    <button onClick={() => unlinkParent(p)} className="btn-secondary text-sm py-1.5 whitespace-nowrap">Unlink</button>
                  )}
                  <button onClick={() => deleteUser(p.id)} disabled={deletingId === p.id} className="text-xs text-spark font-semibold whitespace-nowrap">
                    {deletingId === p.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-bold mb-2">Teachers</h2>
          <div className="space-y-3">
            {teachers.length === 0 && <EmptyState icon="🧑‍🏫" title="No approved teachers yet" />}
            {teachers.map((t) => (
              <div key={t.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{titleCase(t.full_name)} <span className="text-xs text-ink/50 font-normal">— {t.subject} · {t.phone}</span></p>
                  {userActionStatus[t.id] && <div className="mt-1"><StatusPill tone="error">{userActionStatus[t.id]}</StatusPill></div>}
                </div>
                <button onClick={() => deleteUser(t.id)} disabled={deletingId === t.id} className="text-xs text-spark font-semibold shrink-0">
                  {deletingId === t.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl font-bold mb-2">All students</h2>
          <p className="text-sm text-ink/60 mb-4">
            Grant free access to unlock videos, tests and live classes for a student without
            a Razorpay payment, or manage their fee records — useful for testing, trials, or offline-paid students.
          </p>
          <div className="space-y-3">
            {students.length === 0 && <EmptyState icon="🎓" title="No approved students yet" />}
            {students.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{titleCase(s.full_name)} <span className="text-xs text-ink/50 font-normal">— Class {s.class_level} · {s.phone}</span></p>
                    <p className="text-xs mt-1">
                      {s.subEndsAt ? (
                        <span className="text-leaf font-semibold">Active until {new Date(s.subEndsAt).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-ink/50">No active subscription</span>
                      )}
                    </p>
                    {subStatus[s.id] && <div className="mt-1"><StatusPill tone={subStatus[s.id].startsWith("Error") ? "error" : "info"}>{subStatus[s.id]}</StatusPill></div>}
                    {userActionStatus[s.id] && <div className="mt-1"><StatusPill tone="error">{userActionStatus[s.id]}</StatusPill></div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.subEndsAt ? (
                      <button onClick={() => revokeSubscription(s)} className="btn-secondary text-sm py-1.5">Revoke access</button>
                    ) : (
                      <button onClick={() => grantSubscription(s)} className="btn-primary text-sm py-1.5">Grant free access</button>
                    )}
                    <button onClick={() => toggleFees(s.id)} className="btn-secondary text-sm py-1.5 whitespace-nowrap">
                      {expandedFeesStudent === s.id ? "Hide fees ▲" : "Manage fees ▼"}
                    </button>
                    <button onClick={() => deleteUser(s.id)} disabled={deletingId === s.id} className="text-xs text-spark font-semibold whitespace-nowrap">
                      {deletingId === s.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {expandedFeesStudent === s.id && (
                  <div className="mt-4 pt-4 border-t border-line">
                    {studentFees.length === 0 && <p className="text-sm text-ink/50 mb-3">No fee records yet.</p>}
                    {studentFees.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm py-2 border-b border-line last:border-0">
                        <span>₹{f.amount} {f.due_date ? `— due ${new Date(f.due_date).toLocaleDateString()}` : ""}</span>
                        {f.status === "paid" ? (
                          <span className="text-leaf font-semibold text-xs">Paid</span>
                        ) : (
                          <button onClick={() => markFeePaid(f.id, s.id)} className="text-xs text-clay font-semibold">Mark as paid</button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        className="input-field text-sm py-1.5 w-32"
                        value={feeInputs[s.id]?.amount || ""}
                        onChange={(e) => setFeeInputs((inp) => ({ ...inp, [s.id]: { ...inp[s.id], amount: e.target.value } }))}
                      />
                      <input
                        type="date"
                        className="input-field text-sm py-1.5 w-40"
                        value={feeInputs[s.id]?.dueDate || ""}
                        onChange={(e) => setFeeInputs((inp) => ({ ...inp, [s.id]: { ...inp[s.id], dueDate: e.target.value } }))}
                      />
                      <button onClick={() => addFee(s.id)} className="btn-primary text-sm py-1.5">Add fee</button>
                    </div>
                    {feeStatus[s.id] && <div className="mt-2"><StatusPill tone={feeStatus[s.id].startsWith("Error") ? "error" : "info"}>{feeStatus[s.id]}</StatusPill></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-2">Bulk upload school students (CSV)</h2>
          <p className="text-sm text-ink/60 mb-4">
            Required CSV columns: <code className="bg-ink/5 px-1.5 py-0.5 rounded font-mono text-xs">full_name, phone, class_level, school_name</code>.
            Login IDs/passwords are auto-generated — after upload you can download a
            credentials file to share with the school.
          </p>
          <div className="card p-6">
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="mb-4 text-sm" />
            <button onClick={handleCsvUpload} className="btn-primary">Upload &amp; create accounts</button>
            {csvStatus && <div className="mt-3"><StatusPill tone={csvStatus.startsWith("Error") ? "error" : "info"}>{csvStatus}</StatusPill></div>}
            {generatedCreds.length > 0 && (
              <button onClick={downloadCreds} className="btn-secondary mt-4 block">Download login credentials CSV</button>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
