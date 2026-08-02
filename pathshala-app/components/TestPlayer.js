"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPlayer({ test, studentId, onDone }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const questions = test.questions || [];

  function selectAnswer(qIndex, optionIndex) {
    setAnswers((a) => ({ ...a, [qIndex]: optionIndex }));
  }

  async function submit() {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) correctCount += 1;
    });
    setScore(correctCount);
    setSubmitted(true);

    await supabase.from("test_attempts").insert({
      test_id: test.id,
      student_id: studentId,
      answers,
      score: correctCount,
      total: questions.length,
    });

    // simple gamification: +10 points per correct answer
    const { data: profile } = await supabase
      .from("profiles")
      .select("points, streak_count")
      .eq("id", studentId)
      .single();

    await supabase
      .from("profiles")
      .update({
        points: (profile?.points || 0) + correctCount * 10,
        streak_count: (profile?.streak_count || 0) + 1,
      })
      .eq("id", studentId);

    if (onDone) onDone();
  }

  if (submitted) {
    return (
      <div className="card-gradient-border p-8 text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-leaf/10 blur-2xl" />
        <p className="label-eyebrow mb-2 relative">Result</p>
        <p className="font-display text-4xl font-extrabold text-gradient relative">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-ink/60 mt-2 relative">Nice work — points added to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={i} className="card p-5">
          <p className="font-semibold text-ink mb-3">{i + 1}. {q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const isSelected = answers[i] === oi;
              return (
                <label
                  key={oi}
                  className={`flex items-center gap-3 text-sm cursor-pointer px-3 py-2.5 rounded-xl border transition-all ${
                    isSelected ? "border-clay bg-clay/5" : "border-line hover:border-clay/30"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-clay" : "border-line"}`}>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-clay" />}
                  </span>
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={isSelected}
                    onChange={() => selectAnswer(i, oi)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={submit} className="btn-primary w-full">Submit test</button>
    </div>
  );
}
