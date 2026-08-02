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
      <div className="card p-6 text-center">
        <p className="label-eyebrow mb-2">Result</p>
        <p className="font-display text-3xl font-semibold text-ink">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-ink/60 mt-2">Nice work — points added to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={i} className="card p-4">
          <p className="font-medium text-ink mb-3">{i + 1}. {q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={answers[i] === oi}
                  onChange={() => selectAnswer(i, oi)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={submit} className="btn-primary w-full">Submit test</button>
    </div>
  );
}
