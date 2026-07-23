/**
 * Public indexable landing page for a single ready question worksheet.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../Layout";
import PageSeo from "../seo/PageSeo";
import PublicSeoPageActions from "../seo/PublicSeoPageActions";
import WorksheetScreenPreview from "./WorksheetScreenPreview.jsx";
import WorksheetIncludeAnswersOption from "./WorksheetIncludeAnswersOption.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  getPublicSeoWideClasses,
  PUBLIC_SEO_PAGE_MAX,
  PUBLIC_SEO_PAGE_PAD,
  PUBLIC_SEO_PAGE_SPACE,
} from "../seo/public-seo-wide-theme";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import {
  loadWorksheetIncludeAnswersPref,
  saveWorksheetIncludeAnswersPref,
} from "../../lib/worksheets/worksheet-include-answers-pref.client.js";
import {
  clearWorksheetPublicAnswerKeySession,
  saveWorksheetPublicAnswerKeySession,
  saveWorksheetPublicPreviewSession,
} from "../../lib/worksheets/worksheet-public-preview-session.client.js";
import { buildWorksheetSessionFingerprint } from "../../lib/worksheets/worksheet-fingerprint.js";
import { readyWorksheetPublicPath } from "../../lib/worksheets/worksheet-ready-public-paths.js";

const CATALOG_HREF = "/practice/worksheets";

/**
 * @param {{
 *   page: import("../../lib/worksheets/worksheet-ready-public-page.server.js").buildReadyWorksheetPublicPageMeta extends (...args: unknown[]) => infer R ? R : never,
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload,
 *   generation: Record<string, unknown>,
 *   relatedPages: Array<{
 *     slug: string,
 *     h1: string,
 *     subjectHe: string,
 *     gradeHe: string,
 *     topicHe: string,
 *   }>,
 * }} props
 */
export default function ReadyWorksheetPublicPage({
  page,
  worksheetPayload,
  generation,
  relatedPages,
}) {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);

  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [includeAnswersReady, setIncludeAnswersReady] = useState(false);
  const [viewPrintBusy, setViewPrintBusy] = useState(false);
  const [answerKeyBusy, setAnswerKeyBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setIncludeAnswers(loadWorksheetIncludeAnswersPref());
    setIncludeAnswersReady(true);
  }, []);

  const handleIncludeAnswersChange = useCallback((next) => {
    const value = next === true;
    setIncludeAnswers(value);
    saveWorksheetIncludeAnswersPref(value);
  }, []);

  const openPreview = useCallback(
    (includeAnswersValue) => {
      clearWorksheetPublicAnswerKeySession();
      saveWorksheetPublicPreviewSession({
        worksheetPayload,
        generation,
        includeAnswers: includeAnswersValue === true,
        source: "public-ready",
        slug: page.slug,
        returnPath: readyWorksheetPublicPath(page.slug),
      });
      router.push("/practice/worksheets/preview");
    },
    [generation, page.slug, router, worksheetPayload]
  );

  const handleViewPrint = useCallback(async () => {
    setActionError("");
    setViewPrintBusy(true);
    try {
      openPreview(includeAnswers);
    } catch {
      setActionError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setViewPrintBusy(false);
    }
  }, [includeAnswers, openPreview]);

  const handleAnswerKey = useCallback(async () => {
    setActionError("");
    clearWorksheetPublicAnswerKeySession();
    setAnswerKeyBusy(true);
    try {
      const expectedWorksheetFingerprint = buildWorksheetSessionFingerprint(
        worksheetPayload,
        generation
      );
      const res = await fetch("/api/public/worksheets/answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeAnswers: true,
          expectedWorksheetFingerprint,
          source: "public-ready",
          slug: page.slug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionError(data.message || WORKSHEET_UI_HE.answerKeyStale);
        return;
      }
      saveWorksheetPublicPreviewSession({
        worksheetPayload,
        generation,
        includeAnswers: true,
        source: "public-ready",
        slug: page.slug,
        returnPath: readyWorksheetPublicPath(page.slug),
      });
      saveWorksheetPublicAnswerKeySession(data.answerKeyPayload);
      router.push("/practice/worksheets/preview/answers");
    } catch {
      setActionError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setAnswerKeyBusy(false);
    }
  }, [generation, page.slug, router, worksheetPayload]);

  const primaryBtn = isBright
    ? "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-sky-800 disabled:opacity-60"
    : "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-sky-400 disabled:opacity-60";

  const secondaryBtn = isBright
    ? "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-sky-200 bg-white px-5 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 disabled:opacity-60"
    : "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-white/15 disabled:opacity-60";

  return (
    <>
      <PageSeo
        title={page.seoTitle}
        description={page.seoDescription}
        canonicalPath={page.canonicalPath}
      />
      <Layout studentTheme={theme} studentShell="home" layoutShowThemePicker>
        <div
          dir="rtl"
          lang="he"
          className={`mx-auto w-full ${PUBLIC_SEO_PAGE_MAX} ${PUBLIC_SEO_PAGE_PAD} ${PUBLIC_SEO_PAGE_SPACE}`}
          data-testid="ready-worksheet-public-page"
        >
          <PublicSeoPageActions pageKind="practice-inner" isBright={isBright} />

          <header className={`space-y-4 ${cls.heroShell}`}>
            <p className={cls.badge}>{page.subjectHe}</p>
            <h1 className={cls.h1}>{page.h1}</h1>
            <p className={cls.intro}>{page.shortDescription}</p>
          </header>

          <section className={cls.interactiveSlot} aria-labelledby="ready-ws-preview-heading">
            <h2 id="ready-ws-preview-heading" className={`${cls.sectionSubtitle} mb-4`}>
              {WORKSHEET_UI_HE.previewTitle}
            </h2>
            <div className="ready-worksheet-public-preview-embed">
              <WorksheetScreenPreview worksheetPayload={worksheetPayload} titleTag="h2" />
            </div>
            <div className="mt-5 flex flex-col gap-4">
              {includeAnswersReady ? (
                <WorksheetIncludeAnswersOption
                  checked={includeAnswers}
                  onChange={handleIncludeAnswersChange}
                  T={{
                    muted: cls.muted,
                    label: cls.heading,
                  }}
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={viewPrintBusy || answerKeyBusy}
                  onClick={handleViewPrint}
                >
                  {viewPrintBusy ? WORKSHEET_UI_HE.loading : WORKSHEET_UI_HE.viewAndPrint}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={viewPrintBusy || answerKeyBusy}
                  onClick={handleAnswerKey}
                >
                  {answerKeyBusy ? WORKSHEET_UI_HE.loading : WORKSHEET_UI_HE.answerKey}
                </button>
              </div>
              {actionError ? (
                <p className="text-sm text-red-600" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>
          </section>

          <section className={cls.section} aria-labelledby="ready-ws-details-heading">
            <h2 id="ready-ws-details-heading" className={`${cls.sectionSubtitle} mb-4`}>
              פרטי הדף
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className={cls.bulletRow}>
                <dt className="font-semibold">מקצוע</dt>
                <dd>{page.subjectHe}</dd>
              </div>
              <div className={cls.bulletRow}>
                <dt className="font-semibold">{WORKSHEET_UI_HE.gradeField}</dt>
                <dd>{page.gradeHe}</dd>
              </div>
              <div className={cls.bulletRow}>
                <dt className="font-semibold">{WORKSHEET_UI_HE.levelField}</dt>
                <dd>{page.levelHe}</dd>
              </div>
              <div className={cls.bulletRow}>
                <dt className="font-semibold">{WORKSHEET_UI_HE.countField}</dt>
                <dd>
                  {page.count} {WORKSHEET_UI_HE.questionCount}
                </dd>
              </div>
              <div className={`${cls.bulletRow} sm:col-span-2`}>
                <dt className="font-semibold">{WORKSHEET_UI_HE.topicField}</dt>
                <dd>{page.topicHe}</dd>
              </div>
            </dl>
          </section>

          <section className={cls.section} aria-labelledby="ready-ws-goals-heading">
            <h2 id="ready-ws-goals-heading" className={`${cls.sectionSubtitle} mb-4`}>
              מה מתרגלים בדף?
            </h2>
            <ul className="space-y-3">
              {page.learningGoals.map((goal) => (
                <li key={goal} className={cls.bulletRow}>
                  <span className={cls.bulletIcon} aria-hidden="true">
                    ✓
                  </span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </section>

          {relatedPages.length ? (
            <section className={cls.section} aria-labelledby="ready-ws-related-heading">
              <h2 id="ready-ws-related-heading" className={`${cls.sectionSubtitle} mb-4`}>
                דפי עבודה קשורים
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPages.map((related) => (
                  <li key={related.slug}>
                    <Link
                      href={readyWorksheetPublicPath(related.slug)}
                      className={`block ${cls.hubCard}`}
                    >
                      <span className={cls.hubCardTitle}>{related.topicHe}</span>
                      <span className={cls.hubCardBlurb}>
                        {related.subjectHe} · {related.gradeHe}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className={cls.footerCta}>
            <Link href={CATALOG_HREF} className={cls.linkSky}>
              ← חזרה לכל דפי העבודה
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}
