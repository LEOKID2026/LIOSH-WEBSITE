import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import WorksheetAnswerKeyPage from "../../../../components/worksheets/WorksheetAnswerKeyPage.jsx";
import { useStudentTheme } from "../../../../contexts/StudentThemeContext.jsx";
import { getLearningSupabaseBrowserClient } from "../../../../lib/learning-supabase/client";
import {
  clearParentBearerSessionAndRedirect,
  resolveParentBearerSession,
} from "../../../../lib/parent-client/parent-bearer-session.client.js";
import {
  clearWorksheetAnswerKeySession,
  loadWorksheetAnswerKeySession,
  loadWorksheetPreviewSession,
} from "../../../../lib/worksheets/worksheet-preview-session.client.js";
import { validateStoredAnswerKeyForWorksheet } from "../../../../lib/worksheets/worksheet-fingerprint.js";
import { WORKSHEET_UI_HE } from "../../../../lib/worksheets/worksheet-ui.he.js";

export default function ParentWorksheetAnswerKeyRoute() {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);

  const [answerKeyPayload, setAnswerKeyPayload] = useState(null);
  const [staleMessage, setStaleMessage] = useState("");
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    (async () => {
      const activeSession = await resolveParentBearerSession(supabaseRef.current);
      if (!activeSession?.access_token) {
        await clearParentBearerSessionAndRedirect(supabaseRef.current, router);
        return;
      }

      const previewSession = loadWorksheetPreviewSession();
      if (!previewSession?.includeAnswers) {
        router.replace("/parent/worksheets/preview");
        return;
      }

      const stored = loadWorksheetAnswerKeySession();
      const validation = validateStoredAnswerKeyForWorksheet(
        previewSession.worksheetPayload,
        previewSession.generation,
        stored
      );
      if (!validation.ok) {
        clearWorksheetAnswerKeySession();
        setStaleMessage(WORKSHEET_UI_HE.answerKeyStale);
        return;
      }
      setAnswerKeyPayload(stored);
    })();
  }, [clientReady, router]);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  if (staleMessage) {
    return (
      <Layout {...layoutProps}>
        <div dir="rtl" className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-6 text-base text-slate-700">{staleMessage}</p>
          <button
            type="button"
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white"
            onClick={() => router.push("/parent/worksheets/preview")}
          >
            {WORKSHEET_UI_HE.back}
          </button>
        </div>
      </Layout>
    );
  }

  if (!answerKeyPayload) {
    return (
      <Layout {...layoutProps}>
        <div dir="rtl" className="p-4 text-center text-slate-500">
          {WORKSHEET_UI_HE.loading}
        </div>
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
      <div className="worksheet-preview-container px-4 py-4 md:px-6 md:py-6">
        <WorksheetAnswerKeyPage
          answerKeyPayload={answerKeyPayload}
          onPrint={handlePrint}
        />
      </div>
    </Layout>
  );
}
