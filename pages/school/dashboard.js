import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import SchoolPortalShell from "../../components/school-portal/SchoolPortalShell";
import { useSchoolPortalLoad } from "../../lib/school-portal/use-school-portal-session";
import { schoolAuthFetch } from "../../lib/school-portal/school-ui.he";
import {
  SCHOOL_DASHBOARD_TITLE,
  SCHOOL_LOAD_ERROR,
  SCHOOL_LOADING,
  SCHOOL_STAT_ACTIVITIES,
  SCHOOL_STAT_CLASSES,
  SCHOOL_STAT_STUDENTS,
  SCHOOL_STAT_TEACHERS,
} from "../../lib/school-portal/school-ui.he";

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/25 p-4 text-right">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function SchoolDashboardPage() {
  const router = useRouter();
  const { state, accessToken, me, error, reload } = useSchoolPortalLoad();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (state === "unauthenticated") {
      router.replace("/teacher/login");
    }
    if (state === "forbidden") {
      router.replace("/teacher/dashboard");
    }
  }, [state, router]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    (async () => {
      const [dashRes, actRes] = await Promise.all([
        schoolAuthFetch(accessToken, "/api/school/dashboard"),
        schoolAuthFetch(accessToken, "/api/school/activities?limit=10"),
      ]);
      const dashBody = await dashRes.json().catch(() => ({}));
      const actBody = await actRes.json().catch(() => ({}));
      if (dashRes.status === 200) setStats(dashBody.data?.stats);
      if (actRes.status === 200) setActivities(actBody.data?.activities || []);
    })();
  }, [state, accessToken]);

  const schoolName = me?.school?.name;

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_DASHBOARD_TITLE}
        schoolName={schoolName}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : error ? (
          <p className="text-red-300 text-sm" role="alert">
            {error || SCHOOL_LOAD_ERROR}
          </p>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={SCHOOL_STAT_TEACHERS} value={stats?.teacherCount ?? "—"} />
              <StatCard label={SCHOOL_STAT_STUDENTS} value={stats?.enrolledStudentCount ?? "—"} />
              <StatCard label={SCHOOL_STAT_CLASSES} value={stats?.activeClassCount ?? "—"} />
              <StatCard label={SCHOOL_STAT_ACTIVITIES} value={stats?.activeActivityCount ?? "—"} />
            </div>
            <section>
              <h2 className="font-semibold mb-3 text-right">פעילויות אחרונות</h2>
              {activities.length ? (
                <ul className="space-y-2 text-sm text-right">
                  {activities.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <span className="font-medium">{a.title}</span>
                      <span className="text-white/50 mr-2">
                        {a.subject} · {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/50 text-sm">אין פעילויות להצגה.</p>
              )}
            </section>
            <button
              type="button"
              onClick={() => void reload()}
              className="text-sm text-amber-300 hover:underline"
            >
              רענון
            </button>
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
