import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  activityModeLabelHe,
  isClassroomActivitiesEnabled,
  studentActivityStatusLabelHe,
} from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import {
  normalizeStudentActivityScope,
  studentActivityScopeBadgeHe,
} from "../../lib/classroom-activities/student-activity-scope-labels.client.js";
import { personalActivitiesSectionTitleHe } from "../../lib/teacher-portal/teacher-ui.he.js";

function ActivityCard({ a, scopeBadge = null }) {
  const href = `/student/activity/${encodeURIComponent(a.activityId)}`;
  const cta =
    a.studentStatus === "submitted"
      ? "צפייה בתוצאה"
      : a.studentStatus === "in_progress"
        ? "המשך"
        : "התחל";

  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <h3 className="font-bold text-white">{a.title}</h3>
          {scopeBadge ? (
            <span className="text-[10px] tracking-wide rounded px-1.5 py-0.5 bg-violet-500/30 text-violet-100 border border-violet-400/40">
              {scopeBadge}
            </span>
          ) : null}
        </div>
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
}

/**
 * @param {{ activities?: Array<Record<string, unknown>>|null, activitiesLoaded?: boolean }} props
 * When `activities` is passed from student home, the panel reuses that fetch (avoids duplicate/empty modal).
 */
export default function StudentClassroomActivitiesPanel({
  activities: activitiesProp = null,
  activitiesLoaded: activitiesLoadedProp = false,
}) {
  const useParentActivities = activitiesProp != null;
  const [activities, setActivities] = useState(() =>
    useParentActivities ? activitiesProp : []
  );
  const [loaded, setLoaded] = useState(
    useParentActivities ? Boolean(activitiesLoadedProp) : false
  );

  const load = useCallback(async () => {
    if (!isClassroomActivitiesEnabled()) {
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch("/api/student/activities", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
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
    if (useParentActivities) {
      setActivities(activitiesProp);
      setLoaded(Boolean(activitiesLoadedProp));
      return undefined;
    }
    void load();
    return undefined;
  }, [activitiesProp, activitiesLoadedProp, useParentActivities, load]);

  if (!isClassroomActivitiesEnabled()) {
    return null;
  }

  if (!loaded) {
    return null;
  }

  if (activities.length === 0) {
    return null;
  }

  const personalSectionTitle = personalActivitiesSectionTitleHe();
  const classActivities = activities.filter(
    (a) => normalizeStudentActivityScope(a.scope) === "class"
  );
  const teacherPersonalActivities = activities.filter(
    (a) => normalizeStudentActivityScope(a.scope) === "student"
  );
  const parentActivities = activities.filter(
    (a) => normalizeStudentActivityScope(a.scope) === "parent"
  );

  return (
    <>
      {classActivities.length > 0 ? (
        <section className="rounded-3xl border border-cyan-500/25 bg-cyan-950/20 p-5 md:p-7 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">
            פעילויות כיתה
          </h2>
          <div className="grid gap-3">
            {classActivities.map((a) => (
              <ActivityCard key={a.activityId} a={a} />
            ))}
          </div>
        </section>
      ) : null}

      {teacherPersonalActivities.length > 0 ? (
        <section
          className="rounded-3xl border border-violet-500/25 bg-violet-950/20 p-5 md:p-7 mb-6"
          data-testid="student-personal-activities"
        >
          <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">
            {personalSectionTitle}
          </h2>
          <div className="grid gap-3">
            {teacherPersonalActivities.map((a) => (
              <ActivityCard
                key={a.activityId}
                a={a}
                scopeBadge={studentActivityScopeBadgeHe("student")}
              />
            ))}
          </div>
        </section>
      ) : null}

      {parentActivities.length > 0 ? (
        <section
          className="rounded-3xl border border-emerald-500/25 bg-emerald-950/20 p-5 md:p-7"
          data-testid="student-parent-activities"
        >
          <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-right">
            פעילות אישית
          </h2>
          <div className="grid gap-3">
            {parentActivities.map((a) => (
              <ActivityCard
                key={a.activityId}
                a={a}
                scopeBadge={studentActivityScopeBadgeHe("parent")}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
