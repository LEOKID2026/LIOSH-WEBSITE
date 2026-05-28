import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import TeacherPortalShell from "../../../../components/teacher-portal/TeacherPortalShell";
import TeacherWorksheetReport from "../../../../components/worksheet-activities/TeacherWorksheetReport";
import { getLearningSupabaseBrowserClient } from "../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  return {
    props: {
      worksheetId: String(context.params?.worksheetId || "").trim(),
    },
  };
}

export default function TeacherDirectWorksheetReportPage({ worksheetId }) {
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

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
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/report`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.code || "שגיאה");
        return;
      }
      setReport(body.data.report);
    } catch {
      setError("שגיאת רשת");
    }
  }, [worksheetId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const routeBase = `/teacher/worksheets/${encodeURIComponent(worksheetId)}`;

  return (
    <Layout>
      <TeacherPortalShell title="דוח דף עבודה" backHref={routeBase}>
        {error ? <p className="text-red-300">{error}</p> : null}
        {report ? (
          <TeacherWorksheetReport
            worksheetId={worksheetId}
            report={report}
            worksheetRouteBase={routeBase}
          />
        ) : (
          <p className="text-white/60">טוען…</p>
        )}
      </TeacherPortalShell>
    </Layout>
  );
}
