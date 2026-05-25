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

export async function getServerSideProps(context) {
  return {
    props: {
      classId: String(context.params?.classId || ""),
      activityId: String(context.params?.activityId || ""),
    },
  };
}

function exportReportCsv(data) {
  const lines = ["student,status,answers,correct,score_pct"];
  for (const s of data?.students || []) {
    lines.push(
      [
        s.studentFullNameMasked,
        s.status,
        s.answersCount,
        s.correctCount,
        s.scorePct ?? "",
      ].join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-report-${data?.activity?.activityId || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TeacherActivityReportPage({ classId, activityId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const token = await resolveTeacherAccessToken(supabase);
      if (!token) {
        router.replace("/teacher/login");
        return;
      }
      const res = await teacherAuthFetch(
        token,
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
            <button
              type="button"
              onClick={() => exportReportCsv(data)}
              className="mb-4 px-3 py-1.5 rounded-lg border border-white/20 text-sm hover:bg-white/10"
            >
              ייצוא CSV
            </button>
          </>
        ) : null}

        {data?.weakSkills?.length ? (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
            <h2 className="font-semibold mb-2">מיומנויות חלשות</h2>
            <ul className="text-sm space-y-1">
              {data.weakSkills.map((w) => (
                <li key={w.skillKey}>
                  {w.skillKey}: {w.accuracyPct}% ({w.correct}/{w.answers})
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
                  <th className="px-3 py-2">תלמיד</th>
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
                      <td className="px-3 py-2 tabular-nums">{s.scorePct ?? "—"}%</td>
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
