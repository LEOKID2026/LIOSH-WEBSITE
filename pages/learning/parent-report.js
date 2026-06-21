import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import { ParentReportExitNav } from "../../components/parent/ParentReportExitNav.jsx";
import { ParentReportImportantDisclaimer } from "../../components/ParentReportImportantDisclaimer";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { getMathReportBucketDisplayName, getTopicName, getEnglishTopicName, getScienceTopicName, getHebrewTopicName, getMoledetGeographyTopicName, exportReportToPDF } from "../../utils/math-report-generator";
import {
  enrichParentReportWithParentAi,
  getDeterministicParentAiExplanationFromParentReportV2,
} from "../../utils/parent-report-ai/parent-report-ai-adapter";
import { ParentReportInsight } from "../../components/ParentReportInsight.jsx";
import { ParentDiagnosticExplanationBlock } from "../../components/parent-diagnostic-explanation-block.jsx";
import ParentReportParentSections from "../../components/parent/ParentReportParentSections.jsx";
import ParentReportDataHealthNote from "../../components/parent/ParentReportDataHealthNote.jsx";
import {
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  moledetGeographyReportTopicKeyPrefix,
} from "../../lib/learning-shared/moledet-geography-subject-id.js";

const ParentCopilotShellLazy = dynamic(
  () => import("../../components/parent-copilot/parent-copilot-shell.jsx"),
  { ssr: false }
);
import { improvingDiagnosticsDisplayLabelHe } from "../../utils/learning-patterns-analysis";
import {
  stripTechnicalParensForParentDiagnosticsHe as stripTechnicalParensHe,
  shortReportDiagnosticsParentVisibleHe as diagnosticParentVisibleTextHe,
  trendCompactLineHe,
  truncateHe,
  confidenceBadgeLabelHe,
} from "../../utils/parent-report-ui-explain-he";
import { TOPIC_EVIDENCE_THRESHOLDS } from "../../utils/parent-report-topic-evidence.js";
import { normalizeParentFacingHe } from "../../utils/parent-report-language/parent-facing-normalize-he.js";
import {
  diagnosticPrimarySourceParentLabelHe,
} from "../../utils/parent-report-language/index.js";
import {
  formatParentReportGradeHe,
  formatParentReportLevelHe,
  formatParentReportModeHe,
  formatParentReportSubjectHe,
} from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import { deriveParentDataPresenceForDiagnosticsView } from "../../utils/parent-data-presence.js";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import Head from "next/head";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ParentReportShortContractPreview from "../../components/parent-report-short-contract-preview.jsx";
import ReportDateRangeControl from "../../components/reporting/ReportDateRangeControl.jsx";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { postParentCopilotTurn } from "../../lib/parent-client/copilot-turn-api.js";
import {
  runParentReportGenerationFromApiBody,
  computeReportRangeForParentApi,
  resolveParentReportGenerationArgs,
} from "../../lib/learning-supabase/parent-report-from-api-payload.js";
import {
  parentReportRemoteDataUrl,
  parseParentReportRemoteSource,
} from "../../lib/teacher-portal/parent-report-remote-source.js";
import { PARENT_REPORT_PORTAL_GATE } from "../../lib/parent-report-server-truth.js";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";

function parentReportPresetDays(period, customDates) {
  if (customDates) return null;
  if (period === "day") return "day";
  if (period === "schoolYear") return "schoolYear";
  if (period === "month") return 30;
  return 7;
}

function parentReportChartLabelFromAllItemKey(key, data) {
  const labelFrom = (subjectId, bucketLike) => {
    const b = String(bucketLike ?? "").trim();
    const mapped =
      subjectId === "math"
        ? getMathReportBucketDisplayName(b)
        : subjectId === "geometry"
          ? getTopicName(b)
          : subjectId === "english"
            ? getEnglishTopicName(b)
            : subjectId === "science"
              ? getScienceTopicName(b)
              : subjectId === "hebrew"
                ? getHebrewTopicName(b)
                : subjectId === MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID
                  ? getMoledetGeographyTopicName(b)
                  : b;
    return normalizeParentFacingHe(String(mapped || b || "").trim());
  };
  const displayName = String(data?.displayName || "").trim();
  const bucketKey = String(data?.bucketKey || "").trim();
  if (key.startsWith("math_")) {
    const rest = key.slice("math_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("math", bucketKey || displayName || fallbackBucket);
  }
  if (key.startsWith("geometry_")) {
    const rest = key.slice("geometry_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("geometry", bucketKey || displayName || fallbackBucket);
  }
  if (key.startsWith("english_")) {
    const rest = key.slice("english_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("english", bucketKey || displayName || fallbackBucket);
  }
  if (key.startsWith("science_")) {
    const rest = key.slice("science_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("science", bucketKey || displayName || fallbackBucket);
  }
  if (key.startsWith("hebrew_")) {
    const rest = key.slice("hebrew_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("hebrew", bucketKey || displayName || fallbackBucket);
  }
  const mgPrefix = moledetGeographyReportTopicKeyPrefix();
  if (key.startsWith(mgPrefix)) {
    const rest = key.slice(mgPrefix.length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID, bucketKey || displayName || fallbackBucket);
  }
  if (displayName) return normalizeParentFacingHe(displayName);
  return normalizeParentFacingHe(key);
}

function subjectTopicLabelForParentHe(subjectId, data, fallbackTopic) {
  const cleanFromRow = String(data?.cleanTopicLabelHe || data?.rowIdentityV1?.cleanTopicLabelHe || "").trim();
  if (cleanFromRow) return normalizeParentFacingHe(cleanFromRow);
  const displayName = String(data?.displayName || "").trim();
  const bucket = String(data?.bucketKey ?? fallbackTopic ?? "").trim();
  const raw =
    subjectId === "math"
      ? getMathReportBucketDisplayName(bucket || displayName)
      : subjectId === "geometry"
        ? getTopicName(bucket || displayName)
        : subjectId === "english"
          ? getEnglishTopicName(bucket || displayName)
          : subjectId === "science"
            ? getScienceTopicName(bucket || displayName)
            : subjectId === "hebrew"
              ? getHebrewTopicName(bucket || displayName)
              : subjectId === MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID
                ? getMoledetGeographyTopicName(bucket || displayName)
                : displayName || bucket;
  return normalizeParentFacingHe(String(raw || displayName || bucket || "").trim());
}

/** צבעי מקצוע עקביים בגרפים */
const SUBJECT_CHART_COLORS = {
  math: "#3b82f6",
  geometry: "#10b981",
  english: "#a855f7",
  science: "#22c55e",
  hebrew: "#f97316",
  moledet: "#06b6d4",
};

function sumTopicMapMinutes(map) {
  return Object.values(map || {}).reduce((a, r) => a + (Number(r?.timeMinutes) || 0), 0);
}

const INSUFFICIENT_TREND_SESSIONS_RE = /אין\s+מספיק\s+מפגש/;

/** שורת משנה בעמודת סטטוס — שורה קצרה מנתוני שורה קיימים בלבד. */
function ParentReportRowDiagnosticsFootnote({ data }) {
  const row = data && typeof data === "object" ? data : null;
  if (!row) return null;
  const q = Number(row.questions) || 0;
  const minQuestionsForStatus = TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate;
  const suffLabel = String(row.dataSufficiencyLabelHe || "").trim();
  const fromTrendSummary = String(row.trend?.summaryHe || "").trim();
  const trendShowsInsufficientSessions =
    !!fromTrendSummary && INSUFFICIENT_TREND_SESSIONS_RE.test(fromTrendSummary);

  if (
    q >= minQuestionsForStatus &&
    suffLabel &&
    (!fromTrendSummary || trendShowsInsufficientSessions)
  ) {
    const t = diagnosticParentVisibleTextHe(truncateHe(suffLabel, 90));
    if (t) {
      return (
        <div className="text-[9px] md:text-[10px] text-white/55 leading-tight max-w-[14rem] min-w-0 w-full mx-auto text-center line-clamp-2 break-words">
          {t}
        </div>
      );
    }
  }
  if (fromTrendSummary && !(q >= minQuestionsForStatus && trendShowsInsufficientSessions)) {
    const t = diagnosticParentVisibleTextHe(fromTrendSummary);
    if (t) {
      return (
        <div className="text-[9px] md:text-[10px] text-white/55 leading-tight max-w-[14rem] min-w-0 w-full mx-auto text-center line-clamp-2 break-words">
          {t}
        </div>
      );
    }
  }
  const compact = trendCompactLineHe(row.trend);
  if (
    compact &&
    !(q >= minQuestionsForStatus && INSUFFICIENT_TREND_SESSIONS_RE.test(compact))
  ) {
    return (
      <div className="text-[9px] md:text-[10px] text-white/55 leading-tight max-w-[14rem] min-w-0 w-full mx-auto text-center line-clamp-2 break-words">
        {diagnosticParentVisibleTextHe(compact)}
      </div>
    );
  }
  const dt = Array.isArray(row.decisionTrace) ? row.decisionTrace : [];
  for (let i = dt.length - 1; i >= 0; i--) {
    const d = sanitizeDiagnosticsFootnoteDetailHe(String(dt[i]?.detailHe || "").trim());
    if (d) {
      return (
        <div className="text-[9px] md:text-[10px] text-white/55 leading-tight max-w-[14rem] min-w-0 w-full mx-auto text-center line-clamp-2 break-words">
          {diagnosticParentVisibleTextHe(d)}
        </div>
      );
    }
  }
  return null;
}

function diagnosticCardConfidenceLabelHe(raw) {
  const x = String(raw || "").trim().toLowerCase();
  if (x === "moderate") return confidenceBadgeLabelHe("medium");
  if (x === "medium" || x === "high" || x === "low") return confidenceBadgeLabelHe(x);
  if (x === "contradictory") return "לקרוא בזהירות — הסימנים לא אחידים";
  return diagnosticParentVisibleTextHe(raw || "");
}

function buildSubjectOverviewRows(report) {
  if (!report?.summary) return [];
  const s = report.summary;
  return [
    {
      key: "math",
      name: "חשבון",
      minutes: sumTopicMapMinutes(report.mathOperations),
      questions: Number(s.mathQuestions) || 0,
      accuracy: Math.round(Number(s.mathAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.math,
    },
    {
      key: "geometry",
      name: "גאומטריה",
      minutes: sumTopicMapMinutes(report.geometryTopics),
      questions: Number(s.geometryQuestions) || 0,
      accuracy: Math.round(Number(s.geometryAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.geometry,
    },
    {
      key: "english",
      name: "אנגלית",
      minutes: sumTopicMapMinutes(report.englishTopics),
      questions: Number(s.englishQuestions) || 0,
      accuracy: Math.round(Number(s.englishAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.english,
    },
    {
      key: "science",
      name: "מדעים",
      minutes: sumTopicMapMinutes(report.scienceTopics),
      questions: Number(s.scienceQuestions) || 0,
      accuracy: Math.round(Number(s.scienceAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.science,
    },
    {
      key: "hebrew",
      name: "עברית",
      minutes: sumTopicMapMinutes(report.hebrewTopics),
      questions: Number(s.hebrewQuestions) || 0,
      accuracy: Math.round(Number(s.hebrewAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.hebrew,
    },
    {
      key: "moledet",
      name: "מולדת וגאוגרפיה",
      minutes: sumTopicMapMinutes(report.moledetGeographyTopics),
      questions: Number(s.moledetGeographyQuestions) || 0,
      accuracy: Math.round(Number(s.moledetGeographyAccuracy) || 0),
      fill: SUBJECT_CHART_COLORS.moledet,
    },
  ];
}

function chartSubjectIdFromKeyPrefix(keyPrefix) {
  if (String(keyPrefix || "").startsWith("math_")) return "math";
  if (String(keyPrefix || "").startsWith("geometry_")) return "geometry";
  if (String(keyPrefix || "").startsWith("english_")) return "english";
  if (String(keyPrefix || "").startsWith("science_")) return "science";
  if (String(keyPrefix || "").startsWith("hebrew_")) return "hebrew";
  if (String(keyPrefix || "").startsWith("moledet")) return MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID;
  return "math";
}

function buildTopicRowsForChart(map, keyPrefix) {
  const subjectId = chartSubjectIdFromKeyPrefix(keyPrefix);
  const rows = Object.entries(map || {}).map(([k, data]) => ({
    rowKey: `${keyPrefix}_${k}`,
    rowSourceId: data?.rowSourceId || data?.rowIdentityV1?.sourceId || null,
    label:
      String(data?.narrativeTopicLabelHe || data?.rowIdentityV1?.narrativeTopicLabelHe || "").trim() ||
      parentReportChartLabelFromAllItemKey(`${keyPrefix}_${k}`, data),
    accuracy: Math.round(Number(data?.accuracy) || 0),
    timeMinutes: Math.round(Number(data?.timeMinutes) || 0),
    questions: Number(data?.questions) || 0,
    topicEngineRowSignals: data?.topicEngineRowSignals && typeof data.topicEngineRowSignals === "object" ? data.topicEngineRowSignals : null,
    trend: data?.trend && typeof data.trend === "object" ? data.trend : null,
    behaviorProfile: data?.behaviorProfile && typeof data.behaviorProfile === "object" ? data.behaviorProfile : null,
    decisionTrace: Array.isArray(data?.decisionTrace) ? data.decisionTrace : null,
    recommendationDecisionTrace: Array.isArray(data?.recommendationDecisionTrace)
      ? data.recommendationDecisionTrace
      : null,
    patternStabilityHe: data?.patternStabilityHe ? String(data.patternStabilityHe) : "",
    dataSufficiencyLabelHe: data?.dataSufficiencyLabelHe ? String(data.dataSufficiencyLabelHe) : "",
  }));
  rows.sort(
    (a, b) =>
      b.timeMinutes - a.timeMinutes ||
      String(a.label).localeCompare(String(b.label), "he")
  );
  return rows;
}

function topicBarColor(accuracy) {
  if (accuracy >= 90) return "#10b981";
  if (accuracy >= 70) return "#f59e0b";
  return "#ef4444";
}

/** סדר תצוגת אבחון מקצועי — תואם `patternDiagnostics.subjects` (הצטיינות עקבית → תוצאות טובות יחסית → מומלץ לשמר → נקודות לשיפור → תחומים דורשים תשומת לב) */
const PATTERN_DIAGNOSTIC_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
];

const MAX_DIAGNOSTIC_EVIDENCE_CHARS = 200;

/** תאימות ל-tierHe ישן בדוחות שמורים */
function weaknessTierHeDisplay(tierHe) {
  const t = String(tierHe || "").trim();
  const legacyRecurring = "\u05E7\u05D5\u05E9\u05D9 \u05D7\u05D5\u05D6\u05E8";
  const legacyRecurringConsistent = `${legacyRecurring} / \u05E7\u05D5\u05E9\u05D9 \u05E2\u05E7\u05D1\u05D9`;
  const legacySelfRepeating = "\u05E7\u05D5\u05E9\u05D9 \u05E9\u05D7\u05D5\u05D6\u05E8 \u05E2\u05DC \u05E2\u05E6\u05DE\u05D5";
  if (t === legacyRecurringConsistent || t === legacyRecurring || t === legacySelfRepeating) {
    return "כרגע בתרגול נראה שכדאי לחזק";
  }
  if (t === "\u05E7\u05D5\u05E9\u05D9 \u05E0\u05E7\u05D5\u05D3\u05D9") return "נראה שכדאי לחזק בתרגול";
  return t;
}

/** תאימות ל-tierHe ישן בנתונים שימור */
function maintainTierHeDisplay(tierHe) {
  return tierHe === "תחום לשימור" ? "עקביות" : tierHe;
}

/**
 * תאימות לאחור: payload ישן (לפני patternDiagnostics.version 2).
 */
function migrateDiagnosticSubjectV1ToRow(sub, subjectId) {
  if (!sub || typeof sub !== "object") return null;
  if (Array.isArray(sub.weaknesses)) return sub;
  const weaknesses = (sub.stableWeaknesses || []).slice(0, 2).map((w, i) => ({
    id: w.id || `${subjectId}:w:${i}`,
    labelHe:
      stripTechnicalParensHe(String(w.label || "").replace(/דפוס שגיאות\s*\([^)]+\)/, "דפוס שגיאות")) ||
      "דפוס שגיאות חוזר",
    mistakeCount: Number(w.mistakeCount) || 0,
    confidence: w.confidence === "high" ? "high" : "moderate",
  }));
  const legacyStrengths = sub.stableStrengths || [];
  const excellent = legacyStrengths.slice(0, 2).map((s) => ({
    id: s.id,
    labelHe: stripTechnicalParensHe(
      String(s.label || "").replace(/^[^:]+:\s*/, "").trim()
    ) || "בנושא תרגול",
    questions: Number(s.questions) || 0,
    accuracy: Number(s.accuracy) || 0,
    confidence: s.confidence === "high" ? "high" : "moderate",
    needsPractice: false,
    excellent: true,
  }));
  const studentRecommendationsImprove = (sub.studentRecommendations || [])
    .slice(0, 1)
    .map((r, i) => ({
      id: r.id || `stu-imp:${i}`,
      textHe: stripTechnicalParensHe(r.text),
      strength: r.strength || "moderate",
    }))
    .filter((r) => r.textHe);
  const parentRecommendationsImprove = (sub.parentRecommendations || [])
    .slice(0, 1)
    .map((r, i) => ({
      id: r.id || `par-imp:${i}`,
      textHe: stripTechnicalParensHe(r.text),
      strength: r.strength || "moderate",
    }))
    .filter((r) => r.textHe);
  let evidenceMistake = (sub.evidenceExamples || [])[0] || null;
  if (evidenceMistake) {
    const c = evidenceMistake.confidence;
    const ex = String(evidenceMistake.exerciseText || "");
    if ((c !== "high" && c !== "moderate") || ex.length > MAX_DIAGNOSTIC_EVIDENCE_CHARS) {
      evidenceMistake = null;
    } else {
      evidenceMistake = {
        exerciseText: evidenceMistake.exerciseText || null,
        questionLabel: evidenceMistake.questionLabel || null,
        correctAnswer: evidenceMistake.correctAnswer ?? null,
        userAnswer: evidenceMistake.userAnswer ?? null,
        confidence: evidenceMistake.confidence,
      };
    }
  }
  const topWeaknesses = weaknesses.map((w, i) => ({
    id: w.id || `${subjectId}:w:${i}`,
    labelHe: w.labelHe,
    mistakeCount: w.mistakeCount,
    confidence: w.confidence,
    tierHe:
      (w.mistakeCount || 0) >= 10
        ? "כרגע בתרגול נראה שכדאי לחזק"
        : (w.mistakeCount || 0) >= 5
          ? "נראה שכדאי לחזק בתרגול"
          : "תחום לחיזוק",
  }));
  const topStrengths = excellent.map((e) => ({
    ...e,
    tierHe: e.questions >= 20 ? "נושא שהילד מצליח בו יותר כרגע" : "נושא חזק כרגע",
  }));
  const evidenceExamples = [];
  if (evidenceMistake) evidenceExamples.push({ type: "mistake", ...evidenceMistake });
  const parentActionHe = parentRecommendationsImprove[0]?.textHe || null;
  const hasAnySignal =
    weaknesses.length > 0 ||
    excellent.length > 0 ||
    studentRecommendationsImprove.length > 0 ||
    parentRecommendationsImprove.length > 0 ||
    evidenceMistake != null;
  return {
    ...sub,
    summaryHe: null,
    topStrengths,
    topWeaknesses,
    parentActionHe,
    nextWeekGoalHe: null,
    evidenceExamples,
    weaknesses,
    strengths: [],
    excellent,
    maintain: [],
    improving: [],
    stableExcellence: [],
    studentRecommendationsImprove,
    studentRecommendationsMaintain: [],
    parentRecommendationsImprove,
    parentRecommendationsMaintain: [],
    evidenceMistake,
    evidenceSuccess: null,
    hasAnySignal,
  };
}

/**
 * מקור תצוגה לאזור ההמלצות: V2 (ראשי) או fallback legacy מפורש בלבד.
 * @returns {{ mode: "new"|"insufficient"|"legacy", rows: object[], legacyRecommendations: object[], presence: object }}
 */
function buildParentReportDiagnosticsView(report) {
  if (report?._parentFacingAuthority === "server") {
    const legacyRecommendations = [];
    const mode = "new";
    return {
      mode,
      rows: [],
      legacyRecommendations,
      presence: deriveParentDataPresenceForDiagnosticsView(report, {
        mode,
        rows: [],
        legacyRecommendations,
      }),
    };
  }

  const legacy = Array.isArray(report?.analysis?.recommendations)
    ? report.analysis.recommendations
    : [];
  const subjects = report?.patternDiagnostics?.subjects;
  const primarySource = String(report?.diagnosticPrimarySource || "");
  const allowLegacyFallback =
    primarySource === "legacy_patternDiagnostics_fallback" || !primarySource;
  const hasSubjects =
    subjects && typeof subjects === "object" && !Array.isArray(subjects);

  if (!hasSubjects) {
    const mode = allowLegacyFallback && legacy.length ? "legacy" : "insufficient";
    const legacyRecommendations = allowLegacyFallback ? legacy : [];
    return {
      mode,
      rows: [],
      legacyRecommendations,
      presence: deriveParentDataPresenceForDiagnosticsView(report, {
        mode,
        rows: [],
        legacyRecommendations,
      }),
    };
  }

  const pdVersion = Number(report?.patternDiagnostics?.version) || 0;
  let hasGlobalSignal = false;
  const normalizedSubjects = {};
  for (const id of PATTERN_DIAGNOSTIC_SUBJECT_ORDER) {
    const raw = subjects[id];
    if (!raw) continue;
    const sub =
      pdVersion >= 2 || Array.isArray(raw.weaknesses)
        ? raw
        : migrateDiagnosticSubjectV1ToRow(raw, id);
    normalizedSubjects[id] = sub;
    if (sub?.hasAnySignal) hasGlobalSignal = true;
  }

  if (!hasGlobalSignal) {
    const legacyRecommendations = allowLegacyFallback ? legacy : [];
    return {
      mode: "insufficient",
      rows: [],
      legacyRecommendations,
      presence: deriveParentDataPresenceForDiagnosticsView(report, {
        mode: "insufficient",
        rows: [],
        legacyRecommendations,
      }),
    };
  }

  const rows = [];
  for (const id of PATTERN_DIAGNOSTIC_SUBJECT_ORDER) {
    const sub = normalizedSubjects[id];
    if (!sub || !sub.hasAnySignal) continue;
    rows.push({
      subjectId: id,
      subjectLabelHe: formatParentReportSubjectHe(sub.subjectLabelHe || id),
      sub,
    });
  }

  const legacyRecommendations = allowLegacyFallback ? legacy : [];
  return {
    mode: "new",
    rows,
    legacyRecommendations,
    presence: deriveParentDataPresenceForDiagnosticsView(report, {
      mode: "new",
      rows,
      legacyRecommendations,
    }),
  };
}

/** הגדרות כרטיסי נושא — מקור אחד לרשימת המקצועות + איסוף תוויות גלובלי */
const TOPIC_BAR_SUBJECT_CARDS = [
  { title: "חשבון — דיוק לפי נושא", mapKey: "mathOperations", prefix: "math_", border: "border-blue-400/25" },
  { title: "גאומטריה — דיוק לפי נושא", mapKey: "geometryTopics", prefix: "geometry_", border: "border-emerald-400/25" },
  { title: "אנגלית — דיוק לפי נושא", mapKey: "englishTopics", prefix: "english_", border: "border-purple-400/25" },
  { title: "מדעים — דיוק לפי נושא", mapKey: "scienceTopics", prefix: "science_", border: "border-green-400/25" },
  { title: "עברית — דיוק לפי נושא", mapKey: "hebrewTopics", prefix: "hebrew_", border: "border-orange-400/25" },
  {
    title: "מולדת וגאוגרפיה — דיוק לפי נושא",
    mapKey: "moledetGeographyTopics",
    prefix: moledetGeographyReportTopicKeyPrefix(),
    border: "border-cyan-400/25",
  },
];

/**
 * גיאומטריית אב — "סיכום לפי שש המקצועות" הוא המקור; מסילת המגרעת (רוחב פיקסלים) זהה לכל גרפי הנושא.
 */
const MASTER_BAR_CHART_GEOMETRY = {
  /** מרווחים בתוך מסילת הגרף בלבד — זהים לסיכום ולנושאים (יישור אופקי אחיד) */
  plotChartMargin: { top: 8, right: 16, left: 8, bottom: 8 },
  /**
   * גובה נוסף לתחתית משותף: תוויות ציר X + כותרת ציר — מסילת תוויות ו-Recharts חייבים אותו אזור קטגוריות.
   * (margin.bottom הבסיסי קטן מדי; בלי זה מרכזי שורות מתפצלים מהפסים.)
   */
  barChartXAxisReservedHeightPx: 28,
  summaryBarCategoryGap: 14,
  summaryMaxBarSize: 28,
  topicBarCategoryGap: 10,
  topicMaxBarSize: 22,
  topicAccuracyDomain: [0, 100],
  /** גובה כרטיס הסיכום (נשמר) */
  summaryChartHeightPx: 300,
  /** רוחב מסילת המגרעה — אותו ערך לסיכום ולנושאים */
  plotRailWidthMobilePx: 248,
  plotRailWidthDesktopPx: 312,
  labelPlotGapPx: 8,
  labelMeasureFontPx: 11,
  labelMeasureFontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Segoe UI Hebrew", Arial, sans-serif',
  labelPadPx: 0,
  labelColMaxPx: 368,
  tickMobilePx: 10,
  tickDesktopPx: 11,
  rowHeightPx: 34,
  chartBodyVerticalPadPx: 96,
  chartBodyMinHeightPx: 220,
  chartBodyMaxHeightPx: 960,
  /** ריפוד אופקי כרטיס גרף (p-3 / md:p-5) — לחישוב רוחב מסילת מגרעה דינמי */
  chartCardPadXPxMobile: 24,
  chartCardPadXPxDesktop: 40,
  /** מרווח קטן מקצה הכרטיס לפס גלילה/עיגול */
  chartHostWidthSlopPx: 6,
};

function collectAllTopicChartLabels(report) {
  if (!report) return [];
  const out = [];
  for (const cfg of TOPIC_BAR_SUBJECT_CARDS) {
    const map = report[cfg.mapKey];
    if (!map || typeof map !== "object") continue;
    for (const [k, data] of Object.entries(map)) {
      const label = parentReportChartLabelFromAllItemKey(`${cfg.prefix}${k}`, data);
      if (label) out.push(String(label));
    }
  }
  return out;
}

/** מדידת רוחב מקסימלי בפיקסלים (ללא היוריסטיקה label.length * N) */
function measureMaxLabelWidthPx(labels, fontPx, fontFamily) {
  const pad = MASTER_BAR_CHART_GEOMETRY.labelPadPx;
  if (!labels.length) return Math.ceil(48 + pad);
  if (typeof window === "undefined") return Math.ceil(48 + pad);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Math.ceil(48 + pad);
  ctx.font = `${fontPx}px ${fontFamily}`;
  let max = 0;
  for (const t of labels) {
    const w = ctx.measureText(t).width;
    if (Number.isFinite(w)) max = Math.max(max, w);
  }
  return Math.ceil(max + pad);
}

/**
 * גיאומטריה אחת מהסיכום: אותה מסילת מגרעה (פיקסלים); מסילת תוויות לנושאים רחבה לפי צורך אך לא מצמצמת את המגרעה.
 */
function computeMasterBarChartGeometry(report, view) {
  const G = MASTER_BAR_CHART_GEOMETRY;
  const useDesktopPlot = Boolean(view.forceDesktopLayout || !view.isMobileViewport);
  const basePlotRailWidthPx = useDesktopPlot
    ? G.plotRailWidthDesktopPx
    : G.plotRailWidthMobilePx;
  const tickFontPx = useDesktopPlot ? G.tickDesktopPx : G.tickMobilePx;

  const summaryNames = buildSubjectOverviewRows(report).map((r) => r.name);
  const summaryLabelMeasured = measureMaxLabelWidthPx(
    summaryNames,
    G.labelMeasureFontPx,
    G.labelMeasureFontFamily
  );
  let summaryLabelRailWidthPx = Math.min(G.labelColMaxPx, summaryLabelMeasured);

  const topicLabels = collectAllTopicChartLabels(report);
  const topicLabelMeasured = measureMaxLabelWidthPx(
    topicLabels,
    G.labelMeasureFontPx,
    G.labelMeasureFontFamily
  );
  let topicLabelRailWidthPx = Math.min(
  G.labelColMaxPx,
  topicLabelMeasured
);

  const gap = G.labelPlotGapPx;
  const hostInner = view.chartHostInnerWidthPx;
  let plotRailWidthPx = basePlotRailWidthPx;
  if (typeof hostInner === "number" && hostInner > 0) {
    const derivedPlot = Math.floor(hostInner - topicLabelRailWidthPx - gap);
    const minPlot = Math.min(basePlotRailWidthPx, useDesktopPlot ? 168 : 140);
    plotRailWidthPx = Math.max(minPlot, derivedPlot);
  }

  /** מובייל: בלי גלילה אופקית — סכום מסילות לא יעבור את hostInner */
  const mobileNoHorizontalScroll =
    Boolean(view.isMobileViewport && !view.forceDesktopLayout) &&
    typeof hostInner === "number" &&
    hostInner > gap + 48;
  if (mobileNoHorizontalScroll) {
    const plotFloor = 40;
    plotRailWidthPx = Math.max(
      plotFloor,
      hostInner - topicLabelRailWidthPx - gap
    );
    topicLabelRailWidthPx = Math.max(
      summaryLabelRailWidthPx,
      Math.min(topicLabelRailWidthPx, hostInner - gap - plotFloor)
    );
    plotRailWidthPx = Math.max(
      plotFloor,
      hostInner - topicLabelRailWidthPx - gap
    );
  }

  const summaryChartTotalWidthPx =
    summaryLabelRailWidthPx + gap + plotRailWidthPx;
  const topicChartTotalWidthPx =
    topicLabelRailWidthPx + gap + plotRailWidthPx;

  return {
    plotChartMargin: G.plotChartMargin,
    plotRailWidthPx,
    labelPlotGapPx: G.labelPlotGapPx,
    summaryLabelRailWidthPx,
    topicLabelRailWidthPx,
    summaryChartTotalWidthPx,
    topicChartTotalWidthPx,
    tickFontPx,
    labelTickFontPx: G.labelMeasureFontPx,
    summaryChartHeightPx: G.summaryChartHeightPx,
    summaryBarCategoryGap: G.summaryBarCategoryGap,
    summaryMaxBarSize: G.summaryMaxBarSize,
    topicBarCategoryGap: G.topicBarCategoryGap,
    topicMaxBarSize: G.topicMaxBarSize,
    topicAccuracyDomain: G.topicAccuracyDomain,
    rowHeightPx: G.rowHeightPx,
    chartBodyVerticalPadPx: G.chartBodyVerticalPadPx,
    chartBodyMinHeightPx: G.chartBodyMinHeightPx,
    chartBodyMaxHeightPx: G.chartBodyMaxHeightPx,
    barChartXAxisReservedHeightPx: G.barChartXAxisReservedHeightPx,
  };
}

const chartTooltipStyle = {
  backgroundColor: "rgba(10, 15, 29, 0.96)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "10px",
  color: "#f8fafc",
  direction: "rtl",
  fontSize: "13px",
};

/** Below this inclusive total-question count, omit charts (thin global evidence). */
const PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX = 14;

function subjectPracticeSecondaryLineHe(questions, correct, accuracy) {
  const q = Number(questions) || 0;
  if (q <= 0) return "לא תורגל בתקופה שנבחרה";
  return `${Number(correct) || 0} נכון • ${Number(accuracy) || 0}% דיוק`;
}

function hasMeaningfulExampleAnswer(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s === "—" || s === "-" || s.toLowerCase() === "undefined") return false;
  return true;
}

/** Avoid leaking internal API names into parent-facing footnotes. */
function sanitizeDiagnosticsFootnoteDetailHe(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/suppressAggressiveStep/i.test(s)) {
    return "כמות המידע עוזרת להחליט כמה בזהירות להתקדם בצעד הבא.";
  }
  return s;
}

export default function ParentReport() {
  useIOSViewportFix();
  const router = useRouter();
  /** Phase D — staged Parent Copilot on short report (server-side turns). Default off. */
  const enableParentCopilotOnShort =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT === "true";

  const remoteReportSource = useMemo(
    () => parseParentReportRemoteSource(router),
    [router.isReady, router.query.source, router.query.studentId]
  );
  const isParentSource = remoteReportSource.isParent;
  const isTeacherSource = remoteReportSource.isTeacher;
  const isRemoteReportSource = remoteReportSource.isRemote;
  const remoteStudentId = remoteReportSource.studentId;
  const enableParentCopilotOnShortEffective =
    enableParentCopilotOnShort && !isTeacherSource;

  const [report, setReport] = useState(null);
  const [shortContractTop, setShortContractTop] = useState(null);
  /** Same shape as detailed report — required by ParentCopilotShell / truth packet builders. */
  const [copilotDetailedPayload, setCopilotDetailedPayload] = useState(null);
  /** Passed to `/api/parent/copilot-turn` when student is logged in (learning-site cookie). */
  const [copilotStudentId, setCopilotStudentId] = useState(null);
  const [period, setPeriod] = useState('week');
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [customDates, setCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isPrintLayout, setIsPrintLayout] = useState(false);
  const parentReportPdfRef = useRef(null);
  /** רוחב פנימי משוער לכרטיס גרף (עמודת PDF − ריפוד כרטיס) — למגרעת X דינמית */
  const [chartHostInnerWidthPx, setChartHostInnerWidthPx] = useState(0);
  const [parentReportError, setParentReportError] = useState("");

  const parentStudentId = remoteStudentId;

  const detailedReportQuery = useMemo(() => {
    const args = resolveParentReportGenerationArgs(
      period,
      customDates,
      appliedStartDate,
      appliedEndDate
    );
    const base =
      args.period === "custom" && args.customStartDate && args.customEndDate
        ? { period: "custom", start: args.customStartDate, end: args.customEndDate }
        : { period: args.period };
    if (isRemoteReportSource && remoteStudentId) {
      return {
        ...base,
        studentId: remoteStudentId,
        source: isTeacherSource ? "teacher" : "parent",
      };
    }
    return base;
  }, [
    customDates,
    appliedStartDate,
    appliedEndDate,
    period,
    isRemoteReportSource,
    isTeacherSource,
    remoteStudentId,
  ]);

  // useEffect (לא useLayoutEffect) — נדרש ב-SSR של Next כדי למנוע אזהרת hydration / useLayoutEffect על השרת
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const el = parentReportPdfRef.current;
    if (!el) return undefined;
    const G = MASTER_BAR_CHART_GEOMETRY;
    const measure = () => {
      const pad = isMobile ? G.chartCardPadXPxMobile : G.chartCardPadXPxDesktop;
      const w = el.clientWidth - pad - G.chartHostWidthSlopPx;
      setChartHostInnerWidthPx(Math.max(0, Math.floor(w)));
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isMobile, report]);

  // פונקציה לפרמט תאריך מ-YYYY-MM-DD ל-DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const formatMode = (mode) => formatParentReportModeHe(mode);

  // בדיקת גודל מסך
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onBefore = () => setIsPrintLayout(true);
    const onAfter = () => setIsPrintLayout(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  /** Resolve student UUID for secured Copilot turns (parent dashboard query or cookie session). */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!enableParentCopilotOnShortEffective) {
      setCopilotStudentId(null);
      return undefined;
    }
    if (isRemoteReportSource && parentStudentId) {
      setCopilotStudentId(parentStudentId);
      return undefined;
    }
    let cancelled = false;
    fetch("/api/student/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !data?.student?.id) return;
        setCopilotStudentId(String(data.student.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enableParentCopilotOnShortEffective, isRemoteReportSource, parentStudentId]);

  const shortReportCopilotTurnRunner = useMemo(() => {
    if (!enableParentCopilotOnShortEffective) return null;
    return async (input) =>
      postParentCopilotTurn({
        utterance: input.utterance,
        sessionId: input.sessionId,
        audience: input.audience,
        payload: input.payload,
        reportPeriod: period,
        ...(customDates ? { rangeFrom: appliedStartDate, rangeTo: appliedEndDate } : {}),
        ...(copilotStudentId ? { studentId: copilotStudentId } : {}),
        selectedContextRef: input.selectedContextRef ?? null,
        clickedFollowupFamily: input.clickedFollowupFamily ?? null,
      });
  }, [enableParentCopilotOnShortEffective, copilotStudentId, period, customDates, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!router.isReady) return undefined;

    const qpStudent =
      typeof router.query.studentId === "string" ? router.query.studentId.trim() : "";
    const fromRemoteDash =
      (router.query.source === "parent" || router.query.source === "teacher") &&
      qpStudent.length > 0;

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultEndDate = today.toISOString().split("T")[0];
    const defaultStartDate = weekAgo.toISOString().split("T")[0];

    const qp = typeof router.query.period === "string" ? router.query.period.trim() : "";
    const qs = typeof router.query.start === "string" ? router.query.start.trim() : "";
    const qe = typeof router.query.end === "string" ? router.query.end.trim() : "";
    const ymdOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

    let nextPeriod = "week";
    let nextCustomDates = false;
    let appliedS = defaultStartDate;
    let appliedE = defaultEndDate;

    if (qp === "custom" && ymdOk(qs) && ymdOk(qe) && qs <= qe) {
      nextPeriod = "custom";
      nextCustomDates = true;
      appliedS = qs;
      appliedE = qe;
    } else if (qp === "month") {
      nextPeriod = "month";
      nextCustomDates = false;
    } else if (qp === "day") {
      nextPeriod = "day";
      nextCustomDates = false;
    } else if (qp === "schoolYear") {
      nextPeriod = "schoolYear";
      nextCustomDates = false;
    } else if (qp === "week") {
      nextPeriod = "week";
      nextCustomDates = false;
    }

    setPeriod(nextPeriod);
    setCustomDates(nextCustomDates);
    setStartDate(appliedS);
    setEndDate(appliedE);
    setAppliedStartDate(appliedS);
    setAppliedEndDate(appliedE);

    if (fromRemoteDash) {
      setPlayerName("");
      setReport(null);
      setShortContractTop(null);
      setCopilotDetailedPayload(null);
      setParentReportError("");
      return undefined;
    }

    setPlayerName("");
    setReport(null);
    setShortContractTop(null);
    setCopilotDetailedPayload(null);
    setParentReportError("");
    setLoading(false);
    return undefined;
  }, [
    router.isReady,
    router.query.period,
    router.query.start,
    router.query.end,
    router.query.studentId,
    router.query.source,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!router.isReady || !isRemoteReportSource || !parentStudentId) return undefined;

    let cancelled = false;
    setLoading(true);
    setParentReportError("");

    const run = async () => {
      const { from, to } = computeReportRangeForParentApi(
        period,
        customDates,
        appliedStartDate,
        appliedEndDate
      );
      let supabase;
      try {
        supabase = getLearningSupabaseBrowserClient();
      } catch {
        if (!cancelled) {
          setParentReportError("שגיאת הגדרות מערכת.");
          setReport(null);
          setCopilotDetailedPayload(null);
          setLoading(false);
        }
        return;
      }
      const { data: sessData } = await supabase.auth.getSession();
      let token = sessData?.session?.access_token;
      if (
        !token &&
        typeof window !== "undefined" &&
        window.__parentReportPlaywrightE2eSession === true
      ) {
        token = "playwright-e2e-parent-report";
      }
      if (!token) {
        if (!cancelled) {
          setParentReportError(
            isTeacherSource
              ? "נדרשת התחברות כמורה — התחברו מחדש ונסו שוב."
              : "נדרשת התחברות כהורה — השתמשו בכניסת הורה ונסו שוב."
          );
          setReport(null);
          setCopilotDetailedPayload(null);
          setLoading(false);
        }
        return;
      }

      try {
        const qs = new URLSearchParams({ from, to });
        const remoteKind = isTeacherSource ? "teacher" : "parent";
        const url = parentReportRemoteDataUrl(remoteKind, parentStudentId, qs);
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.ok === false) {
          if (!cancelled) {
            const msg =
              res.status === 401
                ? isTeacherSource
                  ? "נדרשת התחברות מחדש כמורה."
                  : "נדרשת התחברות מחדש כהורה."
                : res.status === 403 || res.status === 404
                  ? "אין גישה לדוח של ילד/ה זה."
                  : typeof body?.error === "string"
                    ? body.error
                    : "לא ניתן לטעון את דוח ההורה.";
            setParentReportError(msg);
            setReport(null);
            setCopilotDetailedPayload(null);
            setLoading(false);
          }
          return;
        }

        const uiPeriod =
          customDates || period === "day" || period === "schoolYear" ? "custom" : period;
        const out = runParentReportGenerationFromApiBody(body, uiPeriod);
        if (!out.ok || !out.base) {
          if (!cancelled) {
            setParentReportError("לא ניתן לבנות את הדוח מהנתונים שהתקבלו מהשרת.");
            setReport(null);
            setCopilotDetailedPayload(null);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setReport(out.base);
          setPlayerName(out.playerName);
          setShortContractTop(out.detailed?.parentProductContractV1?.top || null);
          setCopilotDetailedPayload(out.detailed && typeof out.detailed === "object" ? out.detailed : null);
          setParentReportError("");
          setLoading(false);
          if (isParentSource) {
            void trackProductEvent({
              eventName: "parent_report_opened",
              actorType: "parent",
              studentId: parentStudentId,
              metadata: { period: uiPeriod, from, to },
            });
          }
        }
      } catch (loadErr) {
        if (process.env.NODE_ENV === "development") {
          console.error("[parent-report] report load failed:", loadErr);
        }
        if (!cancelled) {
          setParentReportError("שגיאת רשת בטעינת הדוח.");
          setReport(null);
          setCopilotDetailedPayload(null);
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    router.isReady,
    isRemoteReportSource,
    isTeacherSource,
    parentStudentId,
    period,
    customDates,
    appliedStartDate,
    appliedEndDate,
  ]);

  const handleShowReport = () => {
    if (startDate && endDate && startDate <= endDate) {
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
    } else {
      alert("אנא בחר תאריכים תקינים");
    }
  };

  const applyParentReportPeriod = useCallback((nextPeriod) => {
    setCustomDates(false);
    setPeriod(nextPeriod);
    setAppliedStartDate("");
    setAppliedEndDate("");
  }, []);

  const enableParentReportCustom = useCallback(() => {
    setCustomDates(true);
    setPeriod("custom");
  }, []);

  const parentReportDatePresets = (
    <ReportDateRangeControl
      showDayPreset
      showSchoolYearPreset
      customRangeLabel="בחירה"
      compactPresets
      className="!border-0 !bg-transparent !p-0 !mb-0 no-pdf"
      presetDays={parentReportPresetDays(period, customDates)}
      customDates={customDates}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onPreset={(days) => applyParentReportPeriod(days === 7 ? "week" : "month")}
      onDayPreset={() => applyParentReportPeriod("day")}
      onSchoolYearPreset={() => applyParentReportPeriod("schoolYear")}
      onEnableCustom={enableParentReportCustom}
      onApplyCustom={handleShowReport}
    />
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!report || typeof report !== "object") return undefined;
    if ("parentAiExplanation" in report) return undefined;
    const tq = Number(report.summary?.totalQuestions) || 0;
    const tm = Number(report.summary?.totalTimeMinutes) || 0;
    if (tq === 0 && tm === 0) return undefined;
    let cancelled = false;
    const snapshotAt = report.generatedAt;
    const syncInsight = getDeterministicParentAiExplanationFromParentReportV2(report);
    if (syncInsight) {
      setReport((prev) => {
        if (!prev || prev.generatedAt !== snapshotAt) return prev;
        if ("parentAiExplanation" in prev) return prev;
        return { ...prev, parentAiExplanation: syncInsight };
      });
    }
    void (async () => {
      try {
        const { parentAiExplanation } = await enrichParentReportWithParentAi(report, {});
        if (cancelled) return;
        setReport((prev) => {
          if (!prev || prev.generatedAt !== snapshotAt) return prev;
          if ("parentAiExplanation" in prev) return prev;
          return { ...prev, parentAiExplanation };
        });
      } catch {
        if (!cancelled) {
          setReport((prev) => {
            if (!prev || prev.generatedAt !== snapshotAt) return prev;
            if ("parentAiExplanation" in prev) return prev;
            return { ...prev, parentAiExplanation: null };
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);

  const masterBarChartGeometry = useMemo(() => {
    if (!report) return null;
    return computeMasterBarChartGeometry(report, {
      isMobileViewport: isMobile,
      forceDesktopLayout: isPrintLayout,
      chartHostInnerWidthPx,
    });
  }, [report, isMobile, isPrintLayout, chartHostInnerWidthPx]);

  const diagnosticsView = useMemo(
    () => (report ? buildParentReportDiagnosticsView(report) : null),
    [report]
  );
  const hasServerHomeRecommendations = useMemo(() => {
    const recs = report?.parentFacing?.homeRecommendations;
    return Array.isArray(recs) && recs.filter(Boolean).length > 0;
  }, [report]);
  const suppressChartsForThinEvidenceWindow = useMemo(() => {
    if (!report?.summary) return false;
    const q = Number(report.summary.totalQuestions) || 0;
    return q > 0 && q <= PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX;
  }, [report]);
  const diagnosticSourceLabelHe = useMemo(
    () => diagnosticPrimarySourceParentLabelHe(String(report?.diagnosticPrimarySource || "")),
    [report]
  );

  if (loading) {
    return (
      <Layout>
        <div
          className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex items-center justify-center"
          dir="rtl"
        >
          <div className="text-white text-xl">טוען דוח...</div>
        </div>
      </Layout>
    );
  }

  if (isRemoteReportSource && parentReportError && !report) {
    return (
      <Layout>
        <div
          className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex flex-col items-center justify-center gap-4 p-6"
          dir="rtl"
        >
          <p className="text-center text-red-300 max-w-md">{parentReportError}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {isTeacherSource && parentStudentId ? (
              <>
                <Link
                  href={`/teacher/student/${parentStudentId}`}
                  className="rounded-lg px-4 py-2 bg-amber-500 text-black font-semibold"
                >
                  חזרה לדוח מורה
                </Link>
                <Link
                  href="/teacher/dashboard"
                  className="rounded-lg px-4 py-2 bg-white/10 border border-white/20 text-white"
                >
                  לוח בקרה
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/parent/login"
                  className="rounded-lg px-4 py-2 bg-amber-500 text-black font-semibold"
                >
                  כניסת הורה
                </Link>
                <Link href="/parent/dashboard" className="rounded-lg px-4 py-2 bg-white/10 border border-white/20 text-white">
                  דשבורד הורים
                </Link>
              </>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isRemoteReportSource) {
    return (
      <Layout>
        <div
          className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex flex-col items-center justify-center gap-4 p-6"
          dir="rtl"
          data-testid="parent-report-portal-gate"
        >
          <div className="text-4xl">📊</div>
          <h1 className="text-2xl font-bold text-white">{PARENT_REPORT_PORTAL_GATE.titleHe}</h1>
          <p className="text-center text-white/80 max-w-md">{PARENT_REPORT_PORTAL_GATE.messageHe}</p>
          <p className="text-center text-white/50 text-sm max-w-md">{PARENT_REPORT_PORTAL_GATE.hintHe}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/parent/login"
              className="rounded-lg px-4 py-2 bg-amber-500 text-black font-semibold"
            >
              כניסת הורה
            </Link>
            <Link href="/parent/dashboard" className="rounded-lg px-4 py-2 bg-white/10 border border-white/20 text-white">
              דשבורד הורים
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report || !report.summary || (report.summary.totalQuestions === 0 && report.summary.totalTimeMinutes === 0)) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex items-center justify-center p-4" dir="rtl">
          <div className="text-center text-white max-w-md w-full">
            <ParentReportExitNav className="mb-4" />
            
            <div className="text-4xl mb-4">📊</div>
            <h1 className="text-2xl font-bold mb-2">דוח להורים</h1>
            <p className="text-white/70 mb-4">
              אין עדיין מספיק פעילות בתקופה שנבחרה.
              <br />
              אחרי קצת תרגול יופיע כאן סיכום.
            </p>
            
            {/* בחירת תקופה גם במסך "אין נתונים" */}
            <div className="mb-4 space-y-2">
              <div className="text-sm text-white/60 mb-2">בחר תקופה:</div>
              {parentReportDatePresets}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <style>{`
          /* מסך: בלי גלילה אופקית באזור גרפי עמודות — מניעת לכידת מגע אופקית */
          .parent-report-topic-bar-host {
            overflow-x: hidden !important;
            touch-action: pan-y;
            overscroll-behavior-x: none;
          }
          .parent-report-graph-section {
            overflow-x: hidden;
            min-width: 0;
          }

          /* מצב הדפסה (לייצוא PDF) */
          .pdf-print-mode .no-pdf {
            display: none !important;
          }
          .pdf-print-mode [data-pdf-overlay="1"] {
            display: none !important;
          }

          @media print {
            body {
              background: white !important;
              color: black !important;
            }

            /* להדפיס רק את הדוח עצמו */
            body * {
              visibility: hidden !important;
            }
            #parent-report-pdf,
            #parent-report-pdf * {
              visibility: visible !important;
            }
            #parent-report-pdf {
              position: static !important;
              left: auto !important;
              top: auto !important;
              width: auto !important;
              max-width: 100% !important;
              margin: 0 auto !important;
            }
            #parent-report-pdf,
            #parent-report-pdf h1,
            #parent-report-pdf h2,
            #parent-report-pdf h3,
            #parent-report-pdf h4,
            #parent-report-pdf p,
            #parent-report-pdf span,
            #parent-report-pdf li,
            #parent-report-pdf td,
            #parent-report-pdf th,
            #parent-report-pdf strong,
            #parent-report-pdf small {
              color: #111827 !important;
              opacity: 1 !important;
              text-shadow: none !important;
              filter: none !important;
              -webkit-text-fill-color: #111827 !important;
            }
            .bg-gradient-to-b,
            .bg-black\\/30,
            .bg-black\\/40,
            .bg-blue-500\\/20,
            .bg-emerald-500\\/20,
            .bg-purple-500\\/20,
            .bg-green-500\\/20,
            .bg-orange-500\\/20,
            .bg-cyan-500\\/20 {
              background: white !important;
              border: 1px solid #ccc !important;
            }
            .text-white {
              color: black !important;
            }
            .text-white\\/60,
            .text-white\\/70,
            .text-white\\/80,
            .text-white\\/90 {
              color: #333 !important;
            }

            /* Recharts (SVG) – טקסט של צירים/תוויות/מקרא יוצא לבן כברירת מחדל; בהדפסה חייב להיות שחור */
            #parent-report-pdf svg text {
              fill: #000 !important;
            }
            #parent-report-pdf .recharts-cartesian-axis-tick-value,
            #parent-report-pdf .recharts-text,
            #parent-report-pdf .recharts-label,
            #parent-report-pdf .recharts-legend-item-text {
              fill: #000 !important;
              color: #000 !important;
            }
            #parent-report-pdf .recharts-cartesian-grid line,
            #parent-report-pdf .recharts-cartesian-grid path {
              stroke: #d1d5db !important;
            }
            /* להסתיר רק מה שמסומן (וגם כפתורים) */
            .no-pdf,
            [data-pdf-overlay="1"],
            button {
              display: none !important;
            }
            table {
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr,
            th,
            td {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .recharts-wrapper {
              page-break-inside: avoid;
            }
            .avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            #parent-report-pdf .parent-report-topic-explain-block {
              break-inside: auto !important;
              page-break-inside: auto !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #f8fafc !important;
              border-color: #94a3b8 !important;
              color: #0f172a !important;
            }
            #parent-report-pdf .parent-report-topic-explain-row {
              color: #1e293b !important;
            }
            #parent-report-pdf .parent-report-topic-explain-details > summary {
              display: none !important;
            }
            #parent-report-pdf .parent-report-topic-explain-details > div {
              display: block !important;
              border-color: #cbd5e1 !important;
              background: #fff !important;
              color: #1e293b !important;
            }
            #parent-report-pdf .parent-report-topic-explain-block .border-white\\/15,
            #parent-report-pdf .parent-report-topic-explain-block .border-white\\/10 {
              border-color: #cbd5e1 !important;
            }
            #parent-report-pdf .parent-diagnostic-explanation-block {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              color: #334155 !important;
            }
            #parent-report-pdf .parent-diagnostic-explanation-example-ltr {
              direction: ltr !important;
              unicode-bidi: isolate !important;
            }
            /* נושאים: בהדפסה תמיד פריסת שולחן עבודה; כרטיסי מובייל מוסתרים */
            #parent-report-pdf .parent-report-desktop-only {
              display: block !important;
            }
            #parent-report-pdf .parent-report-mobile-only {
              display: none !important;
            }

            /* טבלאות נושאים — הפרדה עדינה בלבד (ללא הדגשת תא נושא) */
            #parent-report-pdf .parent-report-subject-table {
              border-collapse: collapse !important;
            }
            #parent-report-pdf .parent-report-subject-table thead th {
              font-weight: 600 !important;
              border-bottom: 1px solid #9ca3af !important;
            }
            #parent-report-pdf .parent-report-subject-table tbody td {
              border-bottom: 1px solid #d1d5db !important;
            }
            #parent-report-pdf .parent-report-subject-table tbody td:first-child {
              font-weight: 600 !important;
            }
            #parent-report-pdf .parent-report-math-progress-title {
              break-after: avoid !important;
              page-break-after: avoid !important;
              margin-bottom: 8px !important;
            }
            #parent-report-pdf .parent-report-table-wrap-print {
              break-before: auto !important;
              page-break-before: auto !important;
            }

            /* המלצות / אבחון — מניעת שבירה + חיזוק גבולות בהדפסה בלבד */
            #parent-report-pdf .parent-report-recommendations-print .parent-report-rec-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-rec-item {
              border-width: 1.5px !important;
              border-style: solid !important;
              border-color: #475569 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* רקע כהה שלא נכלל בגלובל — כרטיס מקצוע באבחון */
            #parent-report-pdf .parent-report-diagnostics-print .bg-black\\/20 {
              background: #f8fafc !important;
              border-color: #64748b !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* כותרת מקצוע: לא להסתמך על text-white → שחור; צבע ורקע מפורשים ל-PDF */
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-diagnostic-subject-title {
              color: #0f172a !important;
              font-weight: 800 !important;
              background: #e2e8f0 !important;
              border-bottom: 2px solid #0f172a !important;
              border-bottom-color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-diagnostic-subject-block {
              border-color: #475569 !important;
              border-width: 1.5px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-print-stable-excellence {
              border-color: #6d28d9 !important;
              background: #ede9fe !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /*
             * דוגמאות טעות / תוצאות טובות — הדפסה בלבד: Tailwind text-white/45, text-white/88, text-sky-300 וכו׳
             * לא תואמים תמיד ל-overrides הגלובליים; כאן צבעים מפורשים ללא opacity נמוכה.
             */
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card {
              background: #ffffff !important;
              border-color: #64748b !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card,
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card * {
              opacity: 1 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-heading {
              color: #0f172a !important;
              font-weight: 700 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-prose {
              color: #1e293b !important;
              font-weight: 500 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-answer-label {
              color: #334155 !important;
              font-weight: 700 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-answer-sep {
              color: #475569 !important;
              font-weight: 700 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-answer-value,
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-answer-value * {
              color: #111827 !important;
              font-weight: 800 !important;
              opacity: 1 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-example-card .parent-report-example-answers {
              color: #1e293b !important;
            }

            /* —— PDF בלבד: חדות היררכיה, כרטיסי סיכום, גרפים (לא משנה מסך) —— */
            #parent-report-pdf .parent-report-print-section-label {
              color: #0f172a !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }
            #parent-report-pdf .parent-report-print-subheading {
              color: #111827 !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }
            #parent-report-pdf .parent-report-print-muted-text {
              color: #334155 !important;
              opacity: 1 !important;
              font-weight: 600 !important;
            }
            #parent-report-pdf .parent-report-print-page-section-heading {
              color: #0f172a !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }
            #parent-report-pdf h1.parent-report-print-page-section-heading {
              font-weight: 900 !important;
            }
            #parent-report-pdf .parent-report-print-chart-title {
              color: #0f172a !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }
            #parent-report-pdf .parent-report-print-chart-subtitle {
              color: #334155 !important;
              opacity: 1 !important;
              font-weight: 600 !important;
            }
            #parent-report-pdf .parent-report-print-legend-label {
              color: #111827 !important;
              opacity: 1 !important;
              font-weight: 600 !important;
            }
            #parent-report-pdf .parent-report-print-summary-card {
              background: #f8fafc !important;
              border-width: 1.5px !important;
              border-style: solid !important;
              border-color: #334155 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-print-summary-label {
              color: #0f172a !important;
              opacity: 1 !important;
              font-weight: 700 !important;
            }
            #parent-report-pdf .parent-report-print-summary-stat {
              color: #0f172a !important;
              opacity: 1 !important;
              font-weight: 800 !important;
            }
            #parent-report-pdf .parent-report-diagnostics-print .parent-report-print-narrative-box {
              color: #1e293b !important;
              opacity: 1 !important;
              font-weight: 500 !important;
              background: #f1f5f9 !important;
              border-color: #64748b !important;
            }
            #parent-report-pdf .parent-report-graph-section svg text,
            #parent-report-pdf .parent-report-graph-section svg tspan {
              fill: #111827 !important;
            }
            #parent-report-pdf .parent-report-graph-section svg .parent-report-print-svg-tick {
              fill: #111827 !important;
            }
            #parent-report-pdf .parent-report-graph-section .recharts-legend-wrapper,
            #parent-report-pdf .parent-report-graph-section .recharts-legend-item-text {
              color: #111827 !important;
              fill: #111827 !important;
              opacity: 1 !important;
            }
            #parent-report-pdf .parent-report-graph-section .recharts-legend-wrapper span {
              color: #111827 !important;
              opacity: 1 !important;
            }
            /* גרפים — מניעת שבירה וקריאות בהדפסה */
            #parent-report-pdf .parent-report-chart-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              border-color: #475569 !important;
              border-width: 1.5px !important;
              background: #fafafa !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-graph-section .recharts-wrapper,
            #parent-report-pdf .parent-report-graph-section .recharts-surface {
              overflow: visible !important;
            }
            #parent-report-pdf .parent-report-graph-section .recharts-legend-wrapper {
              max-width: 100% !important;
            }

            #parent-report-pdf .parent-report-important-disclaimer {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-top: 12px !important;
              margin-bottom: 8px !important;
              padding: 10px 12px !important;
              background: #f1f5f9 !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 6px !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #parent-report-pdf .parent-report-important-disclaimer-title {
              color: #0f172a !important;
              font-size: 10pt !important;
              font-weight: 800 !important;
              margin: 0 0 8px 0 !important;
              opacity: 1 !important;
            }
            #parent-report-pdf .parent-report-important-disclaimer-body p,
            #parent-report-pdf .parent-report-important-disclaimer-body strong {
              color: #334155 !important;
              opacity: 1 !important;
              font-size: 9pt !important;
              line-height: 1.52 !important;
            }
            #parent-report-pdf .parent-report-important-disclaimer-body strong {
              font-weight: 700 !important;
            }

            /* גרפי נושא — גיאומטריה דסקטופית אחידה בהדפסה (ללא דחיסה) */
            @media print {
              #parent-report-pdf .parent-report-topic-bar-host {
                overflow-x: visible !important;
              }
            }
          }
        `}</style>
      </Head>
      <div
        className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] text-white p-2 md:p-4"
        dir="rtl"
        style={{
          paddingTop: "calc(var(--head-h, 56px) - 10px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <div
          id="parent-report-pdf"
          ref={parentReportPdfRef}
          className="max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden"
        >
          <ParentReportExitNav className="mb-0" />
          
          {/* כותרת */}
          <div className="text-center mb-1 md:mb-2">
            <h1 className="parent-report-print-page-section-heading text-2xl md:text-3xl font-extrabold mb-2">
              📊 דוח להורים
            </h1>
            <p className="text-white/70 text-sm md:text-base">{report.playerName}</p>
            
            {/* בחירת תקופה (לא נכנס ל-PDF) */}
            <div className="mt-1 md:mt-2 mb-1 md:mb-2 no-pdf">
              {parentReportDatePresets}
            </div>

            <div className="flex justify-center mt-2 no-pdf">
              <Link
                href={{
                  pathname: "/learning/parent-report-detailed",
                  query: detailedReportQuery,
                }}
                prefetch={false}
                className="inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-violet-500/35 border border-violet-300/45 hover:bg-violet-500/50 text-white transition-all"
              >
                דוח מקיף לתקופה
              </Link>
            </div>

            {/* בחירת תאריכים מותאמת אישית (לא נכנס ל-PDF) — rendered inside ReportDateRangeControl */}
            
            <p className="text-xs md:text-sm text-white/60 mt-1 text-center" dir="ltr" style={{ direction: 'ltr', textAlign: 'center' }}>
              {formatDate(report.startDate)} - {formatDate(report.endDate)}
            </p>
          </div>

          {/* סיכום כללי */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-6 avoid-break">
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                זמן כולל
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-blue-400">
                {report.summary.totalTimeMinutes} דק'
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                ({report.summary.totalTimeHours} שעות)
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                שאלות
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-emerald-400">
                {report.summary.totalQuestions}
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                {report.summary.totalCorrect} נכון
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                דיוק כללי
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-yellow-400">
                {report.summary.overallAccuracy}%
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                רמה
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-purple-400">
                Lv.{report.summary.playerLevel}
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                ⭐ {report.summary.stars} • 🏆 {report.summary.achievements}
              </div>
            </div>
          </div>

          <ParentReportDataHealthNote
            diagnosticOverviewHe={report.summary?.diagnosticOverviewHe}
            mixedGradePracticeNoteHe={report?.gradePracticeMeta?.mixedGradePracticeNoteHe}
          />

          {!hasServerHomeRecommendations ? (
            <ParentReportShortContractPreview top={shortContractTop} />
          ) : null}

          {report.summary?.diagnosticOverviewHe ? (
            <div className="mb-3 md:mb-5 avoid-break rounded-lg border border-amber-400/25 bg-amber-950/15 p-3 md:p-4 text-sm text-white/90 space-y-2">
              <p className="font-bold text-amber-100/95 m-0 text-sm md:text-base">מה הכי בולט עכשיו (לפי התרגול שנאסף בתקופה שנבחרה)</p>
              {report.summary.diagnosticOverviewHe.practicedSubjectsSummaryHe ? (
                <p className="m-0 leading-relaxed text-white/70 text-xs md:text-sm">
                  {report.summary.diagnosticOverviewHe.practicedSubjectsSummaryHe}
                </p>
              ) : null}
              {!shortContractTop && report.summary.diagnosticOverviewHe.mainFocusAreaLineHe ? (
                <p className="m-0 leading-relaxed">
                  <span className="text-white/55">דורש תשומת לב כעת: </span>
                  {report.summary.diagnosticOverviewHe.mainFocusAreaLineHe}
                </p>
              ) : !shortContractTop ? (
                <p className="m-0 text-white/55 text-xs">
                  {Number(report.summary?.totalQuestions) > 0 &&
                  diagnosticsView?.presence?.state === "hasVolumeNoPattern"
                    ? "יש נתוני תרגול בתקופה שנבחרה, אך עדיין אין מספיק בסיס ברור מהתרגולים כדי לזהות נושא דחוף אחד — כדאי להמשיך בתרגול ולעקוב שוב לאחר מכן."
                    : "אין עדיין תחום שזוהה כדורש תשומת לב מיידית בתקופה שנבחרה."}
                </p>
              ) : null}
              {report.summary.diagnosticOverviewHe.strongestAreaLineHe ? (
                <p className="m-0 leading-relaxed">
                  <span className="text-white/55">תוצאות טובות יחסית — כדאי לשמר: </span>
                  {report.summary.diagnosticOverviewHe.strongestAreaLineHe}
                </p>
              ) : null}
              {report.summary.diagnosticOverviewHe.readyForProgressPreviewHe?.length ? (
                <p className="m-0 leading-relaxed text-emerald-200/90 text-xs md:text-sm">
                  <span className="text-white/55">מוכנות להתקדמות נוספת: </span>
                  {report.summary.diagnosticOverviewHe.readyForProgressPreviewHe.join(" · ")}
                </p>
              ) : null}
              {report.summary.diagnosticOverviewHe.requiresAttentionPreviewHe?.length ? (
                <p className="m-0 leading-relaxed text-white/70 text-xs md:text-sm">
                  <span className="text-white/55">עוד נושאים למעקב: </span>
                  {report.summary.diagnosticOverviewHe.requiresAttentionPreviewHe.join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <ParentReportParentSections report={report} />

          {(report.rawMetricStrengthsHe?.length || report.summary?.rawMetricStrengthsHe?.length) ? (
            <div className="mb-3 md:mb-5 avoid-break rounded-lg border border-emerald-400/25 bg-emerald-950/15 p-3 md:p-4 text-sm text-white/90 space-y-1">
              <p className="font-bold text-emerald-100/95 m-0 text-sm md:text-base">איפה נראו תוצאות טובות לפי התרגול שנאסף בתקופה שנבחרה</p>
              <ul className="m-0 pr-4 list-disc text-xs md:text-sm text-white/85 space-y-1">
                {(report.rawMetricStrengthsHe || report.summary?.rawMetricStrengthsHe || []).map((line, i) => (
                  <li key={`rms-${i}`} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* סיכום לפי מקצוע */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-6 avoid-break">
            <div className="parent-report-print-summary-card bg-blue-500/20 border border-blue-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                🧮 חשבון
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-blue-400">
                {report.summary.mathQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.mathQuestions,
                  report.summary.mathCorrect,
                  report.summary.mathAccuracy
                )}
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-emerald-500/20 border border-emerald-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                📐 גאומטריה
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-emerald-400">
                {report.summary.geometryQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.geometryQuestions,
                  report.summary.geometryCorrect,
                  report.summary.geometryAccuracy
                )}
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-purple-500/20 border border-purple-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                📘 אנגלית
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-purple-200">
                {report.summary.englishQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.englishQuestions,
                  report.summary.englishCorrect,
                  report.summary.englishAccuracy
                )}
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-green-500/20 border border-green-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                🔬 מדעים
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-green-200">
                {report.summary.scienceQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.scienceQuestions,
                  report.summary.scienceCorrect,
                  report.summary.scienceAccuracy
                )}
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-orange-500/20 border border-orange-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                📚 עברית
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-orange-300">
                {report.summary.hebrewQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.hebrewQuestions,
                  report.summary.hebrewCorrect,
                  report.summary.hebrewAccuracy
                )}
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-cyan-500/20 border border-cyan-400/50 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                🗺️ מולדת וגאוגרפיה
              </div>
              <div className="parent-report-print-summary-stat text-base md:text-lg font-bold text-cyan-300">
                {report.summary.moledetGeographyQuestions || 0} שאלות
              </div>
              <div className="parent-report-print-muted-text text-xs text-white/80">
                {subjectPracticeSecondaryLineHe(
                  report.summary.moledetGeographyQuestions,
                  report.summary.moledetGeographyCorrect,
                  report.summary.moledetGeographyAccuracy
                )}
              </div>
            </div>
          </div>

          <div className="no-pdf">
            <ParentReportInsight explanation={report.parentAiExplanation} />
          </div>

          {enableParentCopilotOnShortEffective && copilotDetailedPayload ? (
            <div className="no-pdf mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-2">
              <ParentCopilotShellLazy
                payload={copilotDetailedPayload}
                asyncTurnRunner={shortReportCopilotTurnRunner}
              />
            </div>
          ) : null}

          {/* טבלת פעולות חשבון */}
          {Object.keys(report.mathOperations || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="parent-report-math-progress-title text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🧮 התקדמות בחשבון</h2>
              {/* Desktop Table */}
              <div className="parent-report-desktop-only parent-report-table-wrap-print hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">פעולה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.mathOperations)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([op, data]) => (
                        <tr key={op} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe("math", data, op)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.mathOperations)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([op, data]) => (
                    <div key={op} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-blue-400">{subjectTopicLabelForParentHe("math", data, op)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* טבלת נושאים גאומטריה */}
          {Object.keys(report.geometryTopics || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">📐 התקדמות בגאומטריה</h2>
              <div className="parent-report-desktop-only hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">נושא</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.geometryTopics)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe("geometry", data, topic)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.geometryTopics)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-emerald-400">{subjectTopicLabelForParentHe("geometry", data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* טבלת נושאים אנגלית */}
          {Object.keys(report.englishTopics || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">📘 התקדמות באנגלית</h2>
              {/* Desktop Table */}
              <div className="parent-report-desktop-only hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">נושא</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.englishTopics)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe("english", data, topic)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.englishTopics)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-purple-400">{subjectTopicLabelForParentHe("english", data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* טבלת נושאים מדעים */}
          {Object.keys(report.scienceTopics || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🔬 התקדמות במדעים</h2>
              {/* Desktop Table */}
              <div className="parent-report-desktop-only hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">נושא</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.scienceTopics)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe("science", data, topic)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                              data.accuracy >= 90
                                ? "text-emerald-400"
                                : data.accuracy >= 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.scienceTopics)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-green-400">{subjectTopicLabelForParentHe("science", data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* טבלת נושאים עברית */}
          {Object.keys(report.hebrewTopics || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">📚 התקדמות בעברית</h2>
              {/* Desktop Table */}
              <div className="parent-report-desktop-only hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">נושא</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.hebrewTopics)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe("hebrew", data, topic)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                              data.accuracy >= 90
                                ? "text-emerald-400"
                                : data.accuracy >= 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.hebrewTopics)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-orange-400">{subjectTopicLabelForParentHe("hebrew", data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* טבלת נושאים מולדת וגאוגרפיה */}
          {Object.keys(report.moledetGeographyTopics || {}).length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🗺️ התקדמות במולדת וגאוגרפיה</h2>
              {/* Desktop Table */}
              <div className="parent-report-desktop-only hidden md:block mt-2">
                <table className="w-full table-fixed text-sm parent-report-subject-table">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "4%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1.5 px-0.5 whitespace-nowrap">נושא</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">רמה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">כיתה</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מצב</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.moledetGeographyTopics)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {subjectTopicLabelForParentHe(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID, data, topic)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportGradeHe(data.gradeKey || data.grade)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatMode(data.mode)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.timeMinutes} דק'
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                              data.accuracy >= 90
                                ? "text-emerald-400"
                                : data.accuracy >= 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {data.excellent ? (
                                <span className="text-emerald-400">✅</span>
                              ) : data.needsPractice ? (
                                <span className="text-red-400">⚠️</span>
                              ) : (
                                <span className="text-yellow-400">👍</span>
                              )}
                              <ParentReportRowDiagnosticsFootnote data={data} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {Object.entries(report.moledetGeographyTopics)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-cyan-400">{subjectTopicLabelForParentHe(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID, data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{formatParentReportGradeHe(data.gradeKey || data.grade)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מצב:</span> <span className="text-white/90">{formatMode(data.mode)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{data.timeMinutes} דק'</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            data.accuracy >= 90 ? "text-emerald-400" :
                            data.accuracy >= 70 ? "text-yellow-400" :
                            "text-red-400"
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {data.excellent ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : data.needsPractice ? (
                          <span className="text-red-400 text-xs">⚠️ דורש תרגול</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">👍 טוב</span>
                        )}
                        <ParentReportRowDiagnosticsFootnote data={data} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* המלצות — מקור ראשי: patternDiagnostics; ישן רק אם אין אובייקט אבחון */}
          {diagnosticsView &&
            (diagnosticsView.mode === "insufficient" ||
              diagnosticsView.mode === "new" ||
              (diagnosticsView.mode === "legacy" &&
                diagnosticsView.legacyRecommendations.length > 0)) && (
              <div className="parent-report-recommendations-print parent-report-diagnostics-print bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
                <h2 className="parent-report-print-page-section-heading text-base md:text-xl font-bold mb-2 md:mb-3 text-center">
                  💡 המלצות
                </h2>
                <p className="text-[11px] md:text-xs text-white/60 text-center mb-2">
                  {diagnosticSourceLabelHe}
                </p>

                {diagnosticsView.mode === "legacy" && (
                  <div className="space-y-2 md:space-y-3">
                    {diagnosticsView.legacyRecommendations.map((rec) => (
                      <div
                        key={`${String(rec.operationName || "rec")}::${String(rec.priority || "")}`}
                        className={`parent-report-rec-item p-2 md:p-3 rounded-lg border ${
                          rec.priority === "success"
                            ? "bg-green-500/20 border-green-400/50"
                            : rec.priority === "high"
                              ? "bg-red-500/20 border-red-400/50"
                              : rec.priority === "medium"
                                ? "bg-yellow-500/20 border-yellow-400/50"
                                : "bg-blue-500/20 border-blue-400/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg md:text-xl">
                            {rec.priority === "success"
                              ? "🟢"
                              : rec.priority === "high"
                                ? "🔴"
                                : rec.priority === "medium"
                                  ? "🟡"
                                  : "🔵"}
                          </span>
                          <div className="flex-1">
                            <div className="parent-report-print-subheading font-semibold mb-1 text-sm md:text-base">
                              {rec.operationName}
                            </div>
                            <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                              {rec.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(diagnosticsView.mode === "insufficient" ||
                  (diagnosticsView.mode === "new" &&
                    diagnosticsView.rows.length === 0)) && (
                  <p className="parent-report-print-muted-text text-center text-sm md:text-base text-white/75 px-2 py-3">
                    {diagnosticsView.presence?.recommendationsExplainerHe ||
                      (Number(report.summary?.totalQuestions) > 0
                        ? "יש נתוני תרגול בתקופה שנבחרה, אבל עדיין אין מספיק בסיס ברור מהתרגולים ברמת ההמלצות — כדאי להמשיך בתרגול ולעקוב שוב לאחר מכן."
                        : "עדיין אין מספיק נתונים לתמונה ברורה מהתרגולים")}
                  </p>
                )}

                {diagnosticsView.mode === "new" && diagnosticsView.rows.length > 0 && (
                  <div className="space-y-3 md:space-y-4">
                    {diagnosticsView.rows
                      .filter((row) => row?.sub)
                      .map((row) => {
                      const s = row.sub;
                      const ex = s.excellent || [];
                      const st = s.strengths || [];
                      const legacyStrength = [...ex, ...st].slice(0, 3).map((x) => ({
                        ...x,
                        tierHe:
                          x.tierHe ||
                          (x.excellent && (x.questions || 0) >= 20
                            ? "נושא שהילד מצליח בו יותר כרגע"
                            : "נושא חזק כרגע"),
                      }));
                      const topStr = s.topStrengths?.length ? s.topStrengths : legacyStrength;
                      const wkLegacy = (s.weaknesses || []).map((w) => ({
                        ...w,
                        tierHe: w.tierHe || "כרגע בתרגול נראה שכדאי לחזק",
                      }));
                      const topWk = s.topWeaknesses?.length ? s.topWeaknesses : wkLegacy;
                      const mn = s.maintain || [];
                      const im = s.improving || [];
                      const sx = Array.isArray(s.stableExcellence) ? s.stableExcellence : [];
                      const stuImp = s.studentRecommendationsImprove || [];
                      const stuMaint = s.studentRecommendationsMaintain || [];
                      const parImp = s.parentRecommendationsImprove || [];
                      const parMaint = s.parentRecommendationsMaintain || [];
                      const evM = s.evidenceMistake;
                      const evS = s.evidenceSuccess;
                      let evidenceList = Array.isArray(s.evidenceExamples)
                        ? [...s.evidenceExamples]
                        : [];
                      if (!evidenceList.length) {
                        if (evM && (evM.confidence === "high" || evM.confidence === "moderate")) {
                          evidenceList.push({ type: "mistake", ...evM });
                        }
                        if (evS && (evS.confidence === "high" || evS.confidence === "moderate")) {
                          evidenceList.push({
                            type: "success",
                            titleHe: evS.titleHe,
                            bodyHe: evS.bodyHe,
                            confidence: evS.confidence,
                          });
                        }
                      }
                      evidenceList = evidenceList
                        .filter((e) => e.confidence === "high" || e.confidence === "moderate")
                        .filter((e) => {
                          if (e.type !== "mistake") return true;
                          const hasEx = String(e.exerciseText || "").trim().length > 0;
                          const hasAns =
                            hasMeaningfulExampleAnswer(e.correctAnswer) ||
                            hasMeaningfulExampleAnswer(e.userAnswer);
                          return hasEx || hasAns;
                        })
                        .slice(0, 2);

                      const parentActionHe = s.parentActionHe || null;
                      const nextWeekGoalHe = s.nextWeekGoalHe || null;
                      const summaryHe = s.summaryHe || null;
                      const showLegacyParImp = !parentActionHe && parImp.length > 0;

                      return (
                        <div
                          key={`${row.subjectId}-${row.subjectLabelHe}`}
                          className="parent-report-diagnostic-subject-block rounded-lg border border-white/15 bg-black/20 p-2 md:p-3"
                        >
                          <div className="parent-report-diagnostic-subject-title font-bold text-sm md:text-base mb-2 text-white/95 border-b border-white/10 pb-1">
                            {row.subjectLabelHe}
                          </div>
                          <div className="space-y-2 md:space-y-2.5">
                            {summaryHe ? (
                              <div className="parent-report-print-narrative-box text-xs md:text-sm text-white/85 leading-relaxed border border-white/10 rounded-md bg-white/5 px-2 py-1.5">
                                {diagnosticParentVisibleTextHe(summaryHe)}
                              </div>
                            ) : null}
                            {Array.isArray(s.diagnosticCards) && s.diagnosticCards.length > 0 ? (
                              <div className="text-[10px] md:text-[11px] text-white/80 space-y-1.5 border border-white/10 rounded-md bg-white/5 px-2 py-1.5">
                                <div className="font-semibold text-white/90 text-[11px] md:text-xs">
                                  לפי השאלות שתורגלו בתקופה שנבחרה
                                </div>
                                {s.diagnosticCards.map((card, cardIdx) => {
                                  const recHe = String(card.recommendationHe || "").trim();
                                  return (
                                    <div
                                      key={`${row.subjectId}-dcard-${cardIdx}`}
                                      className="space-y-0.5 border-b border-white/10 last:border-0 pb-1.5 last:pb-0"
                                    >
                                      <div className="font-semibold text-white/88 break-words">
                                        {diagnosticParentVisibleTextHe(card.labelHe)}
                                      </div>
                                      {Array.isArray(card.evidence)
                                        ? card.evidence.map((line, li) => (
                                            <div
                                              key={li}
                                              className="text-white/75 pr-1 leading-snug break-words"
                                            >
                                              <span className="text-white/50">• </span>
                                              {diagnosticParentVisibleTextHe(line)}
                                            </div>
                                          ))
                                        : null}
                                      {recHe ? (
                                        <div className="text-white/78 text-[9px] md:text-[10px] leading-snug break-words">
                                          <span className="text-white/45">המשך מומלץ: </span>
                                          {diagnosticParentVisibleTextHe(recHe)}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                            {(s.subjectPriorityReasonHe || s.subjectDoNowHe || s.subjectAvoidNowHe) && (
                              <div className="text-[10px] md:text-[11px] text-sky-100/90 border border-sky-400/22 bg-sky-950/12 rounded px-2 py-1.5 space-y-1 leading-snug">
                                {s.subjectPriorityReasonHe ? (
                                  <p className="m-0">{diagnosticParentVisibleTextHe(s.subjectPriorityReasonHe)}</p>
                                ) : null}
                                {s.subjectDoNowHe ? (
                                  <p className="m-0">
                                    <span className="text-white/45 font-bold">עכשיו: </span>
                                    {diagnosticParentVisibleTextHe(s.subjectDoNowHe)}
                                  </p>
                                ) : null}
                                {s.subjectAvoidNowHe ? (
                                  <p className="m-0">
                                    <span className="text-white/45 font-bold">להימנע: </span>
                                    {diagnosticParentVisibleTextHe(s.subjectAvoidNowHe)}
                                  </p>
                                ) : null}
                              </div>
                            )}
                            {(s.dominantMistakePatternLabelHe || s.subjectMemoryNarrativeHe) && (
                              <div className="text-[10px] md:text-[11px] text-emerald-100/85 border border-emerald-400/20 bg-emerald-950/10 rounded px-2 py-1.5 space-y-1 leading-snug">
                                {s.dominantMistakePatternLabelHe ? (
                                  <p className="m-0">
                                    <span className="text-white/45 font-bold">מה חוזר בטעות: </span>
                                    {diagnosticParentVisibleTextHe(s.dominantMistakePatternLabelHe)}
                                  </p>
                                ) : null}
                                {s.subjectMemoryNarrativeHe ? (
                                  <p className="m-0">
                                    <span className="text-white/45 font-bold">שימור למידה: </span>
                                    {diagnosticParentVisibleTextHe(s.subjectMemoryNarrativeHe)}
                                  </p>
                                ) : null}
                              </div>
                            )}
                            {sx.length > 0 && (
                              <div className="parent-report-print-section-label text-[11px] font-semibold text-violet-200/85 pt-1">
                                מה שהילד עושה טוב לאורך זמן
                              </div>
                            )}
                            {sx.map((x, sxIdx) => (
                              <div
                                key={`${row.subjectId}-sx-${sxIdx}`}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-violet-500/12 border-violet-400/40 parent-report-print-stable-excellence"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🏆</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      {x.tierHe || "מה שהילד עושה טוב לאורך זמן"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(x.labelHe)} — דיוק {x.accuracy}% ({x.questions} שאלות)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {topStr.length > 0 && (
                              <div className="parent-report-print-section-label text-[11px] font-semibold text-emerald-200/80 pt-1">
                                איפה נראו התוצאות הטובות ביותר
                              </div>
                            )}
                            {topStr.map((x, tsIdx) => (
                              <div
                                key={`${row.subjectId}-ts-${tsIdx}`}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-emerald-500/15 border-emerald-400/45"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🌟</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      {x.tierHe || "נושא עם תוצאות טובות יחסית"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(x.labelHe)} — דיוק {x.accuracy}% ({x.questions} שאלות)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {mn.length > 0 && (
                              <div className="parent-report-print-section-label text-[11px] font-semibold text-sky-200/80 pt-1">
                                מומלץ לשמר
                              </div>
                            )}
                            {mn.map((x, mnIdx) => (
                              <div
                                key={`${row.subjectId}-mn-${mnIdx}`}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-sky-500/10 border-sky-400/35"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🔷</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      {maintainTierHeDisplay(x.tierHe) || "עקביות"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(x.labelHe)} — דיוק {x.accuracy}% ({x.questions} שאלות)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {im.length > 0 && (
                              <div className="parent-report-print-section-label text-[11px] font-semibold text-amber-200/80 pt-1">
                                איפה כדאי לחזק
                              </div>
                            )}
                            {im.map((x, imIdx) => (
                              <div
                                key={`${row.subjectId}-im-${imIdx}`}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-amber-500/12 border-amber-400/40"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">📈</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      {x.tierHe || "נושא שעדיין מתחזק"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(
                                        improvingDiagnosticsDisplayLabelHe(x.labelHe)
                                      )}{" "}
                                      — דיוק {x.accuracy}% ({x.questions} שאלות)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {topWk.length > 0 && (
                              <div className="parent-report-print-section-label text-[11px] font-semibold text-white/55 tracking-wide">
                                מה כדאי לשים לב אליו השבוע
                              </div>
                            )}
                            {topWk.map((w, wkIdx) => (
                              <div
                                key={w.id != null ? w.id : `${row.subjectId}-wk-${wkIdx}`}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-red-500/20 border-red-400/50"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🔴</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      {weaknessTierHeDisplay(w.tierHe) || "תחום לחיזוק"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(w.labelHe)}
                                      {typeof w.mistakeCount === "number"
                                        ? ` (${w.mistakeCount} טעויות דומות)`
                                        : ""}
                                    </div>
                                    <ParentDiagnosticExplanationBlock
                                      explanationV1={w.parentDiagnosticExplanationV1}
                                      className="parent-report-print-muted-text"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {parentActionHe ? (
                              <div className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-yellow-500/15 border-yellow-400/45">
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">👪</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      פעולה קונקרטית לבית
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(parentActionHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            {nextWeekGoalHe ? (
                              <div className="parent-report-rec-item p-2 md:p-3 rounded-lg border border-amber-300/35 bg-amber-950/20">
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🗓️</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      יעדים לשבוע הקרוב
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(nextWeekGoalHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            {stuImp.map((r) => (
                              <div
                                key={r.id}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-blue-500/20 border-blue-400/50"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">🎯</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      המלצה לילד/ה
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(r.textHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {stuMaint.map((r) => (
                              <div
                                key={r.id}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-teal-500/15 border-teal-400/45"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">✨</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      המלצה לילד/ה — שימור מה שעובד טוב
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(r.textHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {showLegacyParImp
                              ? parImp.map((r) => (
                                  <div
                                    key={r.id}
                                    className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-yellow-500/15 border-yellow-400/45"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className="text-lg shrink-0">👪</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                          המלצה להורה
                                        </div>
                                        <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                          {diagnosticParentVisibleTextHe(r.textHe)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              : null}
                            {parMaint.map((r) => (
                              <div
                                key={r.id}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-violet-500/12 border-violet-400/40"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">💬</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      המלצה להורה — עידוד ושימור
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(r.textHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {evidenceList.map((ev, evIdx) =>
                              ev.type === "mistake" ? (
                                <div
                                  key={`mistake-${evIdx}`}
                                  className="parent-report-rec-item parent-report-example-card parent-report-example-mistake p-2 md:p-3 rounded-lg border bg-white/5 border-white/15"
                                >
                                  <div className="parent-report-example-heading font-semibold text-xs text-white/70 mb-1">
                                    דוגמה לטעות (מהתרגול)
                                  </div>
                                  {ev.exerciseText ? (
                                    <div className="parent-report-example-prose text-xs text-white/80 break-words mb-1">
                                      {ev.exerciseText}
                                    </div>
                                  ) : null}
                                  {hasMeaningfulExampleAnswer(ev.correctAnswer) ||
                                  hasMeaningfulExampleAnswer(ev.userAnswer) ? (
                                    <div
                                      className="parent-report-example-answers flex flex-col gap-1.5 text-[11px] md:text-xs break-words"
                                      dir="rtl"
                                    >
                                      {hasMeaningfulExampleAnswer(ev.correctAnswer) ? (
                                        <div>
                                          <span className="parent-report-example-answer-label font-semibold text-sky-300">
                                            התשובה הנכונה
                                          </span>
                                          <span className="parent-report-example-answer-sep text-white/45 mx-1">
                                            :
                                          </span>
                                          <span
                                            className="parent-report-example-answer-value text-white/88"
                                            dir="ltr"
                                          >
                                            {String(ev.correctAnswer)}
                                          </span>
                                        </div>
                                      ) : null}
                                      {hasMeaningfulExampleAnswer(ev.userAnswer) ? (
                                        <div>
                                          <span className="parent-report-example-answer-label font-semibold text-amber-300">
                                            תשובת הילד
                                          </span>
                                          <span className="parent-report-example-answer-sep text-white/45 mx-1">
                                            :
                                          </span>
                                          <span
                                            className="parent-report-example-answer-value text-white/88"
                                            dir="ltr"
                                          >
                                            {String(ev.userAnswer)}
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div
                                  key={`success-${evIdx}`}
                                  className="parent-report-rec-item parent-report-example-card parent-report-example-success p-2 md:p-3 rounded-lg border bg-emerald-500/10 border-emerald-400/30"
                                >
                                  <div className="parent-report-example-heading font-semibold text-xs text-emerald-100/90 mb-1">
                                    {ev.titleHe}
                                  </div>
                                  <div className="parent-report-example-prose text-xs text-white/85 break-words">
                                    {ev.bodyHe}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* ——— אזור גרפים בלבד ——— */}
          <section
            className="parent-report-graph-section space-y-5 md:space-y-7 mb-3 md:mb-6"
            aria-label="גרפים"
          >
            {suppressChartsForThinEvidenceWindow ? (
              <div className="parent-report-chart-card bg-amber-950/25 border border-amber-400/35 rounded-xl p-4 md:p-6 avoid-break text-center space-y-2">
                <h2 className="parent-report-print-chart-title text-base md:text-lg font-bold text-amber-100/95">
                  מעט שאלות בתקופה שנבחרה
                </h2>
                <p className="text-xs md:text-sm text-white/80 leading-relaxed m-0">
                  מספר השאלות בתקופה שנבחרה נמוך מדי כדי להציג כאן גרפים או טבלאות בעלי משמעות ברורה.
                  מומלץ להסתמך על הסיכום וההסברים למעלה, ולהמשיך בתרגול כדי לצבור תמונה ברורה יותר.
                </p>
              </div>
            ) : (
              <>
            {report.dailyActivity.length > 0 && (
              <div className="parent-report-chart-card bg-black/30 border border-white/10 rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/20">
                <div className="text-center mb-1 md:mb-2">
                  <h2 className="parent-report-print-chart-title text-base md:text-xl font-bold tracking-tight">
                    פעילות יומית
                  </h2>
                  <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/55 mt-0.5">
                    זמן תרגול ושאלות לפי יום בתקופה שנבחרה
                  </p>
                </div>
                <div className="w-full" style={{ minHeight: isMobile ? 240 : 300 }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
                    <LineChart
                      data={report.dailyActivity}
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#ffffff85", fontSize: isMobile ? 10 : 11 }}
                        tickMargin={8}
                        interval="preserveStartEnd"
                        minTickGap={28}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        style={{ direction: "ltr" }}
                      />
                      <YAxis
                        tick={{ fill: "#ffffff85", fontSize: isMobile ? 10 : 11 }}
                        width={36}
                        tickMargin={4}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("he-IL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        }
                        formatter={(value, name) => {
                          if (name === "זמן (דקות)") return [`${value} דק׳`, name];
                          if (name === "שאלות") return [value, name];
                          return [value, name];
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{
                          paddingBottom: 14,
                          fontSize: isMobile ? 11 : 12,
                          lineHeight: 1.4,
                        }}
                        iconType="line"
                        iconSize={11}
                        formatter={(value) => (
                          <span className="parent-report-print-legend-label text-white/80">{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="timeMinutes"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        name="זמן (דקות)"
                        dot={{ fill: "#60a5fa", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="questions"
                        stroke="#34d399"
                        strokeWidth={2}
                        name="שאלות"
                        dot={{ fill: "#34d399", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {report.dailyActivity.length > 0 && (
              <div className="parent-report-chart-card bg-black/30 border border-white/10 rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/20">
                <div className="text-center mb-1 md:mb-2">
                  <h2 className="parent-report-print-chart-title text-base md:text-xl font-bold tracking-tight">
                    פעילות לפי מקצועות (יומי)
                  </h2>
                  <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/55 mt-0.5">
                    מספר נושאים שונים שנוגעו בכל יום — כולל מדעים
                  </p>
                </div>
                <div className="w-full" style={{ minHeight: isMobile ? 260 : 320 }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                    <LineChart
                      data={report.dailyActivity}
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#ffffff85", fontSize: isMobile ? 10 : 11 }}
                        tickMargin={8}
                        interval="preserveStartEnd"
                        minTickGap={28}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        style={{ direction: "ltr" }}
                      />
                      <YAxis
                        tick={{ fill: "#ffffff85", fontSize: isMobile ? 10 : 11 }}
                        width={28}
                        allowDecimals={false}
                        tickMargin={4}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("he-IL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{
                          paddingBottom: 12,
                          fontSize: isMobile ? 10 : 11,
                          lineHeight: 1.35,
                          maxWidth: "100%",
                        }}
                        layout="horizontal"
                        iconType="line"
                        iconSize={10}
                        formatter={(value) => (
                          <span className="parent-report-print-legend-label text-white/75">{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="mathTopics"
                        stroke={SUBJECT_CHART_COLORS.math}
                        strokeWidth={1.8}
                        name="חשבון"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="geometryTopics"
                        stroke={SUBJECT_CHART_COLORS.geometry}
                        strokeWidth={1.8}
                        name="גאומטריה"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="englishTopics"
                        stroke={SUBJECT_CHART_COLORS.english}
                        strokeWidth={1.8}
                        name="אנגלית"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="scienceTopics"
                        stroke={SUBJECT_CHART_COLORS.science}
                        strokeWidth={1.8}
                        name="מדעים"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="hebrewTopics"
                        stroke={SUBJECT_CHART_COLORS.hebrew}
                        strokeWidth={1.8}
                        name="עברית"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="moledetGeographyTopics"
                        stroke={SUBJECT_CHART_COLORS.moledet}
                        strokeWidth={1.8}
                        name="מולדת וגאוגרפיה"
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {masterBarChartGeometry &&
              (() => {
                const overviewRows = buildSubjectOverviewRows(report);
                const maxMin = Math.max(
                  1,
                  ...overviewRows.map((r) => r.minutes || 0)
                );
                const M = masterBarChartGeometry;
                const sumH = M.summaryChartHeightPx;
                const m = M.plotChartMargin;
                const xAxisRes = M.barChartXAxisReservedHeightPx;
                const plotMargin = { ...m, bottom: m.bottom + xAxisRes };
                const gap = M.labelPlotGapPx;
                const chartMargin = {
                  ...plotMargin,
                  left: gap + plotMargin.left,
                };
                return (
                  <div className="parent-report-chart-card bg-black/30 border border-white/10 rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/20">
                    <div className="text-center mb-2 md:mb-3">
                      <h2 className="parent-report-print-chart-title text-base md:text-xl font-bold tracking-tight">
                        סיכום לפי שש המקצועות
                      </h2>
                      <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/55 mt-0.5">
                        זמן תרגול (דקות) — בפרטים מלאים יופיעו גם שאלות ודיוק
                      </p>
                    </div>
                    <div
                      className="w-full parent-report-topic-bar-host"
                      dir="ltr"
                    >
                      <div
                        className="parent-report-master-bar-canvas min-w-0"
                        dir="ltr"
                        style={{
                          width: M.summaryChartTotalWidthPx,
                          minWidth: M.summaryChartTotalWidthPx,
                          height: sumH,
                        }}
                      >
                        <ResponsiveContainer
                          width={M.summaryChartTotalWidthPx}
                          height={sumH}
                        >
                          <BarChart
                            layout="vertical"
                            data={overviewRows}
                            margin={chartMargin}
                            barCategoryGap={M.summaryBarCategoryGap}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#ffffff22"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              domain={[0, Math.ceil(maxMin * 1.08)]}
                              tick={{ fill: "#ffffff85", fontSize: M.tickFontPx }}
                              tickMargin={6}
                              label={{
                                value: "דקות",
                                position: "insideBottom",
                                offset: -2,
                                fill: "#ffffff70",
                                fontSize: M.tickFontPx,
                              }}
                            />
                            <YAxis
                              type="category"
                              dataKey="key"
                              width={M.summaryLabelRailWidthPx}
                              interval={0}
                              axisLine={{
                                stroke: "rgba(255,255,255,0.1)",
                              }}
                              tickLine={false}
                              tick={(tickProps) => {
                                const { x, y, payload } = tickProps;
                                const row = overviewRows.find(
                                  (r) => r.key === payload.value
                                );
                                const label =
                                  row?.name ?? String(payload.value ?? "");
                                return (
                                  <text
                                    className="parent-report-print-svg-tick"
                                    x={(x ?? 0) - 6}
                                    y={y}
                                    textAnchor="end"
                                    dominantBaseline="central"
                                    fill="#e2e8f0"
                                    fontSize={M.labelTickFontPx}
                                  >
                                    {label}
                                  </text>
                                );
                              }}
                            />
                            <Tooltip
                                contentStyle={chartTooltipStyle}
                                labelFormatter={(_label, payload) =>
                                  payload?.[0]?.payload?.name ?? ""
                                }
                                formatter={(_value, _name, props) => {
                                  const p = props?.payload;
                                  if (!p) return ["", ""];
                                  const q = Number(p.questions) || 0;
                                  if (q <= 0) {
                                    return ["לא תורגל במקצוע זה בתקופה שנבחרה", ""];
                                  }
                                  return [
                                    `${p.minutes} דק׳ תרגול · ${q} שאלות · דיוק ${p.accuracy}%`,
                                    "",
                                  ];
                                }}
                              />
                              <Bar
                                dataKey="minutes"
                                name="זמן (דקות)"
                                radius={[0, 6, 6, 0]}
                                maxBarSize={M.summaryMaxBarSize}
                              >
                                {overviewRows.map((row) => (
                                  <Cell key={row.key} fill={row.fill} />
                                ))}
                              </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {masterBarChartGeometry &&
              TOPIC_BAR_SUBJECT_CARDS.map((cfg) => {
                const map = report[cfg.mapKey];
                if (!map || Object.keys(map).length === 0) return null;
                const rows = buildTopicRowsForChart(map, cfg.prefix);
                const M = masterBarChartGeometry;
                const innerH = Math.max(
                  M.chartBodyMinHeightPx,
                  Math.min(
                    M.chartBodyMaxHeightPx,
                    rows.length * M.rowHeightPx + M.chartBodyVerticalPadPx
                  )
                );
                const totalW = M.topicChartTotalWidthPx;
                const labelW = M.topicLabelRailWidthPx;
                const gap = M.labelPlotGapPx;
                const m = M.plotChartMargin;
                const xAxisRes = M.barChartXAxisReservedHeightPx;
                const plotMargin = { ...m, bottom: m.bottom + xAxisRes };
                const chartMargin = {
                  ...plotMargin,
                  left: gap + plotMargin.left,
                };
                return (
                  <div
                    key={cfg.mapKey}
                    className={`parent-report-chart-card bg-black/30 border ${cfg.border} rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/15`}
                  >
                    <div className="text-center mb-2 md:mb-3">
                      <h2 className="parent-report-print-chart-title text-sm md:text-lg font-bold tracking-tight">
                        {cfg.title}
                      </h2>
                      <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/50 mt-0.5">
                        מסילת תוויות ומסילת גרף משותפות לכל המקצועות
                      </p>
                    </div>
                    <div
                      className="w-full parent-report-topic-bar-host"
                      dir="ltr"
                    >
                      <div
                        className="parent-report-topic-bar-canvas min-w-0"
                        dir="ltr"
                        style={{
                          width: totalW,
                          minWidth: totalW,
                          height: innerH,
                        }}
                      >
                        <ResponsiveContainer width={totalW} height={innerH}>
                          <BarChart
                            layout="vertical"
                            data={rows}
                            margin={chartMargin}
                            barCategoryGap={M.topicBarCategoryGap}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#ffffff22"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              domain={M.topicAccuracyDomain}
                              tick={{ fill: "#ffffff85", fontSize: M.tickFontPx }}
                              tickMargin={6}
                              label={{
                                value: "דיוק %",
                                position: "insideBottom",
                                offset: -2,
                                fill: "#ffffff65",
                                fontSize: M.tickFontPx,
                              }}
                            />
                            <YAxis
                              type="category"
                              dataKey="rowKey"
                              width={labelW}
                              interval={0}
                              axisLine={{
                                stroke: "rgba(255,255,255,0.1)",
                              }}
                              tickLine={false}
                              tick={(tickProps) => {
                                const { x, y, payload } = tickProps;
                                const row = rows.find(
                                  (r) => r.rowKey === payload.value
                                );
                                const label =
                                  row?.label ?? String(payload.value ?? "");
                                return (
                                  <text
                                    className="parent-report-print-svg-tick"
                                    x={(x ?? 0) - 6}
                                    y={y}
                                    textAnchor="end"
                                    dominantBaseline="central"
                                    fill="#e2e8f0"
                                    fontSize={M.labelTickFontPx}
                                  >
                                    {label}
                                  </text>
                                );
                              }}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyle}
                              labelFormatter={(_label, payload) =>
                                payload?.[0]?.payload?.label ?? ""
                              }
                              formatter={(_value, _name, props) => {
                                const p = props?.payload;
                                if (!p) return ["", ""];
                                const q = Number(p.questions) || 0;
                                if (q <= 0) {
                                  return ["לא תורגל בנושא זה בתקופה שנבחרה", ""];
                                }
                                return [
                                  `דיוק ${p.accuracy}% · ${q} שאלות · ${p.timeMinutes} דק׳`,
                                  "",
                                ];
                              }}
                            />
                            <Bar
                              dataKey="accuracy"
                              name="דיוק %"
                              radius={[0, 4, 4, 0]}
                              maxBarSize={M.topicMaxBarSize}
                            >
                              {rows.map((row) => (
                                <Cell key={row.rowKey} fill={topicBarColor(row.accuracy)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })}
              </>
            )}
          </section>

          {/* אתגרים */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6">
            <h2 className="text-base md:text-xl font-bold mb-2 md:mb-4 text-center">🎯 אתגרים</h2>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-2 md:p-3">
                <div className="text-xs md:text-sm text-white/60 mb-1">אתגר יומי</div>
                <div className="text-base md:text-lg font-bold">
                  {report.challenges.daily.correct} / {report.challenges.daily.questions}
                </div>
                <div className="text-[10px] md:text-xs text-white/60">
                  ניקוד שיא: {report.challenges.daily.bestScore}
                </div>
              </div>
              <div className={`border rounded-lg p-2 md:p-3 ${
                report.challenges.weekly.completed
                  ? "bg-yellow-500/20 border-yellow-400/50"
                  : "bg-purple-500/20 border-purple-400/50"
              }`}>
                <div className="text-xs md:text-sm text-white/60 mb-1">אתגר שבועי</div>
                <div className="text-base md:text-lg font-bold">
                  {report.challenges.weekly.current} / {report.challenges.weekly.target}
                </div>
                {report.challenges.weekly.completed && (
                  <div className="text-[10px] md:text-xs text-yellow-400">🎉 הושלם!</div>
                )}
              </div>
            </div>
          </div>

          {/* הישגים */}
          {report.achievements.length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-4 text-center">🏆 הישגים</h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {report.achievements.map((achievement) => (
                  <div
                    key={String(achievement.name || "achievement")}
                    className="px-2 md:px-3 py-1 md:py-2 bg-emerald-500/20 border border-emerald-400/50 rounded-lg text-xs md:text-sm break-words"
                  >
                    {achievement.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ParentReportImportantDisclaimer />

          {/* כפתורים */}
          <div className="flex gap-2 md:gap-3 justify-center flex-wrap mb-3 md:mb-6 no-pdf">
            <button
              onClick={() => {
                let pdfOpts = {};
                if (typeof window !== "undefined") {
                  try {
                    const q = new URLSearchParams(window.location.search).get("qa_pdf");
                    if (q === "file") pdfOpts = { method: "canvas" };
                  } catch {
                    /* ignore */
                  }
                }
                if (isParentSource) {
                  void trackProductEvent({
                    eventName: "parent_report_pdf_exported",
                    actorType: "parent",
                    studentId: parentStudentId,
                    metadata: { period },
                  });
                }
                exportReportToPDF(report, pdfOpts);
              }}
              className="px-4 md:px-6 py-2 md:py-3 rounded-lg bg-red-500/80 hover:bg-red-500 font-bold text-sm md:text-base"
            >
              🖨️ הדפס / 📄 ייצא ל-PDF
            </button>
            <button
              onClick={() => router.push("/learning")}
              className="px-4 md:px-6 py-2 md:py-3 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm md:text-base"
            >
              ← חזור ללמידה
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}



