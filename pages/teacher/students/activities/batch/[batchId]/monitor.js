import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../../../components/Layout";
import TeacherPortalShell from "../../../../../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../../lib/teacher-portal/teacher-ui.he.js";
import {
  activityModeLabelHe,
  studentActivityStatusLabelHe,
} from "../../../../../../lib/classroom-activities/classroom-activities-labels.client.js";

export async function getServerSideProps(context) {
  return {
    props: {
      batchId: String(context.params?.batchId || ""),
    },
  };
}

export default function TeacherPrivateStudentsBatchMonitorPage({ batchId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) { router.replace("/teacher/login"); return; }
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/student-activities/batch/${encodeURIComponent(batchId)}`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message || body?.error?.code || "טעינה נכשלה");
        return;
      }
      setData(body.data);
      setError("");
    } catch {
      setError("שגיאת רשת");
    }
  }, [batchId, router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const activity = data?.activity;
  const summary = data?.summary;
  const roster = data?.roster || [];

  return (
    <Layout>
      <TeacherPortalShell
        title={activity?.title ? `מעקב: ${activity.title}` : "מעקב פעילות - ילדים פרטיים"}
        backHref="/teacher/dashboard"
      >
        {error ? (
          <p className="text-red-200 text-sm mb-4">{error}</p>
        ) : null}

        {activity ? (
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="px-2 py-1 rounded bg-white/10">
              {activityModeLabelHe(activity.mode)}
            </span>
            <span className="px-2 py-1 rounded bg-white/10">{activity.subject}</span>
            <span className="px-2 py-1 rounded bg-white/10">{activity.topic}</span>
          </div>
        ) : null}

        {summary ? (
          <p className="text-white/70 text-sm mb-4 tabular-nums">
            לא התחילו: {summary.notStartedCount} · בתהליך: {summary.inProgressCount} ·
            הגישו: {summary.submittedCount} / {summary.rosterCount}
          </p>
        ) : null}

        {roster.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/10 mb-6">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-3 py-2">ילד/ה</th>
                  <th className="px-3 py-2">סטטוס</th>
                  <th className="px-3 py-2">תשובות</th>
                  <th className="px-3 py-2">נכונות</th>
                  <th className="px-3 py-2">דוח</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.activityId} className="border-t border-white/10">
                    <td className="px-3 py-2">{s.studentFullNameMasked}</td>
                    <td className="px-3 py-2">{studentActivityStatusLabelHe(s.status)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.answersCount}/{activity?.questionCount ?? "-"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.answersCount > 0
                        ? `${Math.round((s.correctCount / s.answersCount) * 100)}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/api/teacher/student-activities/${encodeURIComponent(s.activityId)}/report`}
                        className="text-amber-200/90 hover:text-amber-100 text-sm underline-offset-2 hover:underline"
                      >
                        דוח
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error && !data ? (
          <p className="text-white/50 text-sm">טוען…</p>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
