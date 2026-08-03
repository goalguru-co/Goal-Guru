"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getChatbotReply, getExampleQuestions } from "@/lib/chatbotEngine";

const ROLE_LABEL = { student: "student", parent: "parent", teacher: "teacher", admin: "admin" };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [linkedChild, setLinkedChild] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [examples, setExamples] = useState([]);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef(null);

  // Load session/profile/FAQs once, lazily, only when the bubble is first opened —
  // keeps this component from doing any work at all on pages where it's never used.
  useEffect(() => {
    if (!open || ready) return;

    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      let profileData = null;
      let child = null;

      if (s) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", s.user.id).single();
        profileData = p;
        setProfile(p);

        if (p?.role === "parent") {
          const { data: link } = await supabase
            .from("parent_links")
            .select("student_id, profiles!parent_links_student_id_fkey(id, full_name, class_level)")
            .eq("parent_id", s.user.id)
            .not("student_id", "is", null)
            .limit(1)
            .maybeSingle();
          child = link?.profiles || null;
          setLinkedChild(child);
        }
      }

      const { data: faqData } = await supabase.from("chatbot_faqs").select("*");
      setFaqs(faqData || []);

      const role = profileData?.role;
      const greeting = s
        ? `Hi ${profileData?.full_name?.split(" ")[0] || "there"}! I can help with your account info or how to use Goal Guru. What do you need?`
        : "Hi! Log in first and I can answer questions about your account — or ask me how to use Goal Guru.";
      setMessages([{ from: "bot", text: greeting }]);

      if (role) {
        const ex = await getExampleQuestions(role, faqData || []);
        setExamples(ex);
      }

      setReady(true);
    }
    init();
  }, [open, ready]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || thinking) return;
    setMessages((m) => [...m, { from: "user", text: trimmed }]);
    setInput("");
    setThinking(true);

    let reply;
    if (!session) {
      reply = "Please log in first — then I can look up your account details.";
    } else {
      reply = await getChatbotReply(trimmed, {
        role: profile?.role,
        session,
        profile,
        linkedChild,
        faqs,
      });
    }

    setMessages((m) => [...m, { from: "bot", text: reply }]);
    setThinking(false);
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white font-semibold text-sm shadow-glow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, #2F6FED, #06B6D4)" }}
      >
        <span className="text-lg">{open ? "✕" : "💬"}</span>
        {!open && "Ask me anything"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] glass rounded-[20px] shadow-glow-lg flex flex-col overflow-hidden border border-line">
          <div className="px-4 py-3 border-b border-line bg-white/60 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: "linear-gradient(135deg, #2F6FED, #06B6D4)" }}>💬</span>
            <div>
              <p className="font-display font-bold text-sm text-ink">Goal Guru Assistant</p>
              <p className="text-xs text-ink/50">{profile?.role ? `Signed in as ${ROLE_LABEL[profile.role]}` : "General help"}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] text-sm px-3 py-2 rounded-2xl ${
                    m.from === "user" ? "bg-clay text-white rounded-br-sm" : "bg-white border border-line text-ink rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-line rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-ink/40">Thinking...</div>
              </div>
            )}
            {!thinking && messages.length <= 1 && examples.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {examples.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-line hover:border-clay/40 text-ink/70"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-line bg-white/60 flex gap-2"
          >
            <input
              className="input-field text-sm py-2"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={thinking} className="btn-primary text-sm py-2 px-4 shrink-0">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
