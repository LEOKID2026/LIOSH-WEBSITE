import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import PageSeo from "../../../components/seo/PageSeo";
import WorksheetPreviewPage from "../../../components/worksheets/WorksheetPreviewPage.jsx";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import {
  clearWorksheetPublicAnswerKeySession,
  loadWorksheetPublicPreviewSession,
  saveWorksheetPublicAnswerKeySession,
  saveWorksheetPublicPreviewSession,
} from "../../../lib/worksheets/worksheet-public-preview-session.client.js";
import { buildWorksheetSessionFingerprint } from "../../../lib/worksheets/worksheet-fingerprint.js";
import { WORKSHEET_UI_HE } from "../../../lib/worksheets/worksheet-ui.he.js";

const BACK_HREF = "/practice/worksheets";

export default function PublicWorksheetPreviewRoute() {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const layoutProps = { studentTheme: theme, studentShell: "home" };

  const [previewData, setPreviewData] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [answerKeyError, setAnswerKeyError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = loadWorksheetPublicPreviewSession();
    setPreviewData(stored);
    setSessionChecked(true);
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleAnswerKey = useCallback(async () => {
    if (!previewData?.generation || !previewData.includeAnswers) return;
    setAnswerKeyError("");
    clearWorksheetPublicAnswerKeySession();
    setAnswerKeyLoading(true);
    try {
      const expectedWorksheetFingerprint = buildWorksheetSessionFingerprint(
        previewData.worksheetPayload,
        previewData.generation
      );

      /** @type {Record<string, unknown>} */
      const body = {
        includeAnswers: true,
        expectedWorksheetFingerprint,
      };

      if (previewData.source === "public-ready" && previewData.slug) {
        body.source = "public-ready";
        body.slug = previewData.slug;
      } else {
        Object.assign(body, previewData.generation);
      }

      const res = await fetch("/api/public/worksheets/answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAnswerKeyError(data.message || WORKSHEET_UI_HE.answerKeyStale);
        return;
      }
      saveWorksheetPublicAnswerKeySession(data.answerKeyPayload);
      router.push("/practice/worksheets/preview/answers");
    } catch {
      setAnswerKeyError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setAnswerKeyLoading(false);
    }
  }, [previewData, router]);

  const handleRefresh = useCallback(async () => {
    if (previewData?.source !== "public-demo" || !previewData?.generation) return;
    setRefreshError("");
    setRefreshLoading(true);
    try {
      const gen = previewData.generation;
      const newSeed = Math.floor(Math.random() * 1_000_000);
      const res = await fetch("/api/public/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: gen.subjectId,
          gradeKey: gen.gradeKey,
          topicKey: gen.topicKey,
          levelKey: gen.levelKey,
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

      clearWorksheetPublicAnswerKeySession();
      const next = {
        worksheetPayload: data.worksheetPayload,
        generation: data.generation,
        includeAnswers: previewData.includeAnswers === true,
        source: "public-demo",
      };
      saveWorksheetPublicPreviewSession(next);
      setPreviewData(next);
    } catch {
      setRefreshError(WORKSHEET_UI_HE.refreshQuestionsError);
    } finally {
      setRefreshLoading(false);
    }
  }, [previewData]);

  if (!sessionChecked) {
    return (
      <Layout {...layoutProps}>
        <div dir="rtl" className="p-4 text-center text-slate-500">
          {WORKSHEET_UI_HE.loading}
        </div>
      </Layout>
    );
  }

  if (!previewData) {
    return (
      <>
        <PageSeo
          title="תצוגת דף עבודה · LEO KIDS"
          description="תצוגה מקדימה של דף עבודה."
          canonicalPath="/practice/worksheets/preview"
          noindex
        />
        <Layout {...layoutProps}>
          <div dir="rtl" className="mx-auto max-w-lg px-4 py-10 text-center">
            <p className="mb-6 text-base text-slate-700">{WORKSHEET_UI_HE.publicPreviewLost}</p>
            <Link
              href={BACK_HREF}
              className="inline-flex rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {WORKSHEET_UI_HE.publicPreviewLostCta}
            </Link>
          </div>
        </Layout>
      </>
    );
  }

  const showRefresh = previewData.source === "public-demo";

  return (
    <>
      <PageSeo
        title="תצוגת דף עבודה · LEO KIDS"
        description="תצוגה מקדימה של דף עבודה."
        canonicalPath="/practice/worksheets/preview"
        noindex
      />
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
            backHref={BACK_HREF}
          />
        </div>
      </Layout>
    </>
  );
}
