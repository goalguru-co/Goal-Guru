import { badgeForPoints } from "@/components/Badge";

const STOPWORDS = new Set(["a", "an", "the", "is", "are", "do", "does", "did", "i", "my", "me", "to", "of", "for", "how", "what", "when", "where", "can", "will", "on", "in", "at", "it", "this", "that", "have", "has", "am", "was", "were"]);
const GREETINGS = new Set(["hi", "hello", "hey", "hii", "hiya", "yo", "sup", "hlo"]);

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Score = (number of matched significant words) * (how complete the match is).
// This deliberately rewards longer, more specific phrases over short generic ones —
// e.g. "test score" (2/2 words matched) scores higher than "how to test" (which
// reduces to just the single word "test" once stopwords are stripped), so a specific
// data question doesn't lose to a vague FAQ that happens to share one word.
function scorePhrase(phrase, messageWords) {
  const words = normalize(phrase).split(" ").filter((w) => w && !STOPWORDS.has(w));
  if (words.length === 0) return 0;
  const matched = words.filter((w) => messageWords.includes(w)).length;
  const ratio = matched / words.length;
  if (matched === 0 || ratio < 0.6) return 0;
  return matched * ratio;
}

function scoreKeywords(keywordsStr, messageWords) {
  const phrases = keywordsStr.split(",");
  return Math.max(...phrases.map((p) => scorePhrase(p, messageWords)));
}

const HOMEWORK_BOUNDARY_WORDS = [
  "solve", "explain", "define", "definition of", "meaning of", "write an essay",
  "summarize", "summarise", "translate", "calculate the", "prove that", "derive",
  "what is the value of", "give me the answer", "answer to this", "do my homework",
];

// ---------- Data-driven intents (live Supabase lookups, same authenticated client the app already uses) ----------

async function studentIntents(ctx) {
  const { supabase, session, profile } = ctx;
  return [
    {
      question: "What's my attendance?",
      keywords: "attendance, present, absent, missed classes, days present, how many classes have i missed",
      handler: async () => {
        const { data } = await supabase.from("attendance").select("status").eq("student_id", session.user.id);
        if (!data || data.length === 0) return "No attendance has been recorded for you yet.";
        const present = data.filter((a) => a.status === "present").length;
        const pct = Math.round((present / data.length) * 100);
        return `Your attendance is ${pct}% (${present} of ${data.length} recorded classes). Check the Results tab for the full breakdown.`;
      },
    },
    {
      question: "What's my test score average?",
      keywords: "my score, test score, average score, my marks, my results, how did i score",
      handler: async () => {
        const { data } = await supabase.from("test_attempts").select("score, total").eq("student_id", session.user.id);
        if (!data || data.length === 0) return "You haven't attempted any tests yet — head to the Tests or Practice tab to get started!";
        const pct = Math.round((data.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / data.length) * 100);
        return `Your average test score is ${pct}% across ${data.length} test${data.length > 1 ? "s" : ""}. See the Results tab for a subject-wise breakdown.`;
      },
    },
    {
      question: "How many points and what badge do I have?",
      keywords: "how many points, my points, my badge, what badge, bronze silver gold",
      handler: async () => {
        const points = profile?.points || 0;
        return `You have ${points} points, putting you at the ${badgeForPoints(points)} tier. Check the Overview or Profile tab to see how close you are to the next tier.`;
      },
    },
    {
      question: "What's my weekly rank?",
      keywords: "my rank, weekly rank, my ranking, leaderboard, class rank",
      handler: async () => {
        try {
          const res = await fetch("/api/weekly-rank", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          });
          const r = await res.json();
          if (r.error || !r.rank) return "Complete a test this week to get ranked among your classmates!";
          return `You're ranked #${r.rank} of ${r.totalStudents} in your class this week, with ${r.weeklyPoints} points earned so far.`;
        } catch {
          return "I couldn't fetch your rank right now — try the Overview tab.";
        }
      },
    },
    {
      question: "What assignments do I still need to submit?",
      keywords: "pending assignments, homework pending, assignments due, what assignments, unsubmitted",
      handler: async () => {
        const [{ data: assignments }, { data: submissions }] = await Promise.all([
          supabase.from("assignments").select("id, title").eq("class_level", profile?.class_level),
          supabase.from("assignment_submissions").select("assignment_id").eq("student_id", session.user.id),
        ]);
        const submittedIds = new Set((submissions || []).map((s) => s.assignment_id));
        const pending = (assignments || []).filter((a) => !submittedIds.has(a.id));
        if (pending.length === 0) return "You're all caught up — no pending assignments! 🎉";
        return `You have ${pending.length} pending assignment${pending.length > 1 ? "s" : ""}: ${pending.map((a) => a.title).join(", ")}. Head to the Assignments tab to submit.`;
      },
    },
    {
      question: "When's my next live class?",
      keywords: "next live class, upcoming live class, live class schedule, when is my next class",
      handler: async () => {
        const { data } = await supabase.from("live_classes").select("title, scheduled_at").eq("class_level", profile?.class_level).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1);
        if (!data || data.length === 0) return "No live classes are currently scheduled.";
        return `Your next live class is "${data[0].title}" on ${new Date(data[0].scheduled_at).toLocaleString()}.`;
      },
    },
    {
      question: "Am I subscribed?",
      keywords: "am i subscribed, is my subscription active, do i have access, subscription status",
      handler: async () => {
        const { data } = await supabase.from("subscriptions").select("ends_at").eq("student_id", session.user.id).eq("status", "active").order("ends_at", { ascending: false }).limit(1).maybeSingle();
        if (!data) return "You don't have an active subscription right now. Visit the Subscribe page to unlock videos, tests, and live classes.";
        return `Yes — your subscription is active until ${new Date(data.ends_at).toLocaleDateString()}.`;
      },
    },
  ];
}

async function parentIntents(ctx) {
  const { supabase, linkedChild } = ctx;
  if (!linkedChild) {
    return [{
      question: "Tell me about my child",
      keywords: "my child, attendance, score, fee, remark, ptm",
      handler: async () => "I don't see a linked child account yet — ask your school admin to link your account to your child's student profile.",
    }];
  }
  const childName = linkedChild.full_name || "your child";
  return [
    {
      question: "What's my child's attendance?",
      keywords: "attendance, present, absent, missed classes, days present",
      handler: async () => {
        const { data } = await supabase.from("attendance").select("status").eq("student_id", linkedChild.id);
        if (!data || data.length === 0) return `No attendance has been recorded for ${childName} yet.`;
        const present = data.filter((a) => a.status === "present").length;
        return `${childName}'s attendance is ${Math.round((present / data.length) * 100)}% (${present} of ${data.length} recorded classes).`;
      },
    },
    {
      question: "What's my child's test score average?",
      keywords: "test score, average score, marks, results, how did they score",
      handler: async () => {
        const { data } = await supabase.from("test_attempts").select("score, total").eq("student_id", linkedChild.id);
        if (!data || data.length === 0) return `${childName} hasn't attempted any tests yet.`;
        const pct = Math.round((data.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / data.length) * 100);
        return `${childName}'s average test score is ${pct}% across ${data.length} test${data.length > 1 ? "s" : ""}.`;
      },
    },
    {
      question: "Is the fee paid?",
      keywords: "fee status, is fee paid, pending fee, how much fee, payment status",
      handler: async () => {
        const { data } = await supabase.from("fees").select("amount, status, due_date").eq("student_id", linkedChild.id).order("due_date");
        if (!data || data.length === 0) return "No fee records found yet.";
        const pending = data.filter((f) => f.status !== "paid");
        if (pending.length === 0) return "All fees are marked as paid. 🎉";
        return `${pending.length} fee record${pending.length > 1 ? "s" : ""} still pending: ${pending.map((f) => `₹${f.amount}`).join(", ")}.`;
      },
    },
    {
      question: "Any teacher remarks?",
      keywords: "teacher remarks, any remarks, what did teacher say",
      handler: async () => {
        const { data } = await supabase.from("teacher_remarks").select("remark").eq("student_id", linkedChild.id).order("created_at", { ascending: false }).limit(1);
        if (!data || data.length === 0) return "No teacher remarks yet.";
        return `Latest remark: "${data[0].remark}"`;
      },
    },
    {
      question: "When's the next PTM?",
      keywords: "next ptm, when is ptm, parent teacher meeting date",
      handler: async () => {
        const { data } = await supabase.from("ptm_schedule").select("scheduled_at, notes").or(`class_level.eq.${linkedChild.class_level},class_level.is.null`).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1);
        if (!data || data.length === 0) return "No PTM is currently scheduled.";
        return `Next PTM: ${new Date(data[0].scheduled_at).toLocaleString()}${data[0].notes ? ` — ${data[0].notes}` : ""}.`;
      },
    },
    {
      question: "Does my child have pending homework?",
      keywords: "homework pending, assignment status, did my child submit, pending assignments",
      handler: async () => {
        const [{ data: assignments }, { data: submissions }] = await Promise.all([
          supabase.from("assignments").select("id, title").eq("class_level", linkedChild.class_level),
          supabase.from("assignment_submissions").select("assignment_id").eq("student_id", linkedChild.id),
        ]);
        const submittedIds = new Set((submissions || []).map((s) => s.assignment_id));
        const pending = (assignments || []).filter((a) => !submittedIds.has(a.id));
        if (pending.length === 0) return `${childName} is all caught up on homework!`;
        return `${childName} has ${pending.length} pending: ${pending.map((a) => a.title).join(", ")}.`;
      },
    },
  ];
}

async function teacherIntents(ctx) {
  const { supabase } = ctx;
  return [
    {
      question: "How many open doubts do I have?",
      keywords: "how many doubts, open doubts, pending doubts, unanswered questions",
      handler: async () => {
        const { count } = await supabase.from("doubts").select("*", { count: "exact", head: true }).eq("status", "open");
        return count ? `There ${count === 1 ? "is" : "are"} ${count} open doubt${count === 1 ? "" : "s"} waiting for a response — check the Doubts tab.` : "No open doubts right now — you're all caught up!";
      },
    },
    {
      question: "Do I have a live class today?",
      keywords: "live class today, todays classes, schedule today, any classes today",
      handler: async () => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const { data } = await supabase.from("live_classes").select("title, scheduled_at").gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString());
        if (!data || data.length === 0) return "No live classes scheduled for today.";
        return `Today: ${data.map((l) => `${l.title} at ${new Date(l.scheduled_at).toLocaleTimeString()}`).join(", ")}.`;
      },
    },
  ];
}

async function adminIntents(ctx) {
  const { supabase } = ctx;
  return [
    {
      question: "How many pending approvals?",
      keywords: "pending approvals, how many pending, signups waiting",
      handler: async () => {
        const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approved", false);
        return count ? `${count} account${count === 1 ? " is" : "s are"} waiting for approval — check Manage Users.` : "No pending approvals right now.";
      },
    },
    {
      question: "How many active subscriptions?",
      keywords: "active subscriptions, how many subscribed",
      handler: async () => {
        const { count } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active");
        return `There are currently ${count || 0} active subscriptions.`;
      },
    },
    {
      question: "What's total revenue?",
      keywords: "total revenue, how much revenue, revenue collected",
      handler: async () => {
        const { data } = await supabase.from("subscriptions").select("amount").eq("status", "active");
        const total = (data || []).reduce((s, x) => s + (x.amount || 0), 0) / 100;
        return `Total revenue from active subscriptions is ₹${total}.`;
      },
    },
  ];
}

const ROLE_INTENT_BUILDERS = {
  student: studentIntents,
  parent: parentIntents,
  teacher: teacherIntents,
  admin: adminIntents,
};

export async function getExampleQuestions(ctx) {
  const { role, faqs } = ctx;
  const roleFaqs = faqs.filter((f) => !f.role || f.role === role).slice(0, 3).map((f) => f.question);
  const builder = ROLE_INTENT_BUILDERS[role];
  const dataQs = builder ? (await builder(ctx)).slice(0, 3).map((i) => i.question) : [];
  return [...dataQs, ...roleFaqs].slice(0, 5);
}

export async function getChatbotReply(message, ctx) {
  const { role, faqs } = ctx;
  const normalized = normalize(message);

  if (GREETINGS.has(normalized)) {
    return "Hey! Ask me about your account (attendance, scores, assignments...) or how to use a feature — or tap Suggestions below for ideas.";
  }

  const messageWords = normalized.split(" ");

  // Build candidate list: FAQs (role-matched) + role-specific data intents
  const candidates = [];

  faqs
    .filter((f) => !f.role || f.role === role)
    .forEach((f) => candidates.push({ score: scoreKeywords(f.keywords, messageWords), answer: f.answer }));

  const builder = ROLE_INTENT_BUILDERS[role];
  if (builder) {
    const intents = await builder(ctx);
    intents.forEach((intent) => candidates.push({ score: scoreKeywords(intent.keywords, messageWords), handler: intent.handler }));
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (best && best.score >= 1) {
    return best.answer || (await best.handler());
  }

  const hitBoundary = HOMEWORK_BOUNDARY_WORDS.some((w) => normalized.includes(w));
  if (hitBoundary) {
    return "I can't solve or explain subject questions for you — that's exactly what the Doubts tab is for! Ask your teacher there and they'll help you understand it properly. I can help with things like your attendance, scores, assignments, and how to use the app.";
  }

  return "I'm not sure I understood that. Try asking about your attendance, scores, assignments, or how to use a feature — or tap one of the suggestions below.";
}
