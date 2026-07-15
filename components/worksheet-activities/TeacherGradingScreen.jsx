import { useState } from "react";
import { worksheetQuestionTypeLabelHe } from "../../lib/worksheet-activities/worksheet-labels.client.js";

/**
 * @param {{ questions: Array<Record<string, unknown>>, answers: Array<Record<string, unknown>>, busy?: boolean, onSave: (grades: Array<Record<string, unknown>>, markChecked: boolean) => void, onPublish: () => void }} props
 */
export default function TeacherGradingScreen({ questions, answers, busy, onSave, onPublish }) {
  /** @type {Record<number, { teacherScore: string, teacherComment: string, teacherOverride: boolean }>} */
  const [draft, setDraft] = useState(() => {
    const init = {};
    for (const a of answers) {
      init[Number(a.questionIndex)] = {
        teacherScore: a.teacherScore != null ? String(a.teacherScore) : "",
        teacherComment: a.teacherComment || "",
        teacherOverride: a.teacherOverride === true,
      };
    }
    return init;
  });

  const buildGrades = () =>
    questions.map((q) => {
      const idx = Number(q.questionIndex);
      const d = draft[idx] || {};
      return {
        questionIndex: idx,
        teacherScore: d.teacherScore !== "" ? Number(d.teacherScore) : null,
        teacherComment: d.teacherComment || null,
        teacherOverride: d.teacherOverride,
      };
    });

  return (
    <div className="space-y-4 text-right">
      {questions.map((q) => {
        const idx = Number(q.questionIndex);
        const ans = answers.find((a) => Number(a.questionIndex) === idx);
        const d = draft[idx] || { teacherScore: "", teacherComment: "", teacherOverride: false };
        const pts = q.points ?? 1;

        return (
          <div key={idx} className="rounded-xl border border-white/10 p-4 bg-black/25">
            <p className="font-semibold text-white">
              שאלה {idx} ({worksheetQuestionTypeLabelHe(q.questionType)} - {pts} נק')
            </p>
            <p className="text-sm text-white/70 mt-2">
              תשובת הילד/ה:{" "}
              <span className="text-white">{formatAnswer(ans?.answerValue)}</span>
            </p>
            {ans?.autoIsCorrect != null ? (
              <p className="text-sm text-cyan-200/90 mt-1">
                תוצאה אוטומטית: {ans.autoIsCorrect ? "נכון" : "לא נכון"}
              </p>
            ) : (
              <p className="text-sm text-white/50 mt-1">תוצאה אוטומטית: - (ידני בלבד)</p>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                ציון מורה
                <input
                  type="number"
                  min={0}
                  max={pts}
                  step={0.5}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                  value={d.teacherScore}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [idx]: { ...d, teacherScore: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="text-sm text-white/70 flex items-end gap-2">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={d.teacherOverride}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [idx]: { ...d, teacherOverride: e.target.checked },
                    }))
                  }
                />
                עקוף תוצאה אוטומטית
              </label>
            </div>
            <label className="block text-sm text-white/70 mt-2">
              הערת מורה
              <input
                disabled={busy}
                className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-2 text-white"
                value={d.teacherComment}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    [idx]: { ...d, teacherComment: e.target.value },
                  }))
                }
              />
            </label>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-3 justify-end pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(buildGrades(), false)}
          className="px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10"
        >
          שמור התקדמות
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(buildGrades(), true)}
          className="px-4 py-2 rounded-xl bg-cyan-600/90 text-white font-semibold hover:bg-cyan-500"
        >
          סמן כנבדק
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onPublish}
          className="px-4 py-2 rounded-xl bg-amber-500/90 text-black font-semibold hover:bg-amber-400"
        >
          פרסם לילד/ה
        </button>
      </div>
    </div>
  );
}

function formatAnswer(val) {
  if (val == null) return "-";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
