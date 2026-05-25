import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  activityModeLabelHe,
  isClassroomActivitiesEnabled,
  studentActivityStatusLabelHe,
} from "../../lib/classroom-activities/classroom-activities-labels.client.js";

export default function StudentClassroomActivitiesPanel() {
  const [activities, setActivities] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isClassroomActivitiesEnabled()) {
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch("/api/student/activities", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok === true) {
        setActivities(Array.isArray(json.activities) ? json.activities : []);
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

  if (!isClassroomActivitiesEnabled() || !loaded || activities.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-cyan-500/25 bg-cyan-950/20 p-5 md:p-7">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">פעילויות כיתה</h2>
      <div className="grid gap-3">
        {activities.map((a) => {
          const href = `/student/activity/${encodeURIComponent(a.activityId)}`;
          const cta =
            a.studentStatus === "submitted"
              ? "צפייה בתוצאה"
              : a.studentStatus === "in_progress"
                ? "המשך"
                : "התחל";
          return (
            <div
              key={a.activityId}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right"
            >
              <div>
                <h3 className="font-bold text-white">{a.title}</h3>
                <p className="text-sm text-white/65 mt-1">
                  {activityModeLabelHe(a.mode)} · {a.questionCount} שאלות ·{" "}
                  {studentActivityStatusLabelHe(a.studentStatus)}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex justify-center rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-black font-bold py-2.5 px-5 text-sm shrink-0"
              >
                {cta}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
