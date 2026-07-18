import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import PageSeo from "../../components/seo/PageSeo";
import { formatGradeLevelHe } from "../../lib/learning-student-defaults.js";
import {
  createDemoSession,
  hasDemoSession,
  readDemoSession,
  updateDemoGrade,
  PLAY_LIMIT_MS,
} from "../../lib/demo/demo-mode.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

const GRADE_OPTIONS = ["g1", "g2", "g3", "g4", "g5", "g6"];

export default function DemoEnterPage() {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const [selected, setSelected] = useState("g3");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = readDemoSession();
    if (existing?.gradeLevel) {
      setSelected(existing.gradeLevel);
    }
  }, []);

  const enterDemo = useCallback(
    async (gradeLevel) => {
      setBusy(true);
      try {
        const grade = String(gradeLevel || selected).trim().toLowerCase();
        if (hasDemoSession()) {
          updateDemoGrade(grade);
        } else {
          createDemoSession(grade);
        }
        await router.replace("/student/home");
      } finally {
        setBusy(false);
      }
    },
    [router, selected],
  );

  useEffect(() => {
    if (!router.isReady) return;
    const q = String(router.query.grade || router.query.gradeLevel || "").trim();
    if (q && GRADE_OPTIONS.includes(q.toLowerCase())) {
      void enterDemo(q.toLowerCase());
    }
  }, [router.isReady, router.query, enterDemo]);

  return (
    <Layout homepage studentTheme={theme} studentShell="home">
      <PageSeo
        title="מצב הדגמה — LEO KIDS"
        description="נסו את עולם הילד ללא הרשמה"
        canonicalPath="/demo/enter"
        noindex
      />
      <div
        className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-12"
        dir="rtl"
        lang="he"
        data-testid="demo-enter-page"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">מצב הדגמה להורים</h1>
        <p className="text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          בחרו כיתה וגלו את עולם הילד. {PLAY_LIMIT_MS / 60000} דקות משחק ולמידה - ללא הרשמה.
        </p>
        {hasDemoSession() ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            יש לכם הדגמה פעילה — שינוי כיתה לא יאפס את הטיימר.
          </p>
        ) : null}
        <fieldset className="w-full space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            בחרו כיתה
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GRADE_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelected(g)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  selected === g
                    ? "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {formatGradeLevelHe(g)}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          disabled={busy}
          onClick={() => void enterDemo(selected)}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-base font-bold text-white shadow disabled:opacity-60"
        >
          {busy ? "נכנסים..." : "כניסה לעולם הילד"}
        </button>
      </div>
    </Layout>
  );
}
