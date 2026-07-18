import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { formatGradeLevelHe } from "../../lib/learning-student-defaults.js";
import { PLAY_LIMIT_MS } from "../../lib/demo/demo-mode.client.js";
import { useDemoMode } from "./DemoModeContext.jsx";

const GRADE_OPTIONS = ["g1", "g2", "g3", "g4", "g5", "g6"];

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function DemoModeBar() {
  const router = useRouter();
  const { session, playExpired, remainingMs, changeGrade, exitDemo } = useDemoMode();
  const [gradeOpen, setGradeOpen] = useState(false);

  const gradeLabel = useMemo(
    () => formatGradeLevelHe(session?.gradeLevel || "g3"),
    [session?.gradeLevel],
  );

  if (!session) return null;

  const handleGradePick = (grade) => {
    changeGrade(grade);
    setGradeOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("leokids:demo-grade-changed", { detail: { gradeLevel: grade } }),
      );
    }
  };

  const handleExit = () => {
    exitDemo();
    router.push("/");
  };

  return (
    <div
      className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50/95 px-3 py-2 text-sm backdrop-blur dark:border-amber-800 dark:bg-amber-950/90"
      dir="rtl"
      lang="he"
      data-testid="demo-mode-bar"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-50">
            מצב הדגמה
          </span>
          <span className="text-amber-900 dark:text-amber-100">
            כיתה: <strong>{gradeLabel}</strong>
          </span>
          <span className="text-amber-800 dark:text-amber-200">
            {playExpired ? (
              <strong>הזמן להתחלות חדשות הסתיים</strong>
            ) : (
              <>
                זמן משחק: <strong>{formatRemaining(remainingMs)}</strong> / {PLAY_LIMIT_MS / 60000} דק׳
              </>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setGradeOpen((v) => !v)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-50"
            >
              שינוי כיתה
            </button>
            {gradeOpen ? (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[8rem] rounded-lg border border-amber-200 bg-white py-1 shadow-lg dark:border-amber-700 dark:bg-slate-900">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGradePick(g)}
                    className="block w-full px-3 py-1.5 text-right text-xs hover:bg-amber-50 dark:hover:bg-slate-800"
                  >
                    {formatGradeLevelHe(g)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-900 dark:bg-slate-600"
          >
            יציאה מהדגמה
          </button>
        </div>
      </div>
    </div>
  );
}
