import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../../components/Layout";
import TeacherPortalShell from "../../../../../components/teacher-portal/TeacherPortalShell";
import TeacherGradingScreen from "../../../../../components/worksheet-activities/TeacherGradingScreen";
import { getLearningSupabaseBrowserClient } from "../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  return {
    props: {
      worksheetId: String(context.params?.worksheetId || "").trim(),
      studentId: String(context.params?.studentId || "").trim(),
    },
  };
}

export default function TeacherDirectWorksheetGradePage({ worksheetId, studentId }) {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

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
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/students/${encodeURIComponent(studentId)}/answers`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.code || "שגיאה");
        return;
      }
      setQuestions(body.data.questions || []);
      setAnswers(body.data.answers || []);
    } catch {
      setError("שגיאת רשת");
    }
  }, [worksheetId, studentId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (grades, markChecked) => {
      setBusy(true);
      setMsg("");
      setError("");
      try {
        const supabase = getLearningSupabaseBrowserClient();
        const session = await resolveTeacherAccessToken(supabase);
        if (!session.ok) return;
        const res = await teacherAuthFetch(
          session.token,
          `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/students/${encodeURIComponent(studentId)}/grade`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grades, markChecked }),
          }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.error?.code || "שגיאה");
          return;
        }
        setMsg(markChecked ? "נשמר וסומן כנבדק" : "התקדמות נשמרה");
        await load();
      } finally {
        setBusy(false);
      }
    },
    [worksheetId, studentId, load]
  );

  const publish = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) return;
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/students/${encodeURIComponent(studentId)}/publish`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.code || "grading_incomplete");
        return;
      }
      setMsg(`פורסם לילד/ה · ציון: ${body?.data?.finalScorePct ?? "-"}%`);
      await load();
    } finally {
      setBusy(false);
    }
  }, [worksheetId, studentId, load]);

  const reportHref = `/teacher/worksheets/${encodeURIComponent(worksheetId)}/report`;

  return (
    <Layout>
      <TeacherPortalShell title="בדיקת ילד/ה" backHref={reportHref}>
        {error ? <p className="text-red-300 text-sm mb-2">{error}</p> : null}
        {msg ? <p className="text-emerald-300 text-sm mb-2">{msg}</p> : null}
        {questions.length ? (
          <TeacherGradingScreen
            questions={questions}
            answers={answers}
            busy={busy}
            onSave={save}
            onPublish={() => void publish()}
          />
        ) : (
          <p className="text-white/60">טוען…</p>
        )}
      </TeacherPortalShell>
    </Layout>
  );
}
