import { worksheetQuestionTypeLabelHe } from "../../lib/worksheet-activities/worksheet-labels.client.js";

const QUESTION_TYPES = ["multiple_choice", "true_false", "numeric", "short_answer", "free_text"];

/**
 * @param {{ questions: Array<Record<string, unknown>>, onChange: (q: Array<Record<string, unknown>>) => void, disabled?: boolean }} props
 */
export default function TeacherQuestionBuilder({ questions, onChange, disabled }) {
  const setCount = (n) => {
    const count = Math.max(1, Math.min(100, Number(n) || 1));
    const next = [];
    for (let i = 1; i <= count; i += 1) {
      const existing = questions.find((q) => Number(q.questionIndex) === i);
      next.push(
        existing || {
          questionIndex: i,
          questionType: "multiple_choice",
          points: 1,
          choices: ["א", "ב", "ג", "ד"],
          correctAnswer: null,
        }
      );
    }
    onChange(next);
  };

  const updateQ = (idx, patch) => {
    onChange(
      questions.map((q) => (Number(q.questionIndex) === idx ? { ...q, ...patch } : q))
    );
  };

  return (
    <div className="space-y-4 text-right">
      <label className="block text-sm text-white/80">
        מספר שאלות
        <input
          type="number"
          min={1}
          max={100}
          disabled={disabled}
          className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
          value={questions.length || 1}
          onChange={(e) => setCount(e.target.value)}
        />
      </label>

      {questions.map((q) => {
        const idx = Number(q.questionIndex);
        const type = String(q.questionType || "multiple_choice");
        return (
          <div key={idx} className="rounded-xl border border-white/10 p-3 bg-black/25">
            <p className="font-semibold text-white mb-2">שאלה {idx}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                סוג
                <select
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                  value={type}
                  onChange={(e) => updateQ(idx, { questionType: e.target.value })}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {worksheetQuestionTypeLabelHe(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70">
                נקודות
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                  value={q.points ?? 1}
                  onChange={(e) => updateQ(idx, { points: Number(e.target.value) })}
                />
              </label>
            </div>

            {type === "multiple_choice" ? (
              <label className="block text-sm text-white/70 mt-2">
                אפשרויות (מופרדות בפסיק)
                <input
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                  value={Array.isArray(q.choices) ? q.choices.join(", ") : ""}
                  onChange={(e) =>
                    updateQ(idx, {
                      choices: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
            ) : null}

            {type !== "free_text" ? (
              <label className="block text-sm text-white/70 mt-2">
                תשובה נכונה (אופציונלי)
                <input
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                  value={q.correctAnswer != null ? String(q.correctAnswer) : ""}
                  onChange={(e) =>
                    updateQ(idx, {
                      correctAnswer: e.target.value.trim() ? e.target.value.trim() : null,
                    })
                  }
                />
              </label>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
