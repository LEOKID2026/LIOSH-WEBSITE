import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../../components/Layout";
import TeacherPortalShell from "../../../../../components/teacher-portal/TeacherPortalShell";
import TeacherClassActivitiesNav from "../../../../../components/teacher-portal/TeacherClassActivitiesNav";
import TeacherDiscussionQuestionPicker from "../../../../../components/teacher-portal/TeacherDiscussionQuestionPicker";
import { getLearningSupabaseBrowserClient } from "../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../lib/teacher-portal/teacher-ui.he.js";
import { loadClassActivityContextFromApiClass } from "../../../../../lib/teacher-portal/teacher-class-grade.js";

export async function getServerSideProps(context) {
  const classId = String(context.params?.classId || "").trim();
  return { props: { classId } };
}

export default function TeacherNewDiscussionPage({ classId }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [gradeLevel, setGradeLevel] = useState("g3");
  const [lockedSubject, setLockedSubject] = useState(null);
  const [subjectLocked, setSubjectLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getLearningSupabaseBrowserClient();
        const session = await resolveTeacherAccessToken(supabase);
        if (!session.ok) {
          router.replace("/teacher/login");
          return;
        }
        if (cancelled) return;
        setAccessToken(session.token);

        const res = await teacherAuthFetch(
          session.token,
          `/api/teacher/classes/${encodeURIComponent(classId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json?.error?.message || "טעינת כיתה נכשלה");
          return;
        }
        const cls = json?.data?.class;
        const ctx = loadClassActivityContextFromApiClass(cls);
        if (ctx.gradeKey) {
          setGradeLevel(ctx.gradeKey);
        } else if (ctx.gradeLocked) {
          setError("רמת הכיתה של הכיתה אינה תקינה. פנה למנהל בית הספר.");
        }
        if (ctx.subjectFocus) {
          setLockedSubject(ctx.subjectFocus);
          setSubjectLocked(true);
        }
      } catch {
        if (!cancelled) setError("שגיאת רשת");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, router]);

  return (
    <Layout>
      <TeacherPortalShell
        title="פעילות דיון חדשה"
        backHref={`/teacher/class/${encodeURIComponent(classId)}/activities`}
      >
        <TeacherClassActivitiesNav classId={classId} active="discussion" />

        {error ? (
          <p className="mb-4 text-red-200 text-sm rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-white/60 text-sm">טוען…</p>
        ) : accessToken ? (
          <TeacherDiscussionQuestionPicker
            accessToken={accessToken}
            gradeLevel={gradeLevel}
            classId={classId}
            lockedSubject={lockedSubject}
            subjectLocked={subjectLocked}
          />
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
