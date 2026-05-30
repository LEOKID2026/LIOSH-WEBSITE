import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import SchoolPortalShell from "../../components/school-portal/SchoolPortalShell";
import SchoolClassManagementPanel from "../../components/school-portal/SchoolClassManagementPanel";
import {
  SchoolActivityRow,
  SchoolAlertBanner,
  SchoolEmptyState,
  SchoolQuickActionCard,
  SchoolSection,
  SchoolStatCard,
} from "../../components/school-portal/SchoolPortalUi";
import { SchoolErrorBlock, SchoolLoadingBlock } from "../../components/school-portal/SchoolDrillDown";
import { useSchoolPortalLoad } from "../../lib/school-portal/use-school-portal-session";
import {
  fetchSchoolJsonSWR,
  readSchoolCache,
  SCHOOL_CACHE_TTL_MS,
} from "../../lib/school-portal/school-portal-cache";
import {
  SC_COUNTER_IMPORTANT_ACTIVE,
  SC_COUNTER_UNREAD_PARENTS,
  SC_COUNTER_UNREAD_TEACHERS,
} from "../../lib/school-portal/school-communication.he";
import {
  schoolAuthFetch,
  SCHOOL_ALERT_ACTIVE_ACTIVITIES,
  SCHOOL_ALERT_FEW_TEACHERS,
  SCHOOL_ALERT_NO_STUDENTS,
  SCHOOL_DASHBOARD_SUBTITLE,
  SCHOOL_DASHBOARD_TITLE,
  SCHOOL_EMPTY_ACTIVITIES,
  SCHOOL_EMPTY_ACTIVITIES_HINT,
  SCHOOL_LOAD_ERROR,
  SCHOOL_LOADING,
  SCHOOL_QUICK_ACTIVITIES,
  SCHOOL_QUICK_ACTIVITIES_DESC,
  SCHOOL_QUICK_CLASSES,
  SCHOOL_QUICK_CLASSES_DESC,
  SCHOOL_QUICK_STUDENTS,
  SCHOOL_QUICK_STUDENTS_DESC,
  SCHOOL_QUICK_TEACHERS,
  SCHOOL_QUICK_TEACHERS_DESC,
  SCHOOL_REFRESH,
  SCHOOL_SECTION_ALERTS,
  SCHOOL_SECTION_QUICK,
  SCHOOL_SECTION_RECENT,
  SCHOOL_STAT_ACTIVITIES,
  SCHOOL_STAT_CLASSES,
  SCHOOL_STAT_STUDENTS,
  SCHOOL_STAT_TEACHERS,
} from "../../lib/school-portal/school-ui.he";

export default function SchoolDashboardPage() {
  const router = useRouter();
  const { state, accessToken, me, schoolId, error, reload } = useSchoolPortalLoad();
  const [stats, setStats] = useState(me?.stats || null);
  const [activities, setActivities] = useState([]);
  const [dataLoading, setDataLoading] = useState(!me?.stats);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "pending") router.replace("/school/pending");
    if (state === "ready" && me?.portalRole === "school_operator") {
      router.replace("/school/operator/dashboard");
    }
  }, [state, me, router]);

  useEffect(() => {
    if (me?.stats) setStats(me.stats);
  }, [me?.stats]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    let cancelled = false;

    const actPath = "/api/school/activities?limit=12";
    const actCached = schoolId ? readSchoolCache(schoolId, actPath) : null;
    if (actCached?.data?.data?.activities) {
      setActivities(actCached.data.data.activities);
      setDataLoading(false);
    } else if (!me?.stats) {
      setDataLoading(true);
    } else {
      setDataLoading(false);
    }

    (async () => {
      const actResult = await fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path: actPath,
        ttlMs: SCHOOL_CACHE_TTL_MS.activities,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          if (!cancelled && updated.status === 200) {
            setActivities(updated.body?.data?.activities || []);
          }
        },
      });
      if (cancelled) return;
      if (actResult?.status === 200) {
        setActivities(actResult.body?.data?.activities || []);
      }
      setDataLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [state, accessToken, schoolId, me?.stats]);

  const alerts = useMemo(() => {
    const items = [];
    if (stats && (stats.studentCount ?? stats.enrolledStudentCount ?? 0) === 0) {
      items.push(SCHOOL_ALERT_NO_STUDENTS);
    }
    if (stats && (stats.teacherCount ?? 0) === 0) {
      items.push(SCHOOL_ALERT_FEW_TEACHERS);
    }
    if (stats && (stats.activeActivityCount ?? 0) > 0) {
      items.push(SCHOOL_ALERT_ACTIVE_ACTIVITIES);
    }
    return items;
  }, [stats]);

  const schoolName = me?.school?.name;

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_DASHBOARD_TITLE}
        subtitle={SCHOOL_DASHBOARD_SUBTITLE}
        schoolName={schoolName}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" || dataLoading ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : error ? (
          <SchoolErrorBlock message={error || SCHOOL_LOAD_ERROR} onRetry={() => void reload()} />
        ) : (
          <div className="space-y-6 lg:space-y-8">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <SchoolStatCard
                label={SC_COUNTER_UNREAD_PARENTS}
                value={stats?.unreadParentMessageCount ?? 0}
                accent="violet"
              />
              <SchoolStatCard
                label={SC_COUNTER_UNREAD_TEACHERS}
                value={stats?.unreadTeacherMessageCount ?? 0}
                accent="violet"
              />
              <SchoolStatCard
                label={SC_COUNTER_IMPORTANT_ACTIVE}
                value={stats?.importantActiveMessageCount ?? 0}
                accent="amber"
              />
              <SchoolStatCard label={SCHOOL_STAT_TEACHERS} value={stats?.teacherCount ?? 0} accent="amber" />
              <SchoolStatCard
                label={SCHOOL_STAT_STUDENTS}
                value={stats?.studentCount ?? stats?.enrolledStudentCount ?? 0}
                accent="emerald"
              />
              <SchoolStatCard label={SCHOOL_STAT_CLASSES} value={stats?.activeClassCount ?? 0} accent="sky" />
              <SchoolStatCard
                label={SCHOOL_STAT_ACTIVITIES}
                value={stats?.activeActivityCount ?? 0}
                accent="violet"
              />
            </div>

            {alerts.length ? (
              <SchoolSection title={SCHOOL_SECTION_ALERTS}>
                <ul className="space-y-2">
                  {alerts.map((text) => (
                    <li key={text}>
                      <SchoolAlertBanner>{text}</SchoolAlertBanner>
                    </li>
                  ))}
                </ul>
              </SchoolSection>
            ) : null}

            <SchoolSection title={SCHOOL_SECTION_QUICK}>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <SchoolQuickActionCard
                  href="/school/teachers"
                  title={SCHOOL_QUICK_TEACHERS}
                  description={SCHOOL_QUICK_TEACHERS_DESC}
                  icon="👩‍🏫"
                />
                <SchoolQuickActionCard
                  href="/school/classes"
                  title={SCHOOL_QUICK_CLASSES}
                  description={SCHOOL_QUICK_CLASSES_DESC}
                  icon="📚"
                />
                <SchoolQuickActionCard
                  href="/school/students"
                  title={SCHOOL_QUICK_STUDENTS}
                  description={SCHOOL_QUICK_STUDENTS_DESC}
                  icon="🎒"
                />
                <SchoolQuickActionCard
                  href="/school/dashboard#activities"
                  title={SCHOOL_QUICK_ACTIVITIES}
                  description={SCHOOL_QUICK_ACTIVITIES_DESC}
                  icon="📋"
                />
              </div>
            </SchoolSection>

            {me?.portalRole === "school_manager" && accessToken ? (
              <SchoolClassManagementPanel accessToken={accessToken} />
            ) : null}

            <div id="activities">
              <SchoolSection
                title={SCHOOL_SECTION_RECENT}
                action={
                  <button
                    type="button"
                    onClick={() => void reload()}
                    className="text-sm text-amber-300 hover:underline"
                  >
                    {SCHOOL_REFRESH}
                  </button>
                }
              >
                {activities.length ? (
                  <ul className="space-y-2">
                    {activities.map((a) => (
                      <SchoolActivityRow key={a.id} activity={a} />
                    ))}
                  </ul>
                ) : (
                  <SchoolEmptyState title={SCHOOL_EMPTY_ACTIVITIES} hint={SCHOOL_EMPTY_ACTIVITIES_HINT} />
                )}
              </SchoolSection>
            </div>
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
