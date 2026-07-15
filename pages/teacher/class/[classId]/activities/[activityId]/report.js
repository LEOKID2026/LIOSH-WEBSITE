import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../../../components/Layout";
import TeacherPortalShell from "../../../../../../components/teacher-portal/TeacherPortalShell";
import TeacherClassActivitiesNav from "../../../../../../components/teacher-portal/TeacherClassActivitiesNav";
import { getLearningSupabaseBrowserClient } from "../../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../../lib/teacher-portal/teacher-ui.he.js";
import {
  activityModeLabelHe,
  studentActivityStatusLabelHe,
} from "../../../../../../lib/classroom-activities/classroom-activities-labels.client.js";
import {
  downloadActivityReportCsv,
  downloadEnrichedActivityReportXlsx,
} from "../../../../../../lib/teacher-portal/teacher-activity-report-export.js";

export async function getServerSideProps(context) {
  return {
    props: {
      classId: String(context.params?.classId || ""),
      activityId: String(context.params?.activityId || ""),
    },
  };
}

export default function TeacherActivityReportPage({ classId, activityId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const fetchEnrichedExportPayload = useCallback(async () => {
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveTeacherAccessToken(supabase);
    if (!session.ok) {
      router.replace("/teacher/login");
      return null;
    }
    const res = await teacherAuthFetch(
      session.token,
      `/api/teacher/activities/${encodeURIComponent(activityId)}/report-export`
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error?.message || body?.error?.code || "שגיאת ייצוא");
      return null;
    }
    return body.data;
  }, [activityId, router]);

  const handleExportXlsx = useCallback(async () => {
    if (exportingXlsx) return;
    setExportingXlsx(true);
    setError("");
    try {
      const data = await fetchEnrichedExportPayload();
      if (data) downloadEnrichedActivityReportXlsx(data);
    } catch {
      setError("שגיאת ייצוא");
    } finally {
      setExportingXlsx(false);
    }
  }, [exportingXlsx, fetchEnrichedExportPayload]);

  const load = useCallback(async () => {
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/activities/${encodeURIComponent(activityId)}/report`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message || body?.error?.code || "טעינה נכשלה");
        return;
      }
      setData(body.data);
    } catch {
      setError("שגיאת רשת");
    }
  }, [activityId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;

  return (
    <Layout>
      <TeacherPortalShell
        title={data?.activity?.title ? `דוח: ${data.activity.title}` : "דוח פעילות"}
        backHref={`/teacher/class/${classId}/activities`}
      >
        <TeacherClassActivitiesNav classId={classId} />

        {error ? <p className="text-red-200 text-sm mb-4">{error}</p> : null}

        {data?.activity ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4 text-sm text-white/70">
              <span>{activityModeLabelHe(data.activity.mode)}</span>
              {summary ? (
                <>
                  <span>· השלמה: {summary.completionRate}%</span>
                  <span>· דיוק כיתה: {summary.classAccuracy}%</span>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={exportingXlsx}
                onClick={handleExportXlsx}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                ייצוא Excel
              </button>
              <button
                type="button"
                onClick={() => downloadActivityReportCsv(data)}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-sm hover:bg-white/10"
              >
                ייצוא CSV
              </button>
            </div>
          </>
        ) : null}

        {data?.weakSkills?.length ? (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
            <h2 className="font-semibold mb-2">מיומנויות חלשות</h2>
            <ul className="text-sm space-y-1">
              {data.weakSkills.map((w) => (
                <li key={w.skillKey}>
                  {w.skillLabelHe || "מיומנות לתרגול"}: {w.accuracyPct}% ({w.correct}/{w.answers})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data?.students?.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-right">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-3 py-2">ילד/ה</th>
                  <th className="px-3 py-2">סטטוס</th>
                  <th className="px-3 py-2">ציון</th>
                  <th className="px-3 py-2">נכונות</th>
                </tr>
              </thead>
              <tbody>
                {[...data.students]
                  .sort((a, b) => (b.scorePct ?? 0) - (a.scorePct ?? 0))
                  .map((s) => (
                    <tr key={s.studentId} className="border-t border-white/10">
                      <td className="px-3 py-2">{s.studentFullNameMasked}</td>
                      <td className="px-3 py-2">{studentActivityStatusLabelHe(s.status)}</td>
                      <td className="px-3 py-2 tabular-nums">{s.scorePct ?? "-"}%</td>
                      <td className="px-3 py-2 tabular-nums">
                        {s.correctCount}/{data.activity.questionCount}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
