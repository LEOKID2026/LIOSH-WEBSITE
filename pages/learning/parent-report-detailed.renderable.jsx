import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { ParentReportImportantDisclaimer } from "../../components/ParentReportImportantDisclaimer";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { generateDetailedParentReport } from "../../utils/detailed-parent-report";
import {
  buildSubjectParentLetter,
  buildTopicRecommendationNarrative,
} from "../../utils/detailed-report-parent-letter-he";
import {
  Bullets,
  ExecutiveSummarySection,
  ParentAssignedActivitiesSection,
  SubjectPhase3Insights,
  SubjectSummaryBlock,
  TopicRecommendationExplainStrip,
} from "../../components/parent-report-detailed-surface.jsx";
import { normalizeExecutiveSummary } from "../../utils/parent-report-payload-normalize";
import { PARENT_BULLETS_EMPTY_WITH_VOLUME_HE } from "../../utils/parent-data-presence.js";
import {
  PARENT_REPORT_PERIOD_EMPTY_STATE_HE,
  subjectProfileHasPracticeEvidence,
} from "../../utils/parent-report-subject-visibility.js";
import ParentCopilotShell from "../../components/parent-copilot/parent-copilot-shell.jsx";
import { ParentReportInsight } from "../../components/ParentReportInsight.jsx";
import { ParentDiagnosticExplanationBlock } from "../../components/parent-diagnostic-explanation-block.jsx";
import {
  enrichDetailedParentReportWithParentAi,
  getDeterministicDetailedParentAiExplanation,
} from "../../utils/parent-report-ai/parent-report-ai-adapter";

/**
 * מיפוי ויזואלי בלבד לפי recommendedNextStep מה payload — לא משנה מנוע או תוכן.
 * @param {string | undefined} step
 * @returns {"advance" | "maintain" | "remediate" | "drop"}
 */
function topicNextStepVisualVariant(step) {
  switch (step) {
    case "advance_level":
    case "advance_grade_topic_only":
      return "advance";
    case "maintain_and_strengthen":
      return "maintain";
    case "remediate_same_level":
      return "remediate";
    case "drop_one_level_topic_only":
    case "drop_one_grade_topic_only":
      return "drop";
    default:
      return "maintain";
  }
}

function SectionCard({ title, children, className = "", compact = false }) {
  return (
    <section
      className={`pr-detailed-section rounded-xl border border-white/12 bg-white/[0.045] mb-5 md:mb-6 overflow-hidden ${
        compact ? "pr-detailed-section--compact" : ""
      } ${className}`}
    >
      <div className="pr-detailed-section-head px-3 md:px-4 py-2.5 md:py-3 border-b border-white/10 bg-white/[0.035]">
        <h2 className="pr-detailed-section-title text-base md:text-lg font-extrabold tracking-tight text-white m-0">
          {title}
        </h2>
      </div>
      <div className="pr-detailed-section-inner px-3 md:px-4 py-3 md:py-4">{children}</div>
    </section>
  );
}

/** כרטיס לכל שורה — פעולות לבית (מסך + הדפסה) */
function PlanItemCards({ items, windowTotalQuestions = 0 }) {
  if (!items?.length)
    return (
      <p className="pr-detailed-muted text-sm">
        {Number(windowTotalQuestions) > 0 ? PARENT_BULLETS_EMPTY_WITH_VOLUME_HE : "אין נתונים להצגה."}
      </p>
    );
  return (
    <div className="pr-detailed-text-item-stack flex flex-col gap-2.5">
      {items.map((text, i) => (
        <div
          key={i}
          className="pr-detailed-plan-item pr-detailed-body-text rounded-lg border border-sky-400/22 bg-sky-950/12 px-3 py-2.5 text-sm leading-relaxed text-white/[0.9]"
        >
          {text}
        </div>
      ))}
    </div>
  );
}

/** כרטיס לכל שורה — יעדי תקופה (מסך + הדפסה) */
function GoalItemCards({ items, windowTotalQuestions = 0 }) {
  if (!items?.length)
    return (
      <p className="pr-detailed-muted text-sm">
        {Number(windowTotalQuestions) > 0 ? PARENT_BULLETS_EMPTY_WITH_VOLUME_HE : "אין נתונים להצגה."}
      </p>
    );
  return (
    <div className="pr-detailed-text-item-stack flex flex-col gap-2.5">
      {items.map((text, i) => (
        <div
          key={i}
          className="pr-detailed-goal-item pr-detailed-body-text rounded-lg border border-violet-400/22 bg-violet-950/10 px-3 py-2.5 text-sm leading-relaxed text-white/[0.9]"
        >
          {text}
        </div>
      ))}
    </div>
  );
}

/** מכתב מקצועי להורה — מפרש את אותו payload בלי כותרות מערכת */
function SubjectParentLetter({ sp }) {
  const letter = useMemo(() => buildSubjectParentLetter(sp), [sp]);
  const primaryWeaknessExplanation = sp?.topWeaknesses?.[0]?.parentDiagnosticExplanationV1 || null;
  return (
    <div className="pr-detailed-subject-letter space-y-3 rounded-xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3 md:p-4">
      {letter.opening ? (
        <p className="pr-detailed-body-text text-sm md:text-[0.95rem] leading-relaxed m-0 text-white/[0.91]">
          {letter.opening}
        </p>
      ) : null}
      {letter.diagnosisHe ? (
        <div className="space-y-0">
          <p className="pr-detailed-body-text text-sm md:text-[0.95rem] leading-relaxed m-0 text-white/[0.91]">
            {letter.diagnosisHe}
          </p>
          <ParentDiagnosticExplanationBlock
            explanationV1={primaryWeaknessExplanation}
            className="pr-detailed-diagnostic-explanation"
          />
        </div>
      ) : null}
      {letter.homeAction ? (
        <p className="pr-detailed-body-text text-sm md:text-[0.95rem] leading-relaxed m-0 text-white/[0.91]">
          {letter.homeAction}
        </p>
      ) : null}
      {letter.closing ? (
        <p className="pr-detailed-body-text text-sm md:text-[0.95rem] leading-relaxed m-0 text-white/[0.91]">
          {letter.closing}
        </p>
      ) : null}
    </div>
  );
}

/** מצב תצוגה: אותו payload, תצוגה מלאה או תמצית להדפסה */
function normalizeDisplayMode(raw) {
  return raw === "summary" ? "summary" : "full";
}

/** query נקי לשיתוף/הדפסה — רק פרמטרים שמוכרים לדף המקיף */
function buildDetailedReportQueryFromQueryObject(query, mode) {
  const next = normalizeDisplayMode(mode);
  const q = {};
  const period = query?.period;
  if (typeof period === "string" && period) q.period = period;
  const start = query?.start;
  const end = query?.end;
  if (typeof start === "string" && start) q.start = start;
  if (typeof end === "string" && end) q.end = end;
  if (next === "summary") q.mode = "summary";
  return q;
}

export default function ParentReportDetailedPage() {
  useIOSViewportFix();
  const router = useRouter();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState("full");
  /** Same shape as short report `report.parentAiExplanation` — populated asynchronously. */
  const [parentAiExplanation, setParentAiExplanation] = useState(/** @type {null | { ok: true; text: string; source?: string }} */ (null));

  const queryPeriod = typeof router.query.period === "string" ? router.query.period : "week";
  const queryStart = typeof router.query.start === "string" ? router.query.start : null;
  const queryEnd = typeof router.query.end === "string" ? router.query.end : null;
  const queryModeRaw = router.query.mode;

  const backHref = useMemo(() => {
    const q = { period: queryPeriod };
    if (queryPeriod === "custom" && queryStart && queryEnd) {
      q.start = queryStart;
      q.end = queryEnd;
    }
    return { pathname: "/learning/parent-report", query: q };
  }, [queryPeriod, queryStart, queryEnd]);

  useEffect(() => {
    if (!router.isReady || typeof window === "undefined") return undefined;
    const name = localStorage.getItem("mleo_player_name") || "";
    if (!name) {
      setPayload(null);
      setLoading(false);
      return undefined;
    }
    let p = queryPeriod;
    let cs = null;
    let ce = null;
    if (p === "custom" && queryStart && queryEnd) {
      cs = queryStart;
      ce = queryEnd;
    } else if (p !== "week" && p !== "month" && p !== "custom") {
      p = "week";
    }
    if (p === "custom" && (!cs || !ce)) {
      p = "week";
      cs = null;
      ce = null;
    }
    const data = generateDetailedParentReport(name, p, cs, ce);
    setPayload(data);
    setLoading(false);
    return undefined;
  }, [router.isReady, queryPeriod, queryStart, queryEnd]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!payload || typeof payload !== "object") {
      setParentAiExplanation(null);
      return undefined;
    }
    const tq = Number(payload.overallSnapshot?.totalQuestions) || 0;
    const tm = Number(payload.overallSnapshot?.totalTime) || 0;
    if (tq === 0 && tm === 0) {
      setParentAiExplanation(null);
      return undefined;
    }
    setParentAiExplanation(getDeterministicDetailedParentAiExplanation(payload));
    let cancelled = false;
    void (async () => {
      try {
        const { parentAiExplanation: next } = await enrichDetailedParentReportWithParentAi(payload, {});
        if (cancelled) return;
        if (next?.ok && next.text) setParentAiExplanation(next);
      } catch {
        if (!cancelled) setParentAiExplanation(getDeterministicDetailedParentAiExplanation(payload));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!router.isReady) return undefined;
    setDisplayMode(normalizeDisplayMode(router.query.mode));
    return undefined;
  }, [router.isReady, queryModeRaw]);

  const setModeInUrl = useCallback(
    (mode) => {
      const next = normalizeDisplayMode(mode);
      const q = buildDetailedReportQueryFromQueryObject(router.query, next);
      router.replace({ pathname: "/learning/parent-report-detailed", query: q }, undefined, {
        shallow: true,
      });
      setDisplayMode(next);
    },
    [router.replace, queryPeriod, queryStart, queryEnd, queryModeRaw]
  );

  const printWithMode = useCallback(
    (mode) => {
      const next = normalizeDisplayMode(mode);
      setDisplayMode(next);
      const q = buildDetailedReportQueryFromQueryObject(router.query, next);
      router.replace({ pathname: "/learning/parent-report-detailed", query: q }, undefined, {
        shallow: true,
      });
      window.setTimeout(() => window.print(), 120);
    },
    [router.replace, queryPeriod, queryStart, queryEnd, queryModeRaw]
  );

  const ModeToggle = ({ className = "" }) => (
    <div
      className={`no-pdf flex flex-wrap items-center justify-center gap-2 ${className}`}
      role="group"
      aria-label="מצב תצוגת דוח"
    >
      <button
        type="button"
        onClick={() => setModeInUrl("full")}
        className={`inline-flex px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
          displayMode === "full"
            ? "bg-sky-600/80 border-sky-300/60 text-white"
            : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
        }`}
      >
        דוח מלא
      </button>
      <button
        type="button"
        onClick={() => setModeInUrl("summary")}
        className={`inline-flex px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
          displayMode === "summary"
            ? "bg-amber-600/75 border-amber-300/55 text-white"
            : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
        }`}
      >
        דוח מקוצר
      </button>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex items-center justify-center">
          <div className="text-white text-lg">טוען דוח מקיף…</div>
        </div>
      </Layout>
    );
  }

  const pi = payload?.periodInfo;
  const noPlayer =
    typeof window !== "undefined" && !loading && !localStorage.getItem("mleo_player_name");
  const allSubjectProfiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  const visibleSubjectProfiles = allSubjectProfiles.filter(subjectProfileHasPracticeEvidence);
  const periodHasPracticeEvidence =
    (Number(payload?.overallSnapshot?.totalQuestions) || 0) > 0 ||
    (Number(payload?.overallSnapshot?.totalTime) || 0) > 0;

  return (
    <Layout>
      <Head>
        <title>דוח מקיף לתקופה - LIOSH</title>
        <style>{`
          .pr-detailed-page {
            --pr-h1: 1.35rem;
            --pr-h2: 1.05rem;
            --pr-h3: 0.98rem;
            --pr-h4: 0.78rem;
            --pr-body: 0.875rem;
            --pr-muted: 0.8rem;
          }

          .pr-detailed-subheading {
            margin: 0 0 0.4rem 0;
            padding: 0 0 0.2rem 0;
            font-size: var(--pr-h4);
            font-weight: 800;
            letter-spacing: 0.03em;
            text-transform: none;
            border-bottom: 1px solid rgba(255,255,255,0.12);
          }

          .pr-detailed-body-text { line-height: 1.55; }
          .pr-detailed-muted { color: rgba(255,255,255,0.58); line-height: 1.5; }
          .pr-detailed-phase3-dl {
            border-radius: 0.5rem;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 0.65rem 0.75rem;
            background: rgba(0,0,0,0.14);
          }
          .pr-detailed-mini-heading { letter-spacing: 0.02em; }

          .pr-detailed-subject-stack {
            min-width: 0;
          }
          .pr-detailed-summary-subject.pr-detailed-subject-stack,
          .pr-detailed-subject-block.pr-detailed-subject-stack {
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
            overflow: visible;
          }
          .pr-detailed-subject-heading {
            margin: 0;
            padding: 0;
            background: transparent;
            border: none;
          }
          .pr-detailed-subjects-region-title {
            background: transparent;
            box-shadow: none;
          }

          .pr-detailed-layout-summary .pr-detailed-section {
            box-shadow: none;
          }
          .pr-detailed-layout-summary .pr-detailed-doc-header {
            margin-bottom: 1rem;
          }

          .pr-detailed-section--compact .pr-detailed-section-inner { padding-top: 0.65rem; padding-bottom: 0.65rem; }
          .pr-detailed-section--compact .pr-detailed-section-head { padding-top: 0.45rem; padding-bottom: 0.45rem; }

          #parent-report-detailed-print[data-display-mode="summary"] .pr-detailed-section { margin-bottom: 0.85rem; }
          #parent-report-detailed-print[data-display-mode="summary"] .pr-detailed-section-inner { padding: 0.75rem 0.9rem; }
          #parent-report-detailed-print[data-display-mode="summary"] .pr-detailed-subject-summary { font-size: 0.9rem; }

          .pr-detailed-tier-excellence {
            border-radius: 0.55rem;
            border: 1px solid rgba(167, 139, 250, 0.32);
            background: linear-gradient(160deg, rgba(76, 29, 149, 0.2), rgba(30, 41, 59, 0.32));
            padding: 0.65rem 0.85rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-excellence .pr-detailed-subheading { color: #e9d5ff; border-bottom-color: rgba(196, 181, 253, 0.35); }

          .pr-detailed-tier-strength {
            border-radius: 0.55rem;
            border: 1px solid rgba(52, 211, 153, 0.28);
            background: linear-gradient(160deg, rgba(6, 78, 59, 0.22), rgba(30, 41, 59, 0.3));
            padding: 0.65rem 0.85rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-strength .pr-detailed-subheading { color: #a7f3d0; border-bottom-color: rgba(52, 211, 153, 0.25); }

          .pr-detailed-tier-maintain {
            border-radius: 0.55rem;
            border: 1px solid rgba(56, 189, 248, 0.28);
            background: linear-gradient(160deg, rgba(12, 74, 110, 0.22), rgba(30, 41, 59, 0.3));
            padding: 0.65rem 0.85rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-maintain .pr-detailed-subheading { color: #bae6fd; border-bottom-color: rgba(56, 189, 248, 0.25); }

          .pr-detailed-tier-improving {
            border-radius: 0.55rem;
            border: 1px solid rgba(251, 191, 36, 0.3);
            background: linear-gradient(160deg, rgba(120, 53, 15, 0.22), rgba(30, 41, 59, 0.32));
            padding: 0.65rem 0.85rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-improving .pr-detailed-subheading { color: #fde68a; border-bottom-color: rgba(251, 191, 36, 0.28); }

          .pr-detailed-tier-attention {
            border-radius: 0.55rem;
            border: 1px solid rgba(248, 113, 113, 0.32);
            background: linear-gradient(160deg, rgba(127, 29, 29, 0.22), rgba(30, 41, 59, 0.32));
            padding: 0.65rem 0.85rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-attention .pr-detailed-subheading { color: #fecaca; border-bottom-color: rgba(248, 113, 113, 0.3); }

          .pr-detailed-tier-examples {
            border-radius: 0.5rem;
            border: 1px solid rgba(148, 163, 184, 0.22);
            background: rgba(30, 41, 59, 0.28);
            padding: 0.55rem 0.75rem;
            margin-top: 0.35rem;
          }
          .pr-detailed-tier-examples .pr-detailed-subheading { color: rgba(226, 232, 240, 0.85); border-bottom-color: rgba(148, 163, 184, 0.2); }

          .pr-detailed-callout-action {
            border-color: rgba(250, 204, 21, 0.28);
            background: rgba(66, 32, 6, 0.22);
          }
          .pr-detailed-callout-goal {
            border-color: rgba(251, 191, 36, 0.24);
            background: rgba(69, 26, 3, 0.18);
          }
          .pr-detailed-callout-label {
            display: block;
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.06em;
            color: rgba(253, 230, 138, 0.95);
            text-transform: uppercase;
          }

          .pr-detailed-topic-rec-block { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); }
          .pr-detailed-topic-rec-head {
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: rgba(165, 243, 252, 0.95);
            margin: 0 0 0.5rem 0;
          }
          .pr-detailed-topic-rec-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .pr-detailed-topic-first-card-wrap {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pr-detailed-topic-nextstep-card {
            border-radius: 0.55rem;
            padding: 0.65rem 0.85rem;
          }
          .pr-detailed-topic-nextstep--advance {
            border: 1px solid rgba(52, 211, 153, 0.42);
            background: linear-gradient(165deg, rgba(6, 78, 59, 0.34), rgba(22, 101, 52, 0.22));
          }
          .pr-detailed-topic-nextstep--maintain {
            border: 1px solid rgba(56, 189, 248, 0.36);
            background: linear-gradient(165deg, rgba(12, 74, 110, 0.3), rgba(30, 58, 95, 0.26));
          }
          .pr-detailed-topic-nextstep--remediate {
            border: 1px solid rgba(251, 191, 36, 0.4);
            background: linear-gradient(165deg, rgba(120, 53, 15, 0.3), rgba(69, 26, 3, 0.22));
          }
          .pr-detailed-topic-nextstep--drop {
            border: 1px solid rgba(248, 113, 113, 0.42);
            background: linear-gradient(165deg, rgba(127, 29, 29, 0.3), rgba(69, 10, 10, 0.22));
          }
          .pr-detailed-topic-metrics {
            font-size: 0.68rem;
            line-height: 1.45;
            color: rgba(207, 250, 254, 0.82);
            margin: 0 0 0.45rem 0;
          }
          .pr-detailed-topic-reason { font-size: 0.84rem; line-height: 1.5; color: rgba(255,255,255,0.9); margin: 0 0 0.45rem 0; }
          .pr-detailed-topic-parent {
            font-size: 0.82rem;
            line-height: 1.48;
            color: rgba(224, 242, 254, 0.95);
            margin: 0 0 0.35rem 0;
            padding: 0.35rem 0.45rem;
            border-radius: 0.35rem;
            background: rgba(30, 41, 59, 0.28);
            border-right: 3px solid rgba(56, 189, 248, 0.55);
          }
          .pr-detailed-topic-parent-label {
            font-weight: 800;
            color: rgba(125, 211, 252, 0.96);
          }
          .pr-detailed-topic-student-label {
            font-weight: 800;
            color: rgba(167, 243, 208, 0.96);
          }
          .pr-detailed-topic-student {
            font-size: 0.82rem;
            line-height: 1.48;
            color: rgba(209, 250, 229, 0.95);
            margin: 0;
            padding: 0.35rem 0.45rem;
            border-radius: 0.35rem;
            background: rgba(30, 41, 59, 0.28);
            border-right: 3px solid rgba(52, 211, 153, 0.5);
          }
          .pr-detailed-topic-badge {
            font-size: 0.65rem;
            font-weight: 800;
            padding: 0.15rem 0.45rem;
            border-radius: 0.35rem;
            white-space: normal;
            max-width: 11rem;
            text-align: right;
          }
          .pr-detailed-topic-badge--advance {
            border: 1px solid rgba(74, 222, 128, 0.5);
            color: #d1fae5;
            background: rgba(6, 78, 59, 0.5);
          }
          .pr-detailed-topic-badge--maintain {
            border: 1px solid rgba(125, 211, 252, 0.45);
            color: #e0f2fe;
            background: rgba(12, 74, 110, 0.48);
          }
          .pr-detailed-topic-badge--remediate {
            border: 1px solid rgba(251, 191, 36, 0.48);
            color: #fef3c7;
            background: rgba(120, 53, 15, 0.46);
          }
          .pr-detailed-topic-badge--drop {
            border: 1px solid rgba(252, 165, 165, 0.5);
            color: #fecaca;
            background: rgba(127, 29, 29, 0.46);
          }

          .pr-detailed-bullet-li {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @media print {
            @page {
              size: A4;
              margin: 10mm 8mm;
            }
            .pr-detailed-avoid-split {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            .pr-detailed-subheading {
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #111827 !important;
            }
            .no-pdf {
              display: none !important;
            }
            .pr-detailed-parent-activities,
            .no-pdf.pr-detailed-parent-activities {
              display: none !important;
            }
            .pr-detailed-page {
              background: #ffffff !important;
              color: #111827 !important;
              min-height: auto !important;
              padding: 0 !important;
            }
            .pr-detailed-page .max-w-4xl {
              max-width: none !important;
              width: auto !important;
              margin: 0 !important;
            }
            #parent-report-detailed-print {
              position: static !important;
              width: auto !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              font-size: 10pt;
              line-height: 1.48;
              color: #111827 !important;
            }
            #parent-report-detailed-print[data-display-mode="full"] {
              font-size: 10pt;
            }
            #parent-report-detailed-print[data-display-mode="summary"] {
              font-size: 10pt;
            }
            #parent-report-detailed-print,
            #parent-report-detailed-print * {
              color: #111827 !important;
              opacity: 1 !important;
              text-shadow: none !important;
              filter: none !important;
              mix-blend-mode: normal !important;
              -webkit-text-fill-color: #111827 !important;
            }
            #parent-report-detailed-print *::before,
            #parent-report-detailed-print *::after {
              opacity: 1 !important;
              filter: none !important;
              mix-blend-mode: normal !important;
            }

            /* Ink-safe print reset: remove washed-out translucent styles from utility classes. */
            #parent-report-detailed-print [class*="bg-"] {
              background: #ffffff !important;
              background-image: none !important;
            }
            #parent-report-detailed-print [class*="from-"],
            #parent-report-detailed-print [class*="to-"],
            #parent-report-detailed-print [class*="via-"] {
              background-image: none !important;
            }
            #parent-report-detailed-print [class*="text-"] {
              color: #111827 !important;
            }

            #parent-report-detailed-print h1 {
              font-size: 16.5pt !important;
              color: #020617 !important;
              margin: 0 0 4px 0 !important;
            }
            #parent-report-detailed-print .pr-detailed-section-title {
              font-size: 12pt !important;
              font-weight: 900 !important;
              color: #0f172a !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-title {
              font-size: 12pt !important;
              font-weight: 900 !important;
              color: #0f172a !important;
            }
            #parent-report-detailed-print .pr-detailed-subheading {
              font-size: 9pt !important;
              font-weight: 800 !important;
              color: #1e293b !important;
              border-bottom-color: #cbd5e1 !important;
            }
            #parent-report-detailed-print .pr-detailed-body-text,
            #parent-report-detailed-print .pr-detailed-tier-inner li {
              color: #1c1917 !important;
            }
            #parent-report-detailed-print .pr-detailed-muted {
              color: #1f2937 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-muted * {
              color: #1f2937 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-mode-hint {
              color: #111827 !important;
              font-weight: 800 !important;
            }
            #parent-report-detailed-print .pr-detailed-future-compare {
              color: #44403c !important;
              background: #f5f5f4 !important;
              border: 1px solid #d6d3d1 !important;
            }

            #parent-report-detailed-print .pr-detailed-section {
              background: #fff !important;
              border: 1px solid #d4d4d8 !important;
              margin-bottom: 10px !important;
              box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            #parent-report-detailed-print .pr-detailed-section-head {
              background: #f8fafc !important;
              border-bottom: 1px solid #d4d4d8 !important;
            }
            #parent-report-detailed-print .pr-detailed-section--compact .pr-detailed-section-inner {
              padding: 6px 9px !important;
            }
            #parent-report-detailed-print .pr-detailed-section--compact .pr-detailed-section-head {
              padding: 5px 9px !important;
            }

            #parent-report-detailed-print .pr-detailed-subjects-region {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 0 14px 0 !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            #parent-report-detailed-print .pr-detailed-subjects-region-title {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              border-bottom: 1px solid #d4d4d8 !important;
              padding-bottom: 6px !important;
              margin: 0 0 10px 0 !important;
            }

            #parent-report-detailed-print .pr-detailed-subject-block {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
              margin-bottom: 0 !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-stack {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-heading {
              background: transparent !important;
              border: none !important;
              border-bottom: 2px solid #334155 !important;
              padding: 0 0 6px 0 !important;
              margin: 0 0 8px 0 !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-heading .pr-detailed-subject-title {
              border-bottom: none !important;
              padding-bottom: 0 !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-inner {
              padding: 8px 0 0 0 !important;
            }

            #parent-report-detailed-print .pr-detailed-subject-summary,
            #parent-report-detailed-print .pr-detailed-subject-letter,
            #parent-report-detailed-print .pr-detailed-tier-excellence,
            #parent-report-detailed-print .pr-detailed-tier-strength,
            #parent-report-detailed-print .pr-detailed-tier-maintain,
            #parent-report-detailed-print .pr-detailed-tier-improving,
            #parent-report-detailed-print .pr-detailed-tier-attention,
            #parent-report-detailed-print .pr-detailed-tier-examples,
            #parent-report-detailed-print .pr-detailed-callout-action,
            #parent-report-detailed-print .pr-detailed-callout-goal,
            #parent-report-detailed-print .pr-detailed-topic-nextstep-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              border-radius: 6px !important;
              padding: 8px 10px !important;
              margin-bottom: 8px !important;
              box-shadow: none !important;
            }

            #parent-report-detailed-print .pr-detailed-subject-summary {
              background: #ffffff !important;
              border: 1px solid #d6d3d1 !important;
              color: #1c1917 !important;
            }

            #parent-report-detailed-print .pr-detailed-tier-excellence {
              background: #ffffff !important;
              border: 1.5px solid #6d28d9 !important;
              border-right: 4px solid #6d28d9 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-strength {
              background: #ffffff !important;
              border: 1.5px solid #047857 !important;
              border-right: 4px solid #059669 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-maintain {
              background: #ffffff !important;
              border: 1.5px solid #0369a1 !important;
              border-right: 4px solid #0284c7 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-improving {
              background: #ffffff !important;
              border: 1.5px solid #b45309 !important;
              border-right: 4px solid #d97706 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-attention {
              background: #ffffff !important;
              border: 1.5px solid #b91c1c !important;
              border-right: 4px solid #dc2626 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-examples {
              background: #ffffff !important;
              border: 1.5px solid #64748b !important;
              border-right: 4px solid #94a3b8 !important;
            }

            #parent-report-detailed-print .pr-detailed-tier-excellence .pr-detailed-subheading { color: #5b21b6 !important; border-bottom-color: #ddd6fe !important; }
            #parent-report-detailed-print .pr-detailed-tier-strength .pr-detailed-subheading { color: #047857 !important; border-bottom-color: #a7f3d0 !important; }
            #parent-report-detailed-print .pr-detailed-tier-maintain .pr-detailed-subheading { color: #0369a1 !important; border-bottom-color: #bae6fd !important; }
            #parent-report-detailed-print .pr-detailed-tier-improving .pr-detailed-subheading { color: #b45309 !important; border-bottom-color: #fde68a !important; }
            #parent-report-detailed-print .pr-detailed-tier-attention .pr-detailed-subheading { color: #b91c1c !important; border-bottom-color: #fecaca !important; }
            #parent-report-detailed-print .pr-detailed-tier-examples .pr-detailed-subheading { color: #334155 !important; }

            #parent-report-detailed-print .pr-detailed-tier-inner .pr-detailed-muted {
              color: #111827 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-examples .pr-detailed-muted,
            #parent-report-detailed-print .pr-detailed-tier-examples li {
              color: #111827 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-tier-excellence *,
            #parent-report-detailed-print .pr-detailed-tier-strength *,
            #parent-report-detailed-print .pr-detailed-tier-maintain *,
            #parent-report-detailed-print .pr-detailed-tier-improving *,
            #parent-report-detailed-print .pr-detailed-tier-attention * {
              opacity: 1 !important;
            }

            #parent-report-detailed-print .pr-detailed-callout-action {
              background: #fffbeb !important;
              border: 1.5px solid #ca8a04 !important;
            }
            #parent-report-detailed-print .pr-detailed-callout-goal {
              background: #fff7ed !important;
              border: 1.5px solid #ea580c !important;
            }
            #parent-report-detailed-print .pr-detailed-callout-action .pr-detailed-body-text,
            #parent-report-detailed-print .pr-detailed-callout-goal .pr-detailed-body-text {
              color: #1c1917 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-callout-label {
              color: #111827 !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }

            #parent-report-detailed-print .pr-detailed-topic-rec-block {
              margin-top: 6px !important;
              padding-top: 0 !important;
              border-top: none !important;
              background: transparent !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-rec-head {
              color: #0f766e !important;
              font-weight: 800 !important;
              opacity: 1 !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
              margin: 0 0 6px 0 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-first-card-wrap {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-rec-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep--advance {
              background: #ffffff !important;
              border: 1.5px solid #059669 !important;
              border-right: 4px solid #10b981 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep--maintain {
              background: #ffffff !important;
              border: 1.5px solid #0369a1 !important;
              border-right: 4px solid #0ea5e9 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep--remediate {
              background: #ffffff !important;
              border: 1.5px solid #d97706 !important;
              border-right: 4px solid #f59e0b !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep--drop {
              background: #ffffff !important;
              border: 1.5px solid #b91c1c !important;
              border-right: 4px solid #ef4444 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep-card .pr-detailed-body-text {
              color: #111827 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-nextstep-card .pr-detailed-body-text.font-bold {
              font-weight: 800 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-metrics {
              color: #111827 !important;
              opacity: 1 !important;
              font-weight: 700 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-reason {
              color: #111827 !important;
              opacity: 1 !important;
              font-weight: 700 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-phase2 p,
            #parent-report-detailed-print .pr-detailed-topic-phase2 span {
              color: #111827 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-parent,
            #parent-report-detailed-print .pr-detailed-topic-parent * {
              color: #0f172a !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-student,
            #parent-report-detailed-print .pr-detailed-topic-student * {
              color: #0f172a !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-parent-label {
              color: #0369a1 !important;
              font-weight: 800 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-student-label {
              color: #047857 !important;
              font-weight: 800 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-parent {
              background: #ffffff !important;
              border-right-color: #0284c7 !important;
              border: 1px solid #bfdbfe !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-student {
              background: #ffffff !important;
              border-right-color: #059669 !important;
              border: 1px solid #bbf7d0 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-badge {
              opacity: 1 !important;
              font-weight: 800 !important;
              max-width: 11rem !important;
              text-align: right !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-badge--advance {
              background: #d1fae5 !important;
              border: 1px solid #059669 !important;
              color: #065f46 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-badge--maintain {
              background: #dbeafe !important;
              border: 1px solid #2563eb !important;
              color: #1e3a8a !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-badge--remediate {
              background: #ffedd5 !important;
              border: 1px solid #ea580c !important;
              color: #9a3412 !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-badge--drop {
              background: #fee2e2 !important;
              border: 1px solid #dc2626 !important;
              color: #991b1b !important;
            }
            #parent-report-detailed-print .pr-detailed-subject-metrics {
              color: #334155 !important;
              opacity: 1 !important;
              font-weight: 700 !important;
            }

            #parent-report-detailed-print .pr-detailed-summary-subject {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
              margin-bottom: 12px !important;
            }
            #parent-report-detailed-print .pr-detailed-mini-heading {
              color: #0f172a !important;
              font-weight: 800 !important;
              opacity: 1 !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            #parent-report-detailed-print .pr-detailed-doc-title {
              color: #020617 !important;
            }

            #parent-report-detailed-print table {
              border-collapse: collapse !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            #parent-report-detailed-print tr { break-inside: auto !important; page-break-inside: auto !important; }
            #parent-report-detailed-print th,
            #parent-report-detailed-print td {
              border: 1px solid #a8a29e !important;
              padding: 5px 7px !important;
              color: #1c1917 !important;
            }
            #parent-report-detailed-print thead {
              background: #e7e5e4 !important;
            }

            #parent-report-detailed-print[data-display-mode="summary"] .pr-detailed-section { margin-bottom: 7px !important; }
            #parent-report-detailed-print[data-display-mode="summary"] .pr-detailed-summary-subject { margin-bottom: 8px !important; }

            #parent-report-detailed-print .pr-detailed-exec-summary .pr-detailed-subheading {
              color: #0f172a !important;
              border-bottom-color: #cbd5e1 !important;
            }
            #parent-report-detailed-print .pr-detailed-phase3-dl {
              border: 1px solid #e2e8f0 !important;
              border-radius: 6px !important;
              padding: 8px 10px !important;
              background: #fafafa !important;
            }
            #parent-report-detailed-print .pr-detailed-topic-phase2 {
              border-top-color: #d4d4d8 !important;
            }

            #parent-report-detailed-print .pr-detailed-plan-item,
            #parent-report-detailed-print .pr-detailed-goal-item {
              break-inside: auto !important;
              page-break-inside: auto !important;
              border-radius: 6px !important;
              padding: 8px 10px !important;
            }
            #parent-report-detailed-print .pr-detailed-plan-item {
              background: #ffffff !important;
              border: 1px solid #64748b !important;
              color: #111827 !important;
            }
            #parent-report-detailed-print .pr-detailed-goal-item {
              background: #ffffff !important;
              border: 1px solid #64748b !important;
              color: #111827 !important;
            }
            #parent-report-detailed-print .pr-detailed-bullet-li {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            #parent-report-detailed-print .parent-report-important-disclaimer {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-top: 12px !important;
              margin-bottom: 4px !important;
              padding: 10px 12px !important;
              background: #f1f5f9 !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 6px !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-detailed-print .parent-report-important-disclaimer-title {
              color: #0f172a !important;
              font-size: 10pt !important;
              font-weight: 800 !important;
              margin: 0 0 8px 0 !important;
              opacity: 1 !important;
            }
            #parent-report-detailed-print .parent-report-important-disclaimer-body p,
            #parent-report-detailed-print .parent-report-important-disclaimer-body strong {
              color: #334155 !important;
              opacity: 1 !important;
              font-size: 9pt !important;
              line-height: 1.52 !important;
            }
            #parent-report-detailed-print .parent-report-important-disclaimer-body strong {
              font-weight: 700 !important;
            }

            /* Parent AI insight — screen only, never print/PDF */
            .parent-report-parent-ai-insight {
              display: none !important;
            }

          }
        `}</style>
      </Head>
      <div
        className={`pr-detailed-page min-h-screen bg-[#141d32] text-white p-2.5 md:px-5 md:py-5 ${
          payload ? `pr-detailed-layout-${displayMode}` : ""
        }`}
        dir="rtl"
        style={{
          paddingTop: "calc(var(--head-h, 56px) - 28px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div className="max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
          <div className="no-pdf flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={backHref}
                className="inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all"
              >
                ← חזרה לדוח המקוצר
              </Link>
            </div>
            <ModeToggle />
          </div>
          {payload ? (
            <>
              <div className="no-pdf">
                <ParentReportInsight explanation={parentAiExplanation} />
              </div>
              <div className="no-pdf mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-2">
                <ParentCopilotShell payload={payload} />
              </div>
            </>
          ) : null}

          {noPlayer ? (
            <p className="text-center text-white/80">
              לא נמצא שם שחקן. הזן שם בדף הדוח הרגיל או התחבר מחדש.
            </p>
          ) : !payload ? (
            <p className="text-center text-white/80">לא ניתן לטעון את הדוח המקיף.</p>
          ) : !periodHasPracticeEvidence ? (
            <div className="text-center max-w-md mx-auto text-white/70">
              <div className="text-4xl mb-4">📊</div>
              <p>{PARENT_REPORT_PERIOD_EMPTY_STATE_HE}</p>
            </div>
          ) : (
            <>
              <div
                id="parent-report-detailed-print"
                data-display-mode={displayMode}
                className={displayMode === "summary" ? "pr-detailed-print-root pr-detailed-print-root--summary" : "pr-detailed-print-root pr-detailed-print-root--full"}
              >
                {/* A */}
                <header className="pr-detailed-doc-header mb-6 text-center border-b border-white/15 pb-4">
                  <h1 className="pr-detailed-doc-title text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">
                    דוח מקיף לתקופה
                  </h1>
                  <p className="pr-detailed-mode-hint text-xs font-semibold text-amber-200/90 mb-1">
                    {displayMode === "summary" ? "דוח מקוצר" : "דוח מלא"}
                  </p>
                  <p className="pr-detailed-body-text text-white/85 text-sm md:text-base">
                    דוח הורים מקיף - מבוסס על התאריכים הנבחרים
                  </p>
                  <p className="pr-detailed-muted text-sm mt-2">
                    טווח תאריכים: {pi.startDateLabelHe} – {pi.endDateLabelHe}
                    <span className="text-white/40 mx-1">|</span>
                    מצב תקופה:{" "}
                    {pi.period === "custom" ? "תאריכים מותאמים" : pi.period === "month" ? "חודש" : "שבוע"}
                  </p>
                </header>

                {/* B - סיכום לתקופה (תוכן ExecutiveSummarySection ללא שינוי) */}
                <SectionCard title="סיכום לתקופה" compact={displayMode === "summary"}>
                  <ExecutiveSummarySection
                    es={normalizeExecutiveSummary(payload)}
                    compact={displayMode === "summary"}
                  />
                </SectionCard>

                {/* C */}
                <SectionCard title="מה עשינו בתקופה הזאת" compact={displayMode === "summary"}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                    <div className="text-xs text-white/55 mb-1">זמן כולל</div>
                    <div className="text-xl font-bold text-blue-300">
                      {payload.overallSnapshot.totalTime} דק׳
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                    <div className="text-xs text-white/55 mb-1">שאלות</div>
                    <div className="text-xl font-bold text-emerald-300">
                      {payload.overallSnapshot.totalQuestions}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
                    <div className="text-xs text-white/55 mb-1">דיוק כללי</div>
                    <div className="text-xl font-bold text-amber-300">
                      {payload.overallSnapshot.overallAccuracy}%
                    </div>
                  </div>
                </div>
                <p className="pr-detailed-mini-heading font-bold text-white/90 mb-2 text-sm mt-1">כיסוי לפי מקצוע</p>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-sm text-right">
                    <thead>
                      <tr className="border-b border-white/15 bg-white/5">
                        <th className="p-2 font-semibold">מקצוע</th>
                        <th className="p-2 font-semibold">שאלות</th>
                        <th className="p-2 font-semibold">דיוק</th>
                        <th className="p-2 font-semibold">זמן (דק׳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payload.overallSnapshot.subjectCoverage.map((row) => (
                        <tr key={row.subject} className="border-b border-white/10">
                          <td className="p-2">{row.subjectLabelHe}</td>
                          <td className="p-2">{row.questionCount}</td>
                          <td className="p-2">{row.accuracy}%</td>
                          <td className="p-2">{row.timeMinutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                  {payload.overallSnapshot.sparseSubjectsHe?.length ? (
                    <div>
                      <p className="pr-detailed-mini-heading font-semibold text-white/82 mb-1">
                        מקצועות עם מעט נתונים בתקופה
                      </p>
                      <Bullets
                        items={payload.overallSnapshot.sparseSubjectsHe}
                        volumeQuestionsTotal={Number(payload.overallSnapshot?.totalQuestions) || 0}
                      />
                    </div>
                  ) : null}
                  <div>
                    <p className="pr-detailed-mini-heading font-semibold text-white/82 mb-1">מקצועות בולטים</p>
                    <Bullets
                      items={payload.overallSnapshot.notableSubjectsHe}
                      volumeQuestionsTotal={Number(payload.overallSnapshot?.totalQuestions) || 0}
                    />
                  </div>
                </div>
                </SectionCard>

                {displayMode === "full" ? (
                  <ParentAssignedActivitiesSection rows={payload?.parentAssignedActivitiesInPeriod} />
                ) : null}

                {/* D - אותו payload; מלא/מקוצר; כותרת אזור + לכל מקצוע כותרת + כרטיסים פנימיים בלבד */}
                {displayMode === "summary" ? (
                  <section
                    className="pr-detailed-subjects-region mb-5 md:mb-6 min-w-0"
                    aria-labelledby="pr-detailed-subjects-heading-summary"
                  >
                    <h2
                      id="pr-detailed-subjects-heading-summary"
                      className="pr-detailed-subjects-region-title pr-detailed-section-title text-base md:text-lg font-extrabold tracking-tight text-white m-0 mb-3 md:mb-4 pb-2 border-b border-white/10"
                    >
                      מקוצר: מילה לכל מקצוע
                    </h2>
                    <div className="space-y-4">
                      {visibleSubjectProfiles.map((sp) => (
                        <SubjectSummaryBlock key={sp.subject} sp={sp} />
                      ))}
                      {!visibleSubjectProfiles.length ? (
                        <p className="pr-detailed-muted text-sm">אין מקצועות עם מספיק נתונים להצגה בתקופה שנבחרה.</p>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  <section
                    className="pr-detailed-subjects-region mb-5 md:mb-6 min-w-0"
                    aria-labelledby="pr-detailed-subjects-heading-full"
                  >
                    <h2
                      id="pr-detailed-subjects-heading-full"
                      className="pr-detailed-subjects-region-title pr-detailed-section-title text-base md:text-lg font-extrabold tracking-tight text-white m-0 mb-3 md:mb-4 pb-2 border-b border-white/10"
                    >
                      מקצועות הלימוד
                    </h2>
                    <div className="space-y-6">
                      {visibleSubjectProfiles.map((sp) => (
                        <div key={sp.subject} className="pr-detailed-subject-block pr-detailed-subject-stack min-w-0">
                          <div className="pr-detailed-subject-heading">
                            <h3 className="pr-detailed-subject-title text-lg font-bold text-white m-0 tracking-tight pb-2 border-b border-white/12">
                              {sp.subjectLabelHe}
                            </h3>
                            <p className="pr-detailed-subject-metrics text-xs md:text-sm m-0 mt-1 text-white/75">
                              שאלות: {Number(sp?.subjectQuestionCount) || 0} | דיוק: {Number(sp?.subjectAccuracy) || 0}%
                            </p>
                          </div>
                          <div className="pr-detailed-subject-inner space-y-4 pt-3">
                            <SubjectPhase3Insights sp={sp} compact={false} />
                            <SubjectParentLetter sp={sp} />
                            {sp.evidenceExamples?.length ? (
                              <div className="pr-detailed-tier-examples">
                                <p className="pr-detailed-body-text text-sm m-0 mb-2 text-white/[0.82]">
                                  דוגמאות מהתרגול - לעיון ההורים, בלי צורך לעבור על הכול בבת אחת.
                                </p>
                                <ul className="pr-detailed-muted text-xs space-y-1.5 m-0 list-none pr-0 leading-relaxed">
                                  {sp.evidenceExamples.map((e, idx) => (
                                    <li key={idx} className="pr-0 pr-detailed-bullet-li">
                                      {e.type === "mistake"
                                        ? "שאלה שבה כדאי לעצור ולקרוא שוב את הניסוח"
                                        : "שאלה שבה הכיוון היה נכון"}
                                      {e.exerciseText ? `: ${String(e.exerciseText).slice(0, 140)}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {sp.topicOverviewRows?.length ? (
                              <div className="pr-detailed-topic-overview-block">
                                <p className="pr-detailed-topic-rec-head">תמונת מצב לפי נושאים</p>
                                <div className="space-y-2">
                                  {sp.topicOverviewRows.map((row) => (
                                    <div
                                      key={row.topicRowKey}
                                      className="pr-detailed-topic-overview-item rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5"
                                    >
                                      <div className="pr-detailed-body-text font-bold text-white/95 leading-snug">
                                        {row.narrativeTitleHe}
                                      </div>
                                      {row.gradeRelationSublineHe ? (
                                        <p className="pr-detailed-muted text-xs m-0 mt-0.5 text-white/60">
                                          {row.gradeRelationSublineHe}
                                        </p>
                                      ) : null}
                                      <p className="pr-detailed-body-text text-sm m-0 mt-1.5 text-white/[0.88]">
                                        {row.overviewStatusHe} · {row.questions} שאלות · דיוק {row.accuracy}%
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {sp.topicRecommendations?.length ? (
                              <div className="pr-detailed-topic-rec-block">
                                <p className="pr-detailed-topic-rec-head">נושאים שדורשים ליווי בתקופה שנבחרה</p>
                                <div className="space-y-2.5">
                                  {sp.topicRecommendations.map((tr, idx) => {
                                    const tv = topicNextStepVisualVariant(tr.recommendedNextStep);
                                    const nar = buildTopicRecommendationNarrative(tr);
                                    return (
                                      <div key={tr.topicRowKey} className={idx === 0 ? "pr-detailed-topic-first-card-wrap" : ""}>
                                        <div
                                          className={`pr-detailed-topic-nextstep-card pr-detailed-topic-rec-item pr-detailed-topic-nextstep--${tv}`}
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                            <div className="min-w-0 flex-1">
                                              <span className="pr-detailed-body-text font-bold text-white/95 leading-snug block">
                                                {tr.narrativeTitleHe || tr.labelHe || tr.displayName}
                                              </span>
                                              {tr.gradeRelationSublineHe ? (
                                                <p className="pr-detailed-muted text-xs m-0 mt-0.5 text-white/60">
                                                  {tr.gradeRelationSublineHe}
                                                </p>
                                              ) : null}
                                            </div>
                                            <span
                                              className={`pr-detailed-topic-badge shrink-0 pr-detailed-topic-badge--${tv}`}
                                            >
                                              {tr.recommendedStepLabelHe}
                                            </span>
                                          </div>
                                          <p className="pr-detailed-body-text text-sm leading-relaxed m-0 mt-2 text-white/[0.9]">
                                            {nar.snapshot}
                                          </p>
                                          {nar.homeLine ? (
                                            <p className="pr-detailed-body-text text-sm leading-relaxed m-0 mt-2.5 text-amber-100/95">
                                              {nar.homeLine}
                                            </p>
                                          ) : null}
                                          <TopicRecommendationExplainStrip tr={tr} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {!visibleSubjectProfiles.length ? (
                        <p className="pr-detailed-muted text-sm">אין מקצועות עם מספיק נתונים להצגה בתקופה שנבחרה.</p>
                      ) : null}
                    </div>
                  </section>
                )}

                {/* cross insights - part of structure; placed after subjects for flow */}
                <SectionCard title="מה שחוזר בכמה מקצועות" compact={displayMode === "summary"}>
                <Bullets
                  items={(payload.crossSubjectInsights.bulletsHe || []).filter(
                    (line) => !/^מקצועות שלא תורגלו/u.test(String(line || "")),
                  )}
                  volumeQuestionsTotal={Number(payload.overallSnapshot?.totalQuestions) || 0}
                />
                {payload.crossSubjectInsights.dataQualityNoteHe ? (
                  <p className="text-sm text-amber-200/90 mt-2">{payload.crossSubjectInsights.dataQualityNoteHe}</p>
                ) : null}
                </SectionCard>

                {/* E */}
                <SectionCard title="רעיונות קצרים לבית" compact={displayMode === "summary"}>
                  <PlanItemCards
                    items={payload.homePlan.itemsHe}
                    windowTotalQuestions={Number(payload.overallSnapshot?.totalQuestions) || 0}
                  />
                </SectionCard>

                {/* F */}
                <SectionCard title="כיוון לימים הבאים" compact={displayMode === "summary"}>
                  <GoalItemCards
                    items={payload.nextPeriodGoals.itemsHe}
                    windowTotalQuestions={Number(payload.overallSnapshot?.totalQuestions) || 0}
                  />
                </SectionCard>

                <ParentReportImportantDisclaimer />
              </div>

              <div className="no-pdf mt-8 pt-5 border-t border-white/15 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <button
                  type="button"
                  onClick={() => printWithMode("full")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-sky-600/85 border border-sky-400/50 hover:bg-sky-600 text-white transition-all"
                >
                  🖨️ הדפס מלא
                </button>
                <button
                  type="button"
                  onClick={() => printWithMode("summary")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-600/85 border border-amber-400/50 hover:bg-amber-600 text-white transition-all"
                >
                  🖨️ הדפס תקציר
                </button>
                <Link
                  href={backHref}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all text-center"
                >
                  חזרה לדוח המקוצר
                </Link>
                <Link
                  href="/learning"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold bg-violet-600/50 border border-violet-300/40 hover:bg-violet-600/65 text-white transition-all text-center"
                >
                  חזרה ללמידה
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
