import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  worksheetGradingStatusLabelHe,
  worksheetModeLabelHe,
} from "../../lib/worksheet-activities/worksheet-labels.client.js";

export default function StudentWorksheetsPanel() {
  const [worksheets, setWorksheets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/student/worksheet-activities", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok === true) {
        setWorksheets(Array.isArray(json.worksheets) ? json.worksheets : []);
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || worksheets.length === 0) return null;

  return (
    <section className="rounded-3xl border border-violet-500/25 bg-violet-950/20 p-5 md:p-7 mb-6">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">דפי עבודה</h2>
      <div className="grid gap-3">
        {worksheets.map((w) => {
          const st = w.studentStatus?.gradingStatus || "not_submitted";
          const href = `/student/worksheet/${encodeURIComponent(w.worksheetId)}`;
          return (
            <div
              key={w.worksheetId}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right"
            >
              <div>
                <h3 className="font-bold text-white">{w.title}</h3>
                <p className="text-sm text-white/65 mt-1">
                  {worksheetModeLabelHe(w.worksheetMode)} · {worksheetGradingStatusLabelHe(st)}
                  {w.displayScore != null ? ` · ציון: ${w.displayScore}%` : ""}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex justify-center rounded-xl bg-violet-500/90 hover:bg-violet-400 text-black font-bold py-2.5 px-5 text-sm shrink-0"
              >
                פתיחה
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
