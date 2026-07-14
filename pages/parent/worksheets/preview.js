import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import WorksheetPreviewPage from "../../../components/worksheets/WorksheetPreviewPage.jsx";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { getLearningSupabaseBrowserClient } from "../../../lib/learning-supabase/client";
import {
  clearParentBearerSessionAndRedirect,
  resolveParentBearerSession,
} from "../../../lib/parent-client/parent-bearer-session.client.js";
import {
  clearWorksheetAnswerKeySession,
  loadWorksheetPreviewSession,
  saveWorksheetAnswerKeySession,
  saveWorksheetPreviewSession,
} from "../../../lib/worksheets/worksheet-preview-session.client.js";
import { buildWorksheetSessionFingerprint } from "../../../lib/worksheets/worksheet-fingerprint.js";
import { WORKSHEET_UI_HE } from "../../../lib/worksheets/worksheet-ui.he.js";

export default function ParentWorksheetPreviewRoute() {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);

  const [session, setSession] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [answerKeyError, setAnswerKeyError] = useState("");
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
      setSession(activeSession);
      const stored = loadWorksheetPreviewSession();
      if (!stored) {
        router.replace("/parent/worksheets");
        return;
      }
      setPreviewData(stored);
    })();
  }, [clientReady, router]);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleAnswerKey = useCallback(async () => {
    if (!session?.access_token || !previewData?.generation || !previewData.includeAnswers) {
      return;
    }
    setAnswerKeyError("");
    clearWorksheetAnswerKeySession();
    setAnswerKeyLoading(true);
    try {
      const expectedWorksheetFingerprint = buildWorksheetSessionFingerprint(
        previewData.worksheetPayload,
        previewData.generation
      );
      const res = await fetch("/api/parent/worksheets/answer-key", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...previewData.generation,
          includeAnswers: true,
          expectedWorksheetFingerprint,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAnswerKeyError(data.message || WORKSHEET_UI_HE.answerKeyStale);
        return;
      }
      saveWorksheetAnswerKeySession(data.answerKeyPayload);
      router.push("/parent/worksheets/preview/answers");
    } catch {
      setAnswerKeyError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setAnswerKeyLoading(false);
    }
  }, [session, previewData, router]);

  const handleRefresh = useCallback(async () => {
    if (
      !session?.access_token ||
      previewData?.source !== "create" ||
      !previewData?.generation
    ) {
      return;
    }
    setRefreshError("");
    setRefreshLoading(true);
    try {
      const gen = previewData.generation;
      const newSeed = Math.floor(Math.random() * 1_000_000);
      const res = await fetch("/api/parent/worksheets/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectId: gen.subjectId,
          gradeKey: gen.gradeKey,
          topicKey: gen.topicKey,
          levelKey: gen.levelKey,
          count: gen.count,
          seed: newSeed,
          inkSave: gen.inkSave === true,
          mathPracticeFormat:
            typeof gen.mathPracticeFormat === "string" ? gen.mathPracticeFormat : undefined,
          ...(typeof gen.preferMcq === "boolean" ? { preferMcq: gen.preferMcq } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRefreshError(data.message || WORKSHEET_UI_HE.refreshQuestionsError);
        return;
      }

      clearWorksheetAnswerKeySession();

      const next = {
        worksheetPayload: data.worksheetPayload,
        generation: data.generation,
        includeAnswers: previewData.includeAnswers === true,
        source: "create",
      };
      saveWorksheetPreviewSession(next);
      setPreviewData(next);
    } catch {
      setRefreshError(WORKSHEET_UI_HE.refreshQuestionsError);
    } finally {
      setRefreshLoading(false);
    }
  }, [session, previewData]);

  if (!previewData) {
    return (
      <Layout {...layoutProps}>
        <div dir="rtl" className="p-4 text-center text-slate-500">
          {WORKSHEET_UI_HE.loading}
        </div>
      </Layout>
    );
  }

  const showRefresh = previewData.source === "create";

  return (
    <Layout {...layoutProps}>
      <div className="worksheet-preview-container px-4 py-4 md:px-6 md:py-6">
        {refreshError ? (
          <p dir="rtl" className="mb-3 text-center text-sm text-red-600">
            {refreshError}
          </p>
        ) : null}
        {answerKeyError ? (
          <p dir="rtl" className="mb-3 text-center text-sm text-red-600">
            {answerKeyError}
          </p>
        ) : null}
        <WorksheetPreviewPage
          worksheetPayload={previewData.worksheetPayload}
          includeAnswers={previewData.includeAnswers === true}
          onPrint={handlePrint}
          onAnswerKey={previewData.includeAnswers ? handleAnswerKey : undefined}
          answerKeyLoading={answerKeyLoading}
          onRefresh={showRefresh ? handleRefresh : undefined}
          refreshLoading={refreshLoading}
        />
      </div>
    </Layout>
  );
}
