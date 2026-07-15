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
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

function ActivityCard({ a, scopeBadge = null }) {
  const { tokens: T } = useStudentTheme();
  const href = `/student/activity/${encodeURIComponent(a.activityId)}`;
  const cta =
    a.studentStatus === "submitted"
      ? "צפייה בתוצאה"
      : a.studentStatus === "in_progress"
        ? "המשך"
        : "התחל";

  return (
    <div className={T.activityCard}>
      <div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <h3 className={T.activityCardTitle}>{a.title}</h3>
          {scopeBadge ? (
            <span className={T.activityScopeBadge}>{scopeBadge}</span>
          ) : null}
        </div>
        <p className={T.activityCardMeta}>
          {activityModeLabelHe(a.mode)} · {a.questionCount} שאלות ·{" "}
          {studentActivityStatusLabelHe(a.studentStatus)}
        </p>
      </div>
      <Link href={href} className={T.activityCardCta}>
        {cta}
      </Link>
    </div>
  );
}

/**
 * @param {{ activities?: Array<Record<string, unknown>>|null, activitiesLoaded?: boolean, emptyFallback?: import('react').ReactNode }} props
 */
export default function StudentClassroomActivitiesPanel({
  activities: activitiesProp = null,
  activitiesLoaded: activitiesLoadedProp = false,
  emptyFallback = null,
}) {
  const { tokens: T } = useStudentTheme();
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
    return emptyFallback;
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
      <p className={T.panelIntro}>
        משימות מהמורה, מההורה או מהכיתה - לחצו "התחל" או "המשך" כדי לפתוח.
      </p>
      {classActivities.length > 0 ? (
        <section className={T.activitySection}>
          <h2 className={T.activitySectionTitle}>פעילויות כיתה</h2>
          <div className="grid gap-3">
            {classActivities.map((a) => (
              <ActivityCard key={a.activityId} a={a} />
            ))}
          </div>
        </section>
      ) : null}

      {teacherPersonalActivities.length > 0 ? (
        <section className={T.activitySection} data-testid="student-personal-activities">
          <h2 className={T.activitySectionTitle}>{personalSectionTitle}</h2>
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
          className={`${T.activitySection} border-emerald-200 bg-emerald-50/50`}
          data-testid="student-parent-activities"
        >
          <h2 className={`${T.activitySectionTitle} text-emerald-900`}>פעילות מההורים</h2>
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
