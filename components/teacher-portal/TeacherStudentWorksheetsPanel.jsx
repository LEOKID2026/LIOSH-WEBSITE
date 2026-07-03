import { useCallback, useEffect, useState } from "react";
import {
  worksheetGradingStatusLabelHe,
  worksheetModeLabelHe,
} from "../../lib/worksheet-activities/worksheet-labels.client.js";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

/**
 * @param {{ accessToken: string, studentId: string }} props
 */
export default function TeacherStudentWorksheetsPanel({ accessToken, studentId }) {
  const [worksheets, setWorksheets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !studentId) return;
    try {
      const res = await teacherAuthFetch(
        accessToken,
        `/api/teacher/students/${encodeURIComponent(studentId)}/worksheets`
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setWorksheets(body?.data?.worksheets || []);
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoaded(true);
    }
  }, [accessToken, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || worksheets.length === 0) return null;

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-5 mb-6 text-right">
      <h2 className="text-lg font-bold text-white mb-3">דפי עבודה (פעילות מורה)</h2>
      <p className="text-xs text-white/50 mb-3">פעילויות מורה מוצגות בדוח נפרד ואינן מתערבבות עם התרגול האוטומטי.</p>
      <ul className="space-y-2">
        {worksheets.map((w) => {
          const st = w.studentStatus?.gradingStatus || "not_submitted";
          return (
            <li
              key={w.worksheetId}
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <span className="text-white font-medium">{w.title}</span>
              <span className="text-white/65">
                {worksheetModeLabelHe(w.worksheetMode)} · {worksheetGradingStatusLabelHe(st)}
                {w.displayScore != null ? ` · ${w.displayScore}%` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
