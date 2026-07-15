import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../../../../components/Layout";
import TeacherPortalShell from "../../../../../../components/teacher-portal/TeacherPortalShell";
import TeacherClassActivitiesNav from "../../../../../../components/teacher-portal/TeacherClassActivitiesNav";
import { getLearningSupabaseBrowserClient } from "../../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../../lib/teacher-portal/teacher-ui.he.js";
import {
  activityModeLabelHe,
  activityStatusLabelHe,
  studentActivityStatusLabelHe,
} from "../../../../../../lib/classroom-activities/classroom-activities-labels.client.js";
import TeacherActivityStudentAnswersModal from "../../../../../../components/teacher-portal/TeacherActivityStudentAnswersModal.jsx";

export async function getServerSideProps(context) {
  return {
    props: {
      classId: String(context.params?.classId || ""),
      activityId: String(context.params?.activityId || ""),
    },
  };
}

export default function TeacherActivityMonitorPage({ classId, activityId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [answersStudent, setAnswersStudent] = useState(null);

  const load = useCallback(async () => {
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      setAccessToken(session.token);
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/activities/${encodeURIComponent(activityId)}/monitor`
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
  }, [activityId, router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const patchStatus = async (action) => {
    setBusy(true);
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/activities/${encodeURIComponent(activityId)}/status`,
        { method: "PATCH", body: JSON.stringify({ action }) }
      );
      if (res.ok) await load();
      else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || action);
      }
    } finally {
      setBusy(false);
    }
  };

  const advanceQuestion = async () => {
    const cur = data?.activity?.currentQuestionIdx ?? 0;
    const max = (data?.activity?.questionCount ?? 1) - 1;
    const next = Math.min(max, cur + 1);
    setBusy(true);
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      await teacherAuthFetch(
        session.token,
        `/api/teacher/activities/${encodeURIComponent(activityId)}/question`,
        { method: "PATCH", body: JSON.stringify({ currentQuestionIdx: next }) }
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const activity = data?.activity;
  const summary = data?.summary;

  return (
    <Layout>
      <TeacherPortalShell
        title={activity?.title ? `מעקב: ${activity.title}` : "מעקב פעילות"}
        backHref={`/teacher/class/${classId}/activities`}
      >
        <TeacherClassActivitiesNav classId={classId} />

        {error ? <p className="text-red-200 text-sm mb-4">{error}</p> : null}

        {activity ? (
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="px-2 py-1 rounded bg-white/10">
              {activityStatusLabelHe(activity.status)}
            </span>
            <span className="px-2 py-1 rounded bg-white/10">
              {activityModeLabelHe(activity.mode)}
            </span>
            {summary ? (
              <span className="px-2 py-1 rounded bg-white/10 tabular-nums">
                דיוק כיתה: {summary.classAccuracy}%
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-6">
          {activity?.status === "draft" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => patchStatus("activate")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-sm font-medium"
            >
              הפעלה
            </button>
          ) : null}
          {activity?.status === "active" && activity?.mode === "live_lesson" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => patchStatus("pause")}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-sm"
              >
                השהיה
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={advanceQuestion}
                className="px-3 py-1.5 rounded-lg border border-amber-400/40 text-amber-200 text-sm"
              >
                שאלה הבאה
              </button>
            </>
          ) : null}
          {activity?.status === "paused" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => patchStatus("resume")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-sm"
            >
              המשך
            </button>
          ) : null}
          {activity?.status === "active" || activity?.status === "paused" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => patchStatus("close")}
              className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-sm"
            >
              סגירה
            </button>
          ) : null}
          {activity?.status === "closed" ? (
            <Link
              href={`/teacher/class/${classId}/activities/${activityId}/report`}
              className="px-3 py-1.5 rounded-lg bg-amber-500/90 text-black text-sm font-medium"
            >
              דוח סופי
            </Link>
          ) : null}
        </div>

        {data?.stuckStudents?.length ? (
          <div className="mb-4 rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100">
            ילדים תקועים:{" "}
            {data.stuckStudents.map((s) => s.studentFullNameMasked).join(", ")}
          </div>
        ) : null}

        {summary ? (
          <p className="text-white/70 text-sm mb-4 tabular-nums">
            לא התחילו: {summary.notStartedCount} · בתהליך: {summary.inProgressCount} ·
            הגישו: {summary.submittedCount} / {summary.rosterCount}
          </p>
        ) : null}

        {data?.students?.length ? (
          <div className="overflow-x-auto rounded-xl border border-white/10 mb-6">
            <table className="w-full text-sm text-right">
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
                {data.students.map((s) => (
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
                        data-testid="teacher-view-student-answers"
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

        <TeacherActivityStudentAnswersModal
          open={Boolean(answersStudent)}
          onClose={() => setAnswersStudent(null)}
          accessToken={accessToken}
          activityId={activityId}
          student={answersStudent}
          activityTitle={activity?.title}
        />

        {data?.perQuestion?.length ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">לפי שאלה</h2>
            {data.perQuestion.map((pq) => (
              <details
                key={pq.questionIndex}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <summary className="cursor-pointer text-sm">
                  שאלה {pq.questionIndex + 1}: דיוק {pq.accuracyPct}% ({pq.correctCount}/
                  {pq.totalAnswers})
                </summary>
                {pq.prompt ? (
                  <p className="text-white/80 text-sm mt-2" dir="auto">
                    {pq.prompt}
                  </p>
                ) : null}
                {pq.wrongStudentIds?.length ? (
                  <p className="text-red-200/90 text-xs mt-2">
                    טעו: {pq.wrongStudentIds.length} ילדים
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
