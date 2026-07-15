import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  worksheetGradingStatusLabelHe,
  worksheetModeLabelHe,
} from "../../lib/worksheet-activities/worksheet-labels.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

export default function StudentWorksheetsPanel({ emptyFallback = null }) {
  const { tokens: T } = useStudentTheme();
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

  if (!loaded) {
    return <p className={T.emptyText}>טוען דפי עבודה...</p>;
  }

  if (worksheets.length === 0) {
    return emptyFallback;
  }

  return (
    <section className={T.worksheetSection}>
      <p className={T.panelIntro}>
        דפי עבודה שהוקצו לך - פתחו כל דף, מלאו ושלחו לבדיקה.
      </p>
      <div className="grid gap-3">
        {worksheets.map((w) => {
          const st = w.studentStatus?.gradingStatus || "not_submitted";
          const href = `/student/worksheet/${encodeURIComponent(w.worksheetId)}`;
          return (
            <div key={w.worksheetId} className={T.worksheetCard}>
              <div>
                <h3 className={T.worksheetCardTitle}>{w.title}</h3>
                <p className={T.worksheetCardMeta}>
                  {worksheetModeLabelHe(w.worksheetMode)} · {worksheetGradingStatusLabelHe(st)}
                  {w.displayScore != null ? ` · ציון: ${w.displayScore}%` : ""}
                </p>
              </div>
              <Link href={href} className={T.worksheetCardCta}>
                פתיחה
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
