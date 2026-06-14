import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import TeacherPortalShell from "../../../../components/teacher-portal/TeacherPortalShell";
import PdfUploader from "../../../../components/worksheet-activities/PdfUploader";
import TeacherQuestionBuilder from "../../../../components/worksheet-activities/TeacherQuestionBuilder";
import { getLearningSupabaseBrowserClient } from "../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../lib/teacher-portal/teacher-ui.he.js";
import {
  worksheetModeLabelHe,
  worksheetStatusLabelHe,
} from "../../../../lib/worksheet-activities/worksheet-labels.client.js";

export async function getServerSideProps(context) {
  return {
    props: {
      worksheetId: String(context.params?.worksheetId || "").trim(),
    },
  };
}

export default function TeacherDirectWorksheetManagePage({ worksheetId }) {
  const router = useRouter();
  const [worksheet, setWorksheet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [hasPdf, setHasPdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.code || "שגיאה");
        return;
      }
      setWorksheet(body.data.worksheet);
      setQuestions(body.data.questions || []);
      setHasPdf((body.data.files || []).some((f) => f.fileRole === "worksheet" && !f.isDeleted));
    } catch {
      setError("שגיאת רשת");
    }
  }, [worksheetId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadPdf = useCallback(
    async (file) => {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) return { ok: false, error: "לא מחובר" };
      const pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          resolve(result.includes(",") ? result.split(",").pop() : result);
        };
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const res = await teacherAuthFetch(
        session.token,
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/upload-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64, originalFilename: file.name, fileRole: "worksheet" }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body?.error?.code };
      setHasPdf(true);
      return { ok: true, fileId: body?.data?.fileId, originalFilename: body?.data?.originalFilename };
    },
    [worksheetId]
  );

  const openPdf = useCallback(async () => {
    const supabase = getLearningSupabaseBrowserClient();
    const session = await resolveTeacherAccessToken(supabase);
    if (!session.ok) return;
    const res = await teacherAuthFetch(
      session.token,
      `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/pdf-url`
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.data?.signedUrl) window.open(body.data.signedUrl, "_blank", "noopener");
  }, [worksheetId]);

  const saveQuestions = useCallback(async () => {
    setBusy(true);
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) return;
      await teacherAuthFetch(
        session.token,
        `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions }),
        }
      );
      await load();
    } finally {
      setBusy(false);
    }
  }, [worksheetId, questions, load]);

  const setStatus = useCallback(
    async (action) => {
      setBusy(true);
      try {
        const supabase = getLearningSupabaseBrowserClient();
        const session = await resolveTeacherAccessToken(supabase);
        if (!session.ok) return;
        const res = await teacherAuthFetch(
          session.token,
          `/api/teacher/worksheet-activities/${encodeURIComponent(worksheetId)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body?.error?.code);
          return;
        }
        await load();
      } finally {
        setBusy(false);
      }
    },
    [worksheetId, load]
  );

  if (!worksheet) {
    return (
      <Layout>
        <TeacherPortalShell title="דף עבודה" backHref="/teacher/worksheets">
          <p className="text-white/60">{error || "טוען…"}</p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <TeacherPortalShell title={worksheet.title} backHref="/teacher/worksheets">
        {error ? <p className="text-red-300 text-sm mb-4">{error}</p> : null}

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-right mb-6">
          <p className="text-white/80 text-sm">
            {worksheetModeLabelHe(worksheet.worksheetMode)} · {worksheetStatusLabelHe(worksheet.status)}
            {worksheet.assignmentScope === "selected_students" ? " · ילדים נבחרים" : null}
          </p>
          {worksheet.instructions ? (
            <p className="text-white mt-2 text-sm">{worksheet.instructions}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 mt-4 justify-end">
            <Link
              href={`/teacher/worksheets/${encodeURIComponent(worksheetId)}/report`}
              className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-100 border border-violet-400/30 text-sm"
            >
              דוח
            </Link>
            <button
              type="button"
              onClick={() => void openPdf()}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-sm"
            >
              פתח PDF
            </button>
            {worksheet.status === "draft" ? (
              <button
                type="button"
                disabled={busy || !hasPdf}
                onClick={() => void setStatus("activate")}
                className="px-3 py-1.5 rounded-lg bg-violet-500/90 text-black text-sm font-semibold"
              >
                הפעל
              </button>
            ) : null}
            {worksheet.status === "active" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("close")}
                className="px-3 py-1.5 rounded-lg border border-amber-400/40 text-amber-200 text-sm"
              >
                סגור
              </button>
            ) : null}
          </div>
        </div>

        {worksheet.status === "draft" ? (
          <PdfUploader disabled={busy} uploadFn={uploadPdf} onUploaded={() => setHasPdf(true)} />
        ) : null}

        {worksheet.worksheetMode !== "pdf_only" ? (
          <div className="mt-6">
            <TeacherQuestionBuilder questions={questions} onChange={setQuestions} disabled={busy} />
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveQuestions()}
              className="mt-4 px-4 py-2 rounded-xl bg-cyan-600/90 text-white font-semibold"
            >
              שמור שאלות
            </button>
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
