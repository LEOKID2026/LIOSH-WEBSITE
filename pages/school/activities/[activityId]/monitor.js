import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import SchoolPortalShell from "../../../../components/school-portal/SchoolPortalShell";
import TeacherActivityStudentAnswersModal from "../../../../components/teacher-portal/TeacherActivityStudentAnswersModal.jsx";
import { studentActivityStatusLabelHe } from "../../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { useSchoolPortalLoad } from "../../../../lib/school-portal/use-school-portal-session";
import { schoolAuthFetch } from "../../../../lib/school-portal/school-ui.he";

export async function getServerSideProps(context) {
  return {
    props: {
      activityId: String(context.params?.activityId || ""),
    },
  };
}

export default function SchoolActivityMonitorPage({ activityId }) {
  const router = useRouter();
  const { state, accessToken } = useSchoolPortalLoad();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [answersStudent, setAnswersStudent] = useState(null);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "pending") router.replace("/school/pending");
    if (state === "ready" && accessToken) {
      /* loaded below */
    }
  }, [state, accessToken, router]);

  const load = useCallback(async () => {
    if (!accessToken || !activityId) return;
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/activities/${encodeURIComponent(activityId)}/monitor`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message || body?.error?.code || "טעינה נכשלה");
        setData(null);
        return;
      }
      setData(body.data);
      setError("");
    } catch {
      setError("שגיאת רשת");
    }
  }, [accessToken, activityId]);

  useEffect(() => {
    if (state === "ready" && accessToken) {
      void load();
    }
  }, [state, accessToken, load]);

  const activity = data?.activity;
  const students = Array.isArray(data?.students) ? data.students : [];

  return (
    <Layout title="מעקב פעילות">
      <SchoolPortalShell title="מעקב פעילות">
        <div className="space-y-4 text-right">
          <Link href="/school/dashboard#activities" className="text-sm text-amber-300 hover:underline">
            ← חזרה לפעילויות
          </Link>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}

          {activity ? (
            <div className="rounded-lg border border-white/10 bg-black/25 p-4 space-y-1">
              <h1 className="text-lg font-semibold text-white">{activity.title}</h1>
              <p className="text-sm text-white/70">
                ילדים: {students.length} · שאלות: {activity.questionCount ?? "-"}
              </p>
              {data?.summary?.classAccuracy != null ? (
                <p className="text-sm text-white/70">
                  דיוק כיתתי: {data.summary.classAccuracy}%
                </p>
              ) : null}
            </div>
          ) : null}

          {students.length ? (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[640px] text-sm text-right">
                <thead className="bg-white/5 text-white/70">
                  <tr>
                    <th className="px-3 py-2">ילד/ה</th>
                    <th className="px-3 py-2">סטטוס</th>
                    <th className="px-3 py-2">תשובות</th>
                    <th className="px-3 py-2">נכונות</th>
                    <th className="px-3 py-2">פירוט</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.studentId} className="border-t border-white/10">
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
                        <button
                          type="button"
                          className="text-amber-200/90 hover:text-amber-100 text-sm underline-offset-2 hover:underline"
                          data-testid="school-view-student-answers"
                          onClick={() => setAnswersStudent(s)}
                        >
                          צפה בתשובות
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <TeacherActivityStudentAnswersModal
          open={Boolean(answersStudent)}
          onClose={() => setAnswersStudent(null)}
          accessToken={accessToken}
          activityId={activityId}
          student={answersStudent}
          activityTitle={activity?.title}
          authFetch={schoolAuthFetch}
          answersApiPath={
            answersStudent
              ? `/api/school/activities/${encodeURIComponent(activityId)}/students/${encodeURIComponent(answersStudent.studentId)}/answers`
              : undefined
          }
        />
      </SchoolPortalShell>
    </Layout>
  );
}
