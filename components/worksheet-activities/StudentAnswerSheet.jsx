import { worksheetQuestionTypeLabelHe } from "../../lib/worksheet-activities/worksheet-labels.client.js";

/**
 * @param {{ questions: Array<{ questionIndex: number, questionType: string, points?: number|null, choices?: string[]|null }>, answers: Record<number, string>, onChange: (idx: number, val: string) => void, disabled?: boolean }} props
 */
export default function StudentAnswerSheet({ questions, answers, onChange, disabled }) {
  return (
    <div className="space-y-4 text-right">
      <h3 className="text-lg font-bold text-white">גיליון תשובות</h3>
      {questions.map((q) => {
        const idx = q.questionIndex;
        const type = q.questionType;
        const val = answers[idx] ?? "";

        return (
          <div key={idx} className="rounded-xl border border-white/10 p-3 bg-black/25">
            <p className="text-sm text-white/70 mb-2">
              שאלה {idx} · {worksheetQuestionTypeLabelHe(type)}
              {q.points != null ? ` · ${q.points} נק'` : ""}
            </p>

            {type === "multiple_choice" && Array.isArray(q.choices) ? (
              <div className="flex flex-col gap-2">
                {q.choices.map((c) => (
                  <label key={c} className="flex items-center gap-2 justify-end cursor-pointer">
                    <span className="text-white">{c}</span>
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      disabled={disabled}
                      checked={val === c}
                      onChange={() => onChange(idx, c)}
                    />
                  </label>
                ))}
              </div>
            ) : type === "true_false" ? (
              <div className="flex gap-3 justify-end">
                {["true", "false"].map((opt) => (
                  <label key={opt} className="flex items-center gap-1 text-white cursor-pointer">
                    <span>{opt === "true" ? "נכון" : "לא נכון"}</span>
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      disabled={disabled}
                      checked={val === opt}
                      onChange={() => onChange(idx, opt)}
                    />
                  </label>
                ))}
              </div>
            ) : type === "numeric" ? (
              <input
                type="number"
                disabled={disabled}
                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
                value={val}
                onChange={(e) => onChange(idx, e.target.value)}
              />
            ) : (
              <textarea
                disabled={disabled}
                rows={type === "free_text" ? 4 : 2}
                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
                value={val}
                onChange={(e) => onChange(idx, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
