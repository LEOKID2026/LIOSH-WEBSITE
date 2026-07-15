import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import { ParentReportExitNav, ParentReportThemeIcons } from "../../components/parent/ParentReportExitNav.jsx";
import StudentFixedBottomAdChrome from "../../components/student/StudentFixedBottomAdChrome.jsx";
import { ParentReportImportantDisclaimer } from "../../components/ParentReportImportantDisclaimer";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  getMathReportBucketDisplayName,
  getTopicName,
  getEnglishTopicName,
  getScienceTopicName,
  getHistoryTopicName,
  getHebrewTopicName,
  getMoledetGeographyTopicName,
  exportReportToPDF,
  isGenericParentTopicLabelHe,
  MATH_PARENT_TOPIC_FALLBACK_HE,
  normalizeReportTopicBucketKey,
} from "../../utils/math-report-generator";
import { topicBucketLabelHe } from "../../utils/diagnostic-labels-he.js";
import {
  enrichParentReportWithParentAi,
  getDeterministicParentAiExplanationFromParentReportV2,
} from "../../utils/parent-report-ai/parent-report-ai-adapter";
import { ParentReportInsight } from "../../components/ParentReportInsight.jsx";
import { ParentReportTopicExplainBlock } from "../../components/parent-report-topic-explain-row.jsx";
import { ParentDiagnosticExplanationBlock } from "../../components/parent-diagnostic-explanation-block.jsx";
import ParentReportParentSections from "../../components/parent/ParentReportParentSections.jsx";
import ParentReportDataHealthNote from "../../components/parent/ParentReportDataHealthNote.jsx";
import PortalLoadingPanel from "../../components/ui/PortalLoadingPanel.jsx";
import {
  PARENT_REPORT_SITE_BRIGHT_CSS,
  getParentReportLayoutProps,
  getParentReportPageShellClass,
  getParentReportPageContentStyle,
  getParentReportNoScrollPageShellClass,
  getParentReportNoScrollPageContentStyle,
  getParentReportStateShellClass,
  getParentReportStateShellStyle,
  getParentReportSecondaryLinkClass,
  getParentReportErrorTextClass,
} from "../../lib/parent-ui/parent-report-site-bright-theme.css.js";
import { isImmersiveGameLayoutPath } from "../../lib/site-nav";
import { useParentReportBrightPageBackground } from "../../lib/parent-ui/use-parent-report-bright-page-bg.js";
import { mapParentReportLoadError } from "../../lib/parent-server/parent-api-errors.he.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
  moledetGeographyReportTopicKeyPrefix,
} from "../../lib/learning-shared/moledet-geography-subject-id.js";
import {
  enrichDailyActivityWithVisualStrands,
  splitMoledetGeographyReportForDisplay,
  VISUAL_STRAND_LABEL_HE,
} from "../../lib/learning-shared/moledet-geography-display.js";

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
  formatParentReportActivitySourceHe,
  formatParentReportActivityDisplayLabelHe,
  formatParentReportGradeHe,
  formatParentReportLevelHe,
  formatParentReportSubjectHe,
} from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import {
  deriveParentDataPresenceForDiagnosticsView,
  PARENT_THIN_DATA_EXPLAINER_HE,
} from "../../utils/parent-data-presence.js";
import { topicUiFromLearningPatternDecision } from "../../utils/learning-pattern-decision/parent-report-ui-helpers.js";
import { normalizeParentVisibleMetrics } from "../../utils/learning-pattern-decision/normalize-parent-practice-metrics.js";
import {
  filterSubjectOverviewRowsWithEvidence,
  PARENT_REPORT_PERIOD_EMPTY_STATE_HE,
} from "../../utils/parent-report-subject-visibility.js";
import { isDuplicateParentReportText } from "../../utils/parent-report-text-dedupe.js";
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
import ParentReportShortContractPreview, {
  ParentReportWeeklyHomeActionLine,
} from "../../components/parent-report-short-contract-preview.jsx";
import {
  resolveParentReportWeeklyHomeActionHe,
  mergeParentReportHomeActionHe,
} from "../../lib/parent-ui/parent-report-parent-copy.js";
import {
  formatExclusiveLearningMinutesHe,
  normalizeLearningTimeExclusiveBreakdown,
} from "../../lib/parent-ui/learning-time-exclusive-breakdown-display.js";
import {
  buildRegularReportViewModel,
  cleanTopicLabelForRegularReportHe,
  filterTopicMapForRegularReport,
  formatRegularReportTopicLabelHe,
  formatRegularReportTopicTimeCellHe,
  resolveRegisteredGradeKeyFromReport,
  sumTopicMapMinutes,
} from "../../lib/parent-ui/parent-report-regular-display.js";
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

const REPORT_REMOTE_SESSION_CACHE_PREFIX = "leo-parent-report-remote:v1:";
const REPORT_REMOTE_SESSION_CACHE_TTL_MS = 90_000;

function readParentReportRemoteSessionCache(fetchKey) {
  if (typeof window === "undefined" || !fetchKey) return null;
  try {
    const raw = window.sessionStorage.getItem(`${REPORT_REMOTE_SESSION_CACHE_PREFIX}${fetchKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.body || typeof parsed.body !== "object") return null;
    if (Date.now() - Number(parsed.at || 0) > REPORT_REMOTE_SESSION_CACHE_TTL_MS) return null;
    return parsed.body;
  } catch {
    return null;
  }
}

function writeParentReportRemoteSessionCache(fetchKey, body) {
  if (typeof window === "undefined" || !fetchKey || !body) return;
  try {
    window.sessionStorage.setItem(
      `${REPORT_REMOTE_SESSION_CACHE_PREFIX}${fetchKey}`,
      JSON.stringify({ at: Date.now(), body })
    );
  } catch {
    /* quota / private mode */
  }
}

function applyParentReportRemoteApiBody(body, uiPeriod, setters) {
  const out = runParentReportGenerationFromApiBody(body, uiPeriod);
  if (!out.ok || !out.base) return false;
  setters.setReport(out.base);
  setters.setPlayerName(out.playerName);
  setters.setShortContractTop(out.detailed?.parentProductContractV1?.top || null);
  setters.setCopilotDetailedPayload(
    out.detailed && typeof out.detailed === "object" ? out.detailed : null
  );
  setters.setParentReportError("");
  setters.setLoading(false);
  return true;
}

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
              : subjectId === "history"
                ? getHistoryTopicName(b)
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
  if (key.startsWith("history_")) {
    const rest = key.slice("history_".length);
    const sep = rest.indexOf("\u0001");
    const fallbackBucket = sep === -1 ? rest : rest.slice(0, sep);
    return labelFrom("history", bucketKey || displayName || fallbackBucket);
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
  if (cleanFromRow && !isGenericParentTopicLabelHe(cleanFromRow)) {
    return normalizeParentFacingHe(cleanFromRow);
  }
  const displayName = String(data?.displayName || data?.narrativeTopicLabelHe || "").trim();
  const bucket = String(data?.bucketKey ?? fallbackTopic ?? "").trim();
  const bucketForLookup = normalizeReportTopicBucketKey(bucket);
  const fromCatalog = topicBucketLabelHe(subjectId, bucketForLookup || displayName);
  if (fromCatalog && !isGenericParentTopicLabelHe(fromCatalog)) {
    return normalizeParentFacingHe(fromCatalog);
  }
  const raw =
    subjectId === "math"
      ? getMathReportBucketDisplayName(bucketForLookup || displayName)
      : subjectId === "geometry"
        ? getTopicName(bucketForLookup || displayName)
        : subjectId === "english"
          ? getEnglishTopicName(bucketForLookup || displayName)
          : subjectId === "science"
            ? getScienceTopicName(bucketForLookup || displayName)
            : subjectId === "history"
              ? getHistoryTopicName(bucketForLookup || displayName)
            : subjectId === "hebrew"
              ? getHebrewTopicName(bucketForLookup || displayName)
              : subjectId === MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID
                ? getMoledetGeographyTopicName(bucketForLookup || displayName)
                : displayName || bucketForLookup;
  const resolved = String(raw || "").trim();
  if (resolved && !isGenericParentTopicLabelHe(resolved)) {
    return normalizeParentFacingHe(resolved);
  }
  if (!isGenericParentTopicLabelHe(displayName)) {
    return normalizeParentFacingHe(displayName);
  }
  if (subjectId === "math") {
    return normalizeParentFacingHe(MATH_PARENT_TOPIC_FALLBACK_HE);
  }
  if (subjectId === "geometry") {
    return normalizeParentFacingHe("גאומטריה");
  }
  return normalizeParentFacingHe(displayName || bucketForLookup || MATH_PARENT_TOPIC_FALLBACK_HE);
}

function regularReportTopicTableEntries(displayReport, mapKey, regularDisplay) {
  const map = displayReport?.[mapKey];
  if (!map || typeof map !== "object") return [];
  if (regularDisplay) return regularDisplay.mapEntries(map);
  return Object.entries(map);
}

function regularReportTopicLabel(subjectId, data, fallbackTopic, regularDisplay) {
  const base = subjectTopicLabelForParentHe(subjectId, data, fallbackTopic);
  const cleaned = regularDisplay
    ? cleanTopicLabelForRegularReportHe(base, data, regularDisplay.registeredGradeKey)
    : base;
  return regularDisplay ? regularDisplay.formatTopicLabel(cleaned, data) : cleaned;
}

function regularReportGradeCell(data) {
  return formatParentReportGradeHe(data.gradeKey || data.grade || data.contentGradeKey);
}

function regularReportTopicMapHasRows(displayReport, mapKey, regularDisplay) {
  const map = displayReport?.[mapKey];
  if (!map || typeof map !== "object") return false;
  if (regularDisplay) return regularDisplay.mapEntries(map).length > 0;
  return Object.keys(map).length > 0;
}

/** צבעי מקצוע עקביים בגרפים */
const SUBJECT_CHART_COLORS = {
  math: "#3b82f6",
  geometry: "#10b981",
  english: "#a855f7",
  science: "#22c55e",
  history: "#a16207",
  hebrew: "#f97316",
  moledet: "#06b6d4",
  geography: "#14b8a6",
};

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
  if (x === "contradictory") return "התוצאות מעורבות - נמשיך לעקוב";
  return diagnosticParentVisibleTextHe(raw || "");
}

const SUBJECT_OVERVIEW_CARD_UI = {
  math: { emoji: "🧮", cardClass: "bg-blue-500/20 border border-blue-400/50", statClass: "text-blue-400" },
  geometry: { emoji: "📐", cardClass: "bg-emerald-500/20 border border-emerald-400/50", statClass: "text-emerald-400" },
  english: { emoji: "📘", cardClass: "bg-purple-500/20 border border-purple-400/50", statClass: "text-purple-200" },
  science: { emoji: "🔬", cardClass: "bg-green-500/20 border border-green-400/50", statClass: "text-green-200" },
  history: { emoji: "🏛️", cardClass: "bg-amber-700/25 border border-amber-500/50", statClass: "text-amber-200" },
  hebrew: { emoji: "📚", cardClass: "bg-orange-500/20 border border-orange-400/50", statClass: "text-orange-300" },
  moledet: { emoji: "🏠", cardClass: "bg-cyan-500/20 border border-cyan-400/50", statClass: "text-cyan-300" },
  geography: { emoji: "🗺️", cardClass: "bg-teal-500/20 border border-teal-400/50", statClass: "text-teal-300" },
};

function buildSubjectOverviewRows(report) {
  if (!report?.summary) return [];
  const s = report.summary;
  const mgVisual = splitMoledetGeographyReportForDisplay(report);

  function subjectRow(key, name, minutes, q, correct, acc, fill) {
    const metrics = normalizeParentVisibleMetrics({
      questions: Number(q) || 0,
      correct: correct != null ? Number(correct) : undefined,
      accuracy: Math.round(Number(acc) || 0),
    });
    return {
      key,
      name,
      minutes,
      questions: metrics.questions,
      correct: metrics.correct,
      accuracy: metrics.accuracy,
      wrong: metrics.wrong,
      parentVisibleMetrics: metrics,
      fill,
    };
  }

  return [
    subjectRow(
      "math",
      "מתמטיקה",
      sumTopicMapMinutes(report.mathOperations),
      s.mathQuestions,
      s.mathCorrect,
      s.mathAccuracy,
      SUBJECT_CHART_COLORS.math,
    ),
    subjectRow(
      "geometry",
      "גאומטריה",
      sumTopicMapMinutes(report.geometryTopics),
      s.geometryQuestions,
      s.geometryCorrect,
      s.geometryAccuracy,
      SUBJECT_CHART_COLORS.geometry,
    ),
    subjectRow(
      "english",
      "אנגלית",
      sumTopicMapMinutes(report.englishTopics),
      s.englishQuestions,
      s.englishCorrect,
      s.englishAccuracy,
      SUBJECT_CHART_COLORS.english,
    ),
    subjectRow(
      "science",
      "מדעים",
      sumTopicMapMinutes(report.scienceTopics),
      s.scienceQuestions,
      s.scienceCorrect,
      s.scienceAccuracy,
      SUBJECT_CHART_COLORS.science,
    ),
    subjectRow(
      "history",
      "היסטוריה",
      sumTopicMapMinutes(report.historyTopics),
      s.historyQuestions,
      s.historyCorrect,
      s.historyAccuracy,
      SUBJECT_CHART_COLORS.history,
    ),
    subjectRow(
      "hebrew",
      "עברית",
      sumTopicMapMinutes(report.hebrewTopics),
      s.hebrewQuestions,
      s.hebrewCorrect,
      s.hebrewAccuracy,
      SUBJECT_CHART_COLORS.hebrew,
    ),
    subjectRow(
      "moledet",
      VISUAL_STRAND_LABEL_HE.moledet,
      sumTopicMapMinutes(mgVisual.moledetTopics),
      mgVisual.moledetStats.questions,
      mgVisual.moledetStats.correct,
      mgVisual.moledetStats.accuracy,
      SUBJECT_CHART_COLORS.moledet,
    ),
    subjectRow(
      "geography",
      VISUAL_STRAND_LABEL_HE.geography,
      sumTopicMapMinutes(mgVisual.geographyTopics),
      mgVisual.geographyStats.questions,
      mgVisual.geographyStats.correct,
      mgVisual.geographyStats.accuracy,
      SUBJECT_CHART_COLORS.geography,
    ),
  ];
}

function chartSubjectIdFromKeyPrefix(keyPrefix) {
  if (String(keyPrefix || "").startsWith("math_")) return "math";
  if (String(keyPrefix || "").startsWith("geometry_")) return "geometry";
  if (String(keyPrefix || "").startsWith("english_")) return "english";
  if (String(keyPrefix || "").startsWith("science_")) return "science";
  if (String(keyPrefix || "").startsWith("history_")) return "history";
  if (String(keyPrefix || "").startsWith("hebrew_")) return "hebrew";
  if (String(keyPrefix || "").startsWith("moledet")) return MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID;
  return "math";
}

function buildTopicRowsForChart(map, keyPrefix, regularDisplay = null) {
  const subjectId = chartSubjectIdFromKeyPrefix(keyPrefix);
  const rows = Object.entries(map || {}).map(([k, data]) => {
    const bucketKey = String(data?.bucketKey || k).trim();
    const displayName = String(data?.displayName || "").trim();
    const labelRaw =
      String(data?.narrativeTopicLabelHe || data?.rowIdentityV1?.narrativeTopicLabelHe || "").trim() ||
      parentReportChartLabelFromAllItemKey(`${keyPrefix}_${k}`, data);
    const cleanedRaw = regularDisplay
      ? cleanTopicLabelForRegularReportHe(labelRaw, data, regularDisplay.registeredGradeKey)
      : labelRaw;
    const label = regularDisplay
      ? regularDisplay.formatTopicLabel(cleanedRaw, { ...data, label: cleanedRaw })
      : cleanedRaw;
    const metrics =
      data?.parentVisibleMetrics && typeof data.parentVisibleMetrics === "object"
        ? data.parentVisibleMetrics
        : normalizeParentVisibleMetrics(data || {});
    return {
      rowKey: `${keyPrefix}_${k}`,
      rowSourceId: data?.rowSourceId || data?.rowIdentityV1?.sourceId || null,
      subjectId,
      topicKey: bucketKey,
      bucketKey,
      displayName: displayName || label,
      label,
      accuracy: metrics.accuracy,
      timeMinutes: Math.round(Number(data?.timeMinutes) || 0),
      questions: metrics.questions,
      correct: metrics.correct,
      wrong: metrics.wrong,
      parentVisibleMetrics: metrics,
      learningPatternDecision:
        data?.learningPatternDecision && typeof data.learningPatternDecision === "object"
          ? data.learningPatternDecision
          : null,
      topicEngineRowSignals: data?.topicEngineRowSignals && typeof data.topicEngineRowSignals === "object" ? data.topicEngineRowSignals : null,
      trend: data?.trend && typeof data.trend === "object" ? data.trend : null,
      trendV1: data?.trendV1 && typeof data.trendV1 === "object" ? data.trendV1 : null,
      behaviorProfile: data?.behaviorProfile && typeof data.behaviorProfile === "object" ? data.behaviorProfile : null,
      decisionTrace: Array.isArray(data?.decisionTrace) ? data.decisionTrace : null,
      recommendationDecisionTrace: Array.isArray(data?.recommendationDecisionTrace)
        ? data.recommendationDecisionTrace
        : null,
      patternStabilityHe: data?.patternStabilityHe ? String(data.patternStabilityHe) : "",
      dataSufficiencyLabelHe: data?.dataSufficiencyLabelHe ? String(data.dataSufficiencyLabelHe) : "",
    };
  });
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

function topicBarColorFromRow(row) {
  const ui = topicUiFromLearningPatternDecision(row);
  if (ui.hasLpd) {
    if (ui.excellent || ui.findingType === "success_pattern") return "#10b981";
    if (ui.needsPractice) return "#f59e0b";
    return "#94a3b8";
  }
  return topicBarColor(Number(row?.accuracy) || 0);
}

function topicAccuracyTextClass(row) {
  return topicUiFromLearningPatternDecision(row).accuracyClass;
}

function topicStatusEmoji(row) {
  return topicUiFromLearningPatternDecision(row).statusEmoji;
}

function topicShowsNeedsPractice(row) {
  return topicUiFromLearningPatternDecision(row).needsPractice;
}

function topicShowsExcellent(row) {
  return topicUiFromLearningPatternDecision(row).excellent;
}

/** סדר תצוגת אבחון מקצועי — תואם `patternDiagnostics.subjects` (הצטיינות עקבית → תוצאות טובות יחסית → מומלץ לשמר → נקודות לשיפור → תחומים דורשים תשומת לב) */
const PATTERN_DIAGNOSTIC_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
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
  const isV1Payload = pdVersion < 2;
  let hasGlobalSignal = false;
  const normalizedSubjects = {};
  for (const id of PATTERN_DIAGNOSTIC_SUBJECT_ORDER) {
    const raw = subjects[id];
    if (!raw) continue;
    const isV2OrHasWeaknesses = pdVersion >= 2 || Array.isArray(raw.weaknesses);
    if (!isV2OrHasWeaknesses) {
      // V1 payload — do not run migration; suppress to avoid unvalidated text reaching parent.
      normalizedSubjects[id] = { ...raw, hasAnySignal: false };
      continue;
    }
    normalizedSubjects[id] = raw;
    if (raw?.hasAnySignal) hasGlobalSignal = true;
  }
  void isV1Payload;

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
  { title: "מתמטיקה - דיוק לפי נושא", mapKey: "mathOperations", prefix: "math_", border: "border-blue-400/25" },
  { title: "גאומטריה - דיוק לפי נושא", mapKey: "geometryTopics", prefix: "geometry_", border: "border-emerald-400/25" },
  { title: "אנגלית - דיוק לפי נושא", mapKey: "englishTopics", prefix: "english_", border: "border-purple-400/25" },
  { title: "מדעים - דיוק לפי נושא", mapKey: "scienceTopics", prefix: "science_", border: "border-green-400/25" },
  { title: "היסטוריה - דיוק לפי נושא", mapKey: "historyTopics", prefix: "history_", border: "border-amber-400/25" },
  { title: "עברית - דיוק לפי נושא", mapKey: "hebrewTopics", prefix: "hebrew_", border: "border-orange-400/25" },
  {
    title: `${VISUAL_STRAND_LABEL_HE.moledet} - דיוק לפי נושא`,
    mapKey: "_visualMoledetTopics",
    prefix: moledetGeographyReportTopicKeyPrefix(),
    border: "border-cyan-400/25",
  },
  {
    title: `${VISUAL_STRAND_LABEL_HE.geography} - דיוק לפי נושא`,
    mapKey: "_visualGeographyTopics",
    prefix: moledetGeographyReportTopicKeyPrefix(),
    border: "border-teal-400/25",
  },
];

/**
 * גיאומטריית אב - "סיכום לפי שש המקצועות" הוא המקור; מסילת המגרעת (רוחב פיקסלים) זהה לכל גרפי הנושא.
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

function augmentReportWithVisualMgSplit(report) {
  if (!report) return report;
  const split = splitMoledetGeographyReportForDisplay(report);
  return {
    ...report,
    _visualMoledetTopics: split.moledetTopics,
    _visualGeographyTopics: split.geographyTopics,
  };
}

function collectAllTopicChartLabels(report) {
  if (!report) return [];
  const augmented = augmentReportWithVisualMgSplit(report);
  const registeredGradeKey = resolveRegisteredGradeKeyFromReport(report);
  const out = [];
  for (const cfg of TOPIC_BAR_SUBJECT_CARDS) {
    const map = filterTopicMapForRegularReport(augmented[cfg.mapKey], registeredGradeKey);
    if (!map || typeof map !== "object") continue;
    for (const [k, data] of Object.entries(map)) {
      const labelRaw = parentReportChartLabelFromAllItemKey(`${cfg.prefix}${k}`, data);
      const label = registeredGradeKey
        ? formatRegularReportTopicLabelHe(labelRaw, data, registeredGradeKey)
        : labelRaw;
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

  const summaryNames = filterSubjectOverviewRowsWithEvidence(buildSubjectOverviewRows(report)).map((r) => r.name);
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

const chartTooltipStyleLight = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  color: "#0f172a",
  direction: "rtl",
  fontSize: "13px",
};

/** Below this inclusive total-question count, omit charts (thin global evidence). */
const PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX = 14;

function subjectPracticeSecondaryLineHe(questions, correct, accuracy, timeMinutes) {
  const metrics = normalizeParentVisibleMetrics({ questions, correct, accuracy });
  const q = metrics.questions;
  const tm = Number(timeMinutes) || 0;
  if (q > 0) return `${metrics.correct} נכון • ${metrics.accuracy}% דיוק`;
  if (tm > 0) return `${tm} דק׳ תרגול`;
  return null;
}

function hasMeaningfulExampleAnswer(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s === "-" || s === "-" || s.toLowerCase() === "undefined") return false;
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
  const regularView = useMemo(
    () => (report ? buildRegularReportViewModel(report) : null),
    [report]
  );
  const displayReport = regularView?.report ?? report;
  const regularReportDisplay = regularView?.display ?? null;
  const mgVisualSplit = useMemo(
    () => (displayReport ? splitMoledetGeographyReportForDisplay(displayReport) : null),
    [displayReport]
  );
  const reportWithVisualMg = useMemo(() => {
    if (!displayReport) return null;
    const split = splitMoledetGeographyReportForDisplay(displayReport);
    return {
      ...displayReport,
      _visualMoledetTopics: split.moledetTopics,
      _visualGeographyTopics: split.geographyTopics,
    };
  }, [displayReport]);
  const dailyActivityVisual = useMemo(
    () =>
      displayReport
        ? enrichDailyActivityWithVisualStrands(displayReport.dailyActivity, displayReport)
        : [],
    [displayReport]
  );
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
  const { theme, isBright } = useStudentTheme();
  const layoutProps = getParentReportLayoutProps(theme);
  const reportImmersive = isImmersiveGameLayoutPath(router.pathname);
  const reportShellOpts = { immersive: reportImmersive };
  useParentReportBrightPageBackground(isBright);
  const parentReportPdfRef = useRef(null);
  /** רוחב פנימי משוער לכרטיס גרף (עמודת PDF − ריפוד כרטיס) — למגרעת X דינמית */
  const [chartHostInnerWidthPx, setChartHostInnerWidthPx] = useState(0);
  const [parentReportError, setParentReportError] = useState("");
  const reportRemoteFetchKeyRef = useRef(null);
  const reportRemoteInflightKeyRef = useRef(null);
  const remoteRouterSyncedRef = useRef(false);
  const REPORT_REMOTE_FETCH_TIMEOUT_MS = 45_000;

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

  const formatActivitySource = (row) =>
    formatParentReportActivityDisplayLabelHe(row, {
      subjectId: row?.subject || row?.subjectId,
    });

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
    const { from, to } = computeReportRangeForParentApi(
      period,
      customDates,
      appliedStartDate,
      appliedEndDate
    );
    const reportPeriodForApi =
      customDates && appliedStartDate && appliedEndDate
        ? "custom"
        : period === "month"
          ? "month"
          : "week";
    return async (input) =>
      postParentCopilotTurn({
        utterance: input.utterance,
        sessionId: input.sessionId,
        audience: input.audience,
        payload: input.payload,
        reportPeriod: reportPeriodForApi,
        rangeFrom: from,
        rangeTo: to,
        ...(copilotStudentId ? { studentId: copilotStudentId } : {}),
        selectedContextRef: input.selectedContextRef ?? null,
        clickedFollowupFamily: input.clickedFollowupFamily ?? null,
      });
  }, [
    enableParentCopilotOnShortEffective,
    copilotStudentId,
    period,
    customDates,
    appliedStartDate,
    appliedEndDate,
  ]);

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
      reportRemoteFetchKeyRef.current = null;
      setPlayerName("");
      setReport(null);
      setShortContractTop(null);
      setCopilotDetailedPayload(null);
      setParentReportError("");
      remoteRouterSyncedRef.current = true;
      return undefined;
    }

    setPlayerName("");
    setReport(null);
    setShortContractTop(null);
    setCopilotDetailedPayload(null);
    setParentReportError("");
    setLoading(false);
    remoteRouterSyncedRef.current = true;
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
    if (!remoteRouterSyncedRef.current) return undefined;

    let cancelled = false;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) abortController.abort();
    }, REPORT_REMOTE_FETCH_TIMEOUT_MS);

    const run = async () => {
      const { from, to } = computeReportRangeForParentApi(
        period,
        customDates,
        appliedStartDate,
        appliedEndDate
      );
      const fetchKey = `${parentStudentId}|${from}|${to}|${isTeacherSource ? "teacher" : "parent"}`;
      const uiPeriod =
        customDates || period === "day" || period === "schoolYear" ? "custom" : period;
      if (reportRemoteFetchKeyRef.current === fetchKey) {
        setLoading(false);
        return;
      }
      if (reportRemoteInflightKeyRef.current === fetchKey) {
        return;
      }
      reportRemoteInflightKeyRef.current = fetchKey;

      const setters = {
        setReport,
        setPlayerName,
        setShortContractTop,
        setCopilotDetailedPayload,
        setParentReportError,
        setLoading,
      };
      const cachedBody = readParentReportRemoteSessionCache(fetchKey);
      const hasSessionCache =
        cachedBody &&
        applyParentReportRemoteApiBody(cachedBody, uiPeriod, setters);
      if (!hasSessionCache) {
        setLoading(true);
        setParentReportError("");
      }

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
        reportRemoteInflightKeyRef.current = null;
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
              ? "נדרשת התחברות כמורה - התחברו מחדש ונסו שוב."
              : "נדרשת התחברות כהורה - השתמשו בכניסת הורה ונסו שוב."
          );
          setReport(null);
          setCopilotDetailedPayload(null);
          setLoading(false);
        }
        reportRemoteInflightKeyRef.current = null;
        return;
      }

      try {
        const qs = new URLSearchParams({ from, to });
        const remoteKind = isTeacherSource ? "teacher" : "parent";
        const url = parentReportRemoteDataUrl(remoteKind, parentStudentId, qs);
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          signal: abortController.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.ok === false) {
          if (!cancelled) {
            const msg = mapParentReportLoadError(
              res.status,
              body?.code,
              typeof body?.error === "string" ? body.error : null,
              { isTeacher: isTeacherSource },
            );
            setParentReportError(msg);
            setReport(null);
            setCopilotDetailedPayload(null);
            setLoading(false);
          }
          reportRemoteInflightKeyRef.current = null;
          return;
        }

        const uiPeriodResolved =
          customDates || period === "day" || period === "schoolYear" ? "custom" : period;
        const out = runParentReportGenerationFromApiBody(body, uiPeriodResolved);
        if (!out.ok || !out.base) {
          if (!cancelled) {
            setParentReportError("לא ניתן לבנות את הדוח מהנתונים שהתקבלו מהשרת.");
            setReport(null);
            setCopilotDetailedPayload(null);
            setLoading(false);
          }
          reportRemoteInflightKeyRef.current = null;
          return;
        }
        if (!cancelled) {
          writeParentReportRemoteSessionCache(fetchKey, body);
          setReport(out.base);
          setPlayerName(out.playerName);
          setShortContractTop(out.detailed?.parentProductContractV1?.top || null);
          setCopilotDetailedPayload(out.detailed && typeof out.detailed === "object" ? out.detailed : null);
          setParentReportError("");
          setLoading(false);
          reportRemoteFetchKeyRef.current = fetchKey;
          reportRemoteInflightKeyRef.current = null;
          if (isParentSource) {
            void trackProductEvent({
              eventName: "parent_report_opened",
              actorType: "parent",
              studentId: parentStudentId,
              metadata: { period: uiPeriodResolved, from, to },
            });
          }
        }
      } catch (loadErr) {
        if (process.env.NODE_ENV === "development") {
          console.error("[parent-report] report load failed:", loadErr);
        }
        if (!cancelled) {
          const aborted =
            loadErr &&
            typeof loadErr === "object" &&
            (loadErr.name === "AbortError" ||
              /aborted|timeout/i.test(String(loadErr.message || "")));
          setParentReportError(
            aborted
              ? "טעינת הדוח לקחה יותר מדי זמן - נסו טווח קצר יותר או רענון."
              : "שגיאת רשת בטעינת הדוח."
          );
          setReport(null);
          setCopilotDetailedPayload(null);
          setLoading(false);
        }
        reportRemoteInflightKeyRef.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      abortController.abort();
      reportRemoteInflightKeyRef.current = null;
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

  const activeTooltipStyle = isBright ? chartTooltipStyleLight : chartTooltipStyle;

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
      idlePresetClassName="bg-white/30 text-white border border-white/40 hover:bg-white/45"
      activePresetClassName="bg-blue-500/80 text-white border border-blue-400/50"
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
    if (!displayReport) return null;
    return computeMasterBarChartGeometry(displayReport, {
      isMobileViewport: isMobile,
      forceDesktopLayout: isPrintLayout,
      chartHostInnerWidthPx,
    });
  }, [displayReport, isMobile, isPrintLayout, chartHostInnerWidthPx]);

  const diagnosticsView = useMemo(
    () => (report ? buildParentReportDiagnosticsView(report) : null),
    [report]
  );
  const regularReportAiExplanation = useMemo(
    () =>
      report && report.parentAiExplanation
        ? regularReportDisplay?.transformAiExplanation(report.parentAiExplanation) ??
          report.parentAiExplanation
        : report?.parentAiExplanation ?? null,
    [report, regularReportDisplay]
  );
  const hasServerHomeRecommendations = useMemo(() => {
    const recs = report?.parentFacing?.homeRecommendations;
    return Array.isArray(recs) && recs.filter(Boolean).length > 0;
  }, [report]);
  // Wave 2 Fix 1.2: "חוזקות שבלטו בתרגול" already covers subject-level strengths in
  // detail, so the shorter Overview headline is only needed as a fallback when that
  // block has nothing to show.
  const hasRawMetricStrengthsHe = useMemo(() => {
    const lines = report?.rawMetricStrengthsHe || report?.summary?.rawMetricStrengthsHe;
    return Array.isArray(lines) && lines.filter(Boolean).length > 0;
  }, [report]);
  const weeklyHomeActionHe = useMemo(
    () =>
      report
        ? resolveParentReportWeeklyHomeActionHe({
            shortContractTop,
            report,
            diagnosticsView,
          })
        : null,
    [shortContractTop, report, diagnosticsView]
  );
  const showWeeklyInShortContract = !hasServerHomeRecommendations;
  const serverHomeRecommendationsListHe = useMemo(() => {
    const recs = report?.parentFacing?.homeRecommendations;
    return Array.isArray(recs) ? recs.map((x) => String(x || "").trim()).filter(Boolean) : [];
  }, [report]);
  const firstServerHomeRecommendationHe = serverHomeRecommendationsListHe[0] || null;
  // Wave 2 Fix 1.1: the weekly action line already renders inside
  // ParentReportShortContractPreview whenever server home recs are absent, and its
  // content matches the first parentFacing.homeRecommendations item whenever server
  // recs exist and there's no distinct shortContractTop.doNowHe override. Only show it
  // again in the Overview block when it's genuinely not shown anywhere else already.
  const weeklyHomeActionAlreadyShownElsewhere = useMemo(() => {
    if (!weeklyHomeActionHe) return false;
    if (!hasServerHomeRecommendations) return true; // shown via ParentReportShortContractPreview
    return isDuplicateParentReportText(weeklyHomeActionHe, firstServerHomeRecommendationHe);
  }, [weeklyHomeActionHe, hasServerHomeRecommendations, firstServerHomeRecommendationHe]);
  const showWeeklyInDiagnosticOverview =
    Boolean(report?.summary?.diagnosticOverviewHe) && !weeklyHomeActionAlreadyShownElsewhere;
  const suppressChartsForThinEvidenceWindow = useMemo(() => {
    if (!displayReport?.summary) return false;
    const q = Number(displayReport.summary.totalQuestions) || 0;
    return q > 0 && q <= PARENT_REPORT_THIN_VOLUME_QUESTIONS_MAX;
  }, [displayReport]);
  const diagnosticSourceLabelHe = useMemo(
    () => diagnosticPrimarySourceParentLabelHe(String(report?.diagnosticPrimarySource || "")),
    [report]
  );

  if (loading) {
    return (
      <Layout {...layoutProps} layoutLockViewport={!reportImmersive}>
        <div
          className={
            reportImmersive
              ? "relative h-[100svh] max-h-[100svh] overflow-hidden"
              : "relative flex-1 min-h-0 h-full max-h-full overflow-hidden"
          }
        >
          <ParentReportThemeIcons className="absolute top-4 left-1/2 -translate-x-1/2 z-10" />
          <PortalLoadingPanel
            isBright={isBright}
            fullPage={reportImmersive}
            className="!min-h-0 h-full max-h-full overflow-hidden"
            message="מכין את דוח הביצועים..."
          />
        </div>
        {reportImmersive ? (
          <StudentFixedBottomAdChrome theme={isBright ? "bright" : "classic"} />
        ) : null}
      </Layout>
    );
  }

  if (isRemoteReportSource && parentReportError && !report) {
    return (
      <Layout {...layoutProps}>
        <div
          className={getParentReportStateShellClass(isBright)}
          style={getParentReportStateShellStyle(isBright)}
          dir="rtl"
        >
          <ParentReportThemeIcons className="mb-2" />
          <p className={getParentReportErrorTextClass(isBright)}>{parentReportError}</p>
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
                  className={getParentReportSecondaryLinkClass(isBright)}
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
                <Link href="/parent/dashboard" className={getParentReportSecondaryLinkClass(isBright)}>
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
      <Layout {...layoutProps}>
        <div
          className={getParentReportStateShellClass(isBright)}
          style={getParentReportStateShellStyle(isBright)}
          dir="rtl"
          data-testid="parent-report-portal-gate"
        >
          <ParentReportThemeIcons className="mb-2" />
          <div className="text-4xl">📊</div>
          <h1 className={`text-2xl font-bold ${isBright ? "text-slate-900" : "text-white"}`}>
            {PARENT_REPORT_PORTAL_GATE.titleHe}
          </h1>
          <p className={`text-center max-w-md ${isBright ? "text-slate-600" : "text-white/80"}`}>
            {PARENT_REPORT_PORTAL_GATE.messageHe}
          </p>
          <p className={`text-center text-sm max-w-md ${isBright ? "text-slate-500" : "text-white/50"}`}>
            {PARENT_REPORT_PORTAL_GATE.hintHe}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/parent/login"
              className="rounded-lg px-4 py-2 bg-amber-500 text-black font-semibold"
            >
              כניסת הורה
            </Link>
            <Link href="/parent/dashboard" className={getParentReportSecondaryLinkClass(isBright)}>
              דשבורד הורים
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (
    !report ||
    !displayReport?.summary ||
    (displayReport.summary.totalQuestions === 0 && displayReport.summary.totalTimeMinutes === 0)
  ) {
    const emptyPlayerName = playerName || report?.playerName || "";
    return (
      <Layout {...layoutProps} layoutLockViewport={!reportImmersive}>
        <Head>
          <style>{PARENT_REPORT_SITE_BRIGHT_CSS}</style>
        </Head>
        {/* Same page shell / top spacing as populated report - no vertical centering. */}
        <div
          className={getParentReportNoScrollPageShellClass(isBright, reportShellOpts)}
          dir="rtl"
          style={getParentReportNoScrollPageContentStyle(isBright, reportShellOpts)}
          data-testid="parent-report-empty-period"
        >
          <div className="max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden">
            <ParentReportExitNav className="mb-0" isBright={isBright} showShortReportLink={false} />

            <div className="text-center mb-1 md:mb-2">
              <h1 className="parent-report-print-page-section-heading text-2xl md:text-3xl font-extrabold mb-2">
                📊 דוח להורים
              </h1>
              <p className="text-white/70 text-sm md:text-base">{emptyPlayerName}</p>

              <div className="mt-1 md:mt-2 mb-1 md:mb-2 no-pdf">{parentReportDatePresets}</div>
            </div>

            <p
              className={`text-center max-w-md mx-auto mt-2 md:mt-3 ${
                isBright ? "text-slate-600" : "text-white/70"
              }`}
            >
              {PARENT_REPORT_PERIOD_EMPTY_STATE_HE}
            </p>
          </div>
        </div>
        {reportImmersive ? (
          <StudentFixedBottomAdChrome theme={isBright ? "bright" : "classic"} />
        ) : null}
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
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
            #parent-report-pdf .parent-report-topic-explain-block > div:last-child {
              max-height: none !important;
              overflow: visible !important;
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

          /* ===== מצב בהיר — זהה ל-Layout / דשבורד הורה ===== */
          ${PARENT_REPORT_SITE_BRIGHT_CSS}
        `}</style>
      </Head>
      <div
        className={getParentReportPageShellClass(isBright, reportShellOpts)}
        dir="rtl"
        style={getParentReportPageContentStyle(isBright, reportShellOpts)}
      >
        <div
          id="parent-report-pdf"
          ref={parentReportPdfRef}
          className="max-w-4xl mx-auto w-full min-w-0 overflow-x-hidden"
        >
          <ParentReportExitNav className="mb-0" isBright={isBright} showShortReportLink={false} />
          
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

            <div className="flex flex-wrap justify-center gap-2 mt-2 no-pdf">
              <Link
                href={{
                  pathname: "/parent/parent-report-detailed",
                  query: detailedReportQuery,
                }}
                prefetch={false}
                className={
                  isBright
                    ? "inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 border border-violet-400 text-white hover:bg-violet-700 shadow-sm transition-all"
                    : "inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-violet-500/35 border border-violet-300/45 hover:bg-violet-500/50 text-white transition-all"
                }
              >
                דוח מקיף לתקופה
              </Link>
            </div>

            {/* בחירת תאריכים מותאמת אישית (לא נכנס ל-PDF) - rendered inside ReportDateRangeControl */}
            
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
                {displayReport.summary.totalTimeMinutes} דק'
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                ({displayReport.summary.totalTimeHours} שעות)
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                שאלות
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-emerald-400">
                {displayReport.summary.totalQuestions}
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                {displayReport.summary.totalCorrect} נכון
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                דיוק כללי
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-yellow-400">
                {displayReport.summary.overallAccuracy}%
              </div>
            </div>
            
            <div className="parent-report-print-summary-card bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 text-center">
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60 mb-1">
                רמה
              </div>
              <div className="parent-report-print-summary-stat text-lg md:text-2xl font-bold text-purple-400">
                רמה {displayReport.summary.playerLevel}
              </div>
              <div className="parent-report-print-summary-label text-[10px] md:text-xs text-white/60">
                ⭐ {displayReport.summary.stars} • 🏆 {displayReport.summary.achievements}
              </div>
            </div>
          </div>

          <ParentReportDataHealthNote
            diagnosticOverviewHe={report.summary?.diagnosticOverviewHe}
            dataQualityNoteHe={report.summary?.activityGapNoteHe || null}
            mixedGradePracticeNoteHe={report?.gradePracticeMeta?.mixedGradePracticeNoteHe}
          />

          {!hasServerHomeRecommendations ? (
            <ParentReportShortContractPreview
              top={shortContractTop}
              weeklyHomeActionHe={showWeeklyInShortContract ? weeklyHomeActionHe : null}
              visibleTextFn={diagnosticParentVisibleTextHe}
            />
          ) : null}

          {report.summary?.diagnosticOverviewHe ? (
            <div className="mb-3 md:mb-5 avoid-break rounded-lg border border-amber-400/25 bg-amber-950/15 p-3 md:p-4 text-sm text-white/90 space-y-2">
              <p className="font-bold text-amber-100/95 m-0 text-sm md:text-base">מה הכי בולט עכשיו</p>
              {regularReportDisplay?.prominentFindingLinesHe?.length ? (
                <ul className="m-0 pr-4 list-disc text-xs md:text-sm text-white/88 space-y-1.5">
                  {regularReportDisplay.prominentFindingLinesHe.map((line, i) => (
                    <li key={`prominent-${i}`} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  {report.summary.diagnosticOverviewHe.practicedSubjectsSummaryHe ? (
                    <p className="m-0 leading-relaxed text-white/70 text-xs md:text-sm">
                      {report.summary.diagnosticOverviewHe.practicedSubjectsSummaryHe}
                    </p>
                  ) : null}
                  {!shortContractTop && report.summary.diagnosticOverviewHe.mainFocusAreaLineHe ? (
                    <p className="m-0 leading-relaxed">
                      <span className="text-white/55">כדאי לשים לב: </span>
                      {report.summary.diagnosticOverviewHe.mainFocusAreaLineHe}
                    </p>
                  ) : !shortContractTop ? (
                    <p className="m-0 text-white/55 text-xs">
                      {Number(displayReport.summary?.totalQuestions) > 0 &&
                      diagnosticsView?.presence?.state === "hasVolumeNoPattern"
                        ? "יש נתוני תרגול בתקופה שנבחרה, אך עדיין אין מספיק בסיס ברור מהתרגולים כדי לראות לאיזה נושא כדאי להתמקד - כדאי להמשיך בתרגול ולעקוב שוב לאחר מכן."
                        : "אין עדיין תחום שכדאי לשים לב עכשיו בתקופה שנבחרה."}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <ParentReportParentSections report={displayReport} visibleSections={["insights", "teacher"]} />

          {regularReportDisplay?.topicStrengthLinesHe?.length ? (
            <div className="mb-3 md:mb-5 avoid-break rounded-lg border border-emerald-400/25 bg-emerald-950/15 p-3 md:p-4 text-sm text-white/90 space-y-1">
              <p className="font-bold text-emerald-100/95 m-0 text-sm md:text-base">חוזקות שבלטו בתרגול</p>
              <ul className="m-0 pr-4 list-disc text-xs md:text-sm text-white/85 space-y-1">
                {regularReportDisplay.topicStrengthLinesHe.map((line, i) => (
                  <li key={`rms-${i}`} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* סיכום לפי מקצוע - רק מקצועות עם evidence בתקופה */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-6 avoid-break">
            {filterSubjectOverviewRowsWithEvidence(buildSubjectOverviewRows(displayReport)).map((row) => {
              const ui = SUBJECT_OVERVIEW_CARD_UI[row.key] || SUBJECT_OVERVIEW_CARD_UI.math;
              const secondary = subjectPracticeSecondaryLineHe(
                row.questions,
                row.correct,
                row.accuracy,
                row.minutes
              );
              return (
                <div
                  key={row.key}
                  className={`parent-report-print-summary-card ${ui.cardClass} rounded-lg p-2 md:p-4 text-center`}
                >
                  <div className="parent-report-print-summary-label text-xs md:text-sm text-white/60 mb-1">
                    {ui.emoji} {row.name}
                  </div>
                  <div className={`parent-report-print-summary-stat text-base md:text-lg font-bold ${ui.statClass}`}>
                    {row.questions > 0 ? `${row.questions} שאלות` : `${row.minutes} דק׳`}
                  </div>
                  {secondary ? (
                    <div className="parent-report-print-muted-text text-xs text-white/80">{secondary}</div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <ParentReportInsight
            explanation={regularReportAiExplanation}
            excludeHomeTipTextsHe={serverHomeRecommendationsListHe}
          />

          {enableParentCopilotOnShortEffective && copilotDetailedPayload ? (
            <div className="no-pdf mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-2">
              <ParentCopilotShellLazy
                payload={copilotDetailedPayload}
                asyncTurnRunner={shortReportCopilotTurnRunner}
              />
            </div>
          ) : null}

          {/* טבלת פעולות מתמטיקה */}
          {regularReportTopicMapHasRows(displayReport, "mathOperations", regularReportDisplay) && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="parent-report-math-progress-title text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🧮 התקדמות במתמטיקה</h2>
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(displayReport, "mathOperations", regularReportDisplay)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([op, data]) => (
                        <tr key={op} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel("math", data, op, regularReportDisplay)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            topicAccuracyTextClass(data)
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(displayReport, "mathOperations", regularReportDisplay)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([op, data]) => (
                    <div key={op} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-blue-400">{regularReportTopicLabel("math", data, op, regularReportDisplay)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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
          {regularReportTopicMapHasRows(displayReport, "geometryTopics", regularReportDisplay) && (
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(displayReport, "geometryTopics", regularReportDisplay)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel("geometry", data, topic, regularReportDisplay)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            topicAccuracyTextClass(data)
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(displayReport, "geometryTopics", regularReportDisplay)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-emerald-400">{regularReportTopicLabel("geometry", data, topic, regularReportDisplay)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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
          {regularReportTopicMapHasRows(displayReport, "englishTopics", regularReportDisplay) && (
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(displayReport, "englishTopics", regularReportDisplay)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel("english", data, topic, regularReportDisplay)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${
                            topicAccuracyTextClass(data)
                          }`}>
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(displayReport, "englishTopics", regularReportDisplay)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-purple-400">{regularReportTopicLabel("english", data, topic, regularReportDisplay)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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
          {regularReportTopicMapHasRows(displayReport, "scienceTopics", regularReportDisplay) && (
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(displayReport, "scienceTopics", regularReportDisplay)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel("science", data, topic, regularReportDisplay)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${topicAccuracyTextClass(data)}`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(displayReport, "scienceTopics", regularReportDisplay)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-green-400">{regularReportTopicLabel("science", data, topic, regularReportDisplay)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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
          {regularReportTopicMapHasRows(displayReport, "hebrewTopics", regularReportDisplay) && (
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(displayReport, "hebrewTopics", regularReportDisplay)
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel("hebrew", data, topic, regularReportDisplay)}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${topicAccuracyTextClass(data)}`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(displayReport, "hebrewTopics", regularReportDisplay)
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-orange-400">{regularReportTopicLabel("hebrew", data, topic, regularReportDisplay)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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

          {/* טבלת נושאים מולדת */}
          {regularReportTopicMapHasRows({ moledetTopics: mgVisualSplit?.moledetTopics }, "moledetTopics", regularReportDisplay) && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🏠 התקדמות ב{VISUAL_STRAND_LABEL_HE.moledet}</h2>
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(
                      { moledetTopics: mgVisualSplit?.moledetTopics },
                      "moledetTopics",
                      regularReportDisplay,
                    )
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel(
                                MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
                                data,
                                topic,
                                regularReportDisplay,
                              )}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${topicAccuracyTextClass(data)}`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
                {regularReportTopicTableEntries(
                      { moledetTopics: mgVisualSplit?.moledetTopics },
                      "moledetTopics",
                      regularReportDisplay,
                    )
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-cyan-400">{subjectTopicLabelForParentHe(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID, data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span> <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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

          {/* טבלת נושאים גאוגרפיה */}
          {regularReportTopicMapHasRows({ geographyTopics: mgVisualSplit?.geographyTopics }, "geographyTopics", regularReportDisplay) && (
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
              <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">🗺️ התקדמות ב{VISUAL_STRAND_LABEL_HE.geography}</h2>
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
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">מקור</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">תאריך אחרון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">שאלות</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">נכון</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">דיוק</th>
                      <th className="text-center py-1.5 px-0.5 whitespace-nowrap">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularReportTopicTableEntries(
                      { geographyTopics: mgVisualSplit?.geographyTopics },
                      "geographyTopics",
                      regularReportDisplay,
                    )
                      .sort(([_, a], [__, b]) => b.questions - a.questions)
                      .map(([topic, data]) => (
                        <tr key={topic} className="border-b border-white/10">
                          <td className="text-right align-top py-1.5 px-1 min-w-0">
                            <span className="text-right break-words">
                              {regularReportTopicLabel(
                                MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID,
                                data,
                                topic,
                                regularReportDisplay,
                              )}
                            </span>
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatParentReportLevelHe(data.levelKey || data.level)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {regularReportGradeCell(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatActivitySource(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap tabular-nums">
                            {data.lastSessionAt ?? "לא זמין"}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {formatRegularReportTopicTimeCellHe(data)}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-white/80 text-[11px] md:text-sm whitespace-nowrap">
                            {data.questions}
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-emerald-400 text-[11px] md:text-sm whitespace-nowrap">
                            {data.correct}
                          </td>
                          <td
                            className={`py-1.5 px-0.5 text-center font-bold text-[11px] md:text-sm whitespace-nowrap ${topicAccuracyTextClass(data)}`}
                          >
                            {data.accuracy}%
                          </td>
                          <td className="py-1.5 px-0.5 text-center text-[10px] md:text-sm whitespace-nowrap align-top">
                            <div className="flex flex-col items-center">
                              {topicShowsExcellent(data) ? (
                                <span className="text-emerald-400">✅</span>
                              ) : topicShowsNeedsPractice(data) ? (
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
              <div className="parent-report-mobile-only md:hidden space-y-3">
                {regularReportTopicTableEntries(
                      { geographyTopics: mgVisualSplit?.geographyTopics },
                      "geographyTopics",
                      regularReportDisplay,
                    )
                  .sort(([_, a], [__, b]) => b.questions - a.questions)
                  .map(([topic, data]) => (
                    <div key={topic} className="bg-black/40 border border-white/20 rounded-lg p-3">
                      <div className="font-semibold text-sm mb-2 text-teal-400">{subjectTopicLabelForParentHe(MOLEDET_GEOGRAPHY_REPORT_SUBJECT_ID, data, topic)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-white/60">רמה:</span> <span className="text-white/90">{formatParentReportLevelHe(data.levelKey || data.level)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">כיתה:</span> <span className="text-white/90">{regularReportGradeCell(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">מקור:</span> <span className="text-white/90">{formatActivitySource(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">תאריך אחרון:</span>{" "}
                          <span className="text-white/90">{data.lastSessionAt ?? "לא זמין"}</span>
                        </div>
                        <div>
                          <span className="text-white/60">זמן:</span> <span className="text-white/90">{formatRegularReportTopicTimeCellHe(data)}</span>
                        </div>
                        <div>
                          <span className="text-white/60">שאלות:</span> <span className="text-white/90">{data.questions}</span>
                        </div>
                        <div>
                          <span className="text-white/60">נכון:</span> <span className="text-emerald-400">{data.correct}</span>
                        </div>
                        <div>
                          <span className="text-white/60">דיוק:</span>{" "}
                          <span className={`font-bold ${
                            topicAccuracyTextClass(data)
                          }`}>{data.accuracy}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        {topicShowsExcellent(data) ? (
                          <span className="text-emerald-400 text-xs">✅ מצוין</span>
                        ) : topicShowsNeedsPractice(data) ? (
                          <span className="text-red-400 text-xs">⚠️ כדאי לתרגל עוד</span>
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

          {(() => {
            const exclusive = normalizeLearningTimeExclusiveBreakdown(
              displayReport?.summary?.learningTimeExclusiveBreakdown
            );
            if (!exclusive) return null;
            return (
              <div className="bg-black/30 border border-white/10 rounded-lg p-2 md:p-4 mb-3 md:mb-6 avoid-break">
                <h2 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-center">
                  חלוקת זמן הלמידה
                </h2>
                <div className="parent-report-desktop-only parent-report-table-wrap-print mt-2 overflow-x-auto">
                  <table className="w-full text-sm parent-report-subject-table">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-right py-1.5 px-0.5 whitespace-nowrap">סוג הלמידה</th>
                        <th className="text-center py-1.5 px-0.5 whitespace-nowrap">זמן</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="text-right py-1.5 px-1">תרגול עם שאלות</td>
                        <td className="py-1.5 px-0.5 text-center text-white/80 whitespace-nowrap">
                          {formatExclusiveLearningMinutesHe(exclusive.questionPracticeMinutes)} דק׳
                        </td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="text-right py-1.5 px-1">קריאת ספרים</td>
                        <td className="py-1.5 px-0.5 text-center text-white/80 whitespace-nowrap">
                          {formatExclusiveLearningMinutesHe(exclusive.bookReadingMinutes)} דק׳
                        </td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="text-right py-1.5 px-1">למידה פעילה נוספת</td>
                        <td className="py-1.5 px-0.5 text-center text-white/80 whitespace-nowrap">
                          {formatExclusiveLearningMinutesHe(exclusive.otherActiveLearningMinutes)} דק׳
                        </td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="text-right py-1.5 px-1 font-semibold">סך הכול</td>
                        <td className="py-1.5 px-0.5 text-center text-white/90 font-semibold whitespace-nowrap">
                          {formatExclusiveLearningMinutesHe(exclusive.totalMinutes)} דק׳
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* המלצות - מקור ראשי: patternDiagnostics; ישן רק אם אין אובייקט אבחון */}
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
                      (Number(displayReport.summary?.totalQuestions) > 0
                        ? PARENT_THIN_DATA_EXPLAINER_HE
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

                      const parentHomeActionHe = mergeParentReportHomeActionHe({
                        parentActionHe: s.parentActionHe,
                        parImp,
                      });
                      const nextWeekGoalHe = s.nextWeekGoalHe || null;
                      const summaryHe = s.summaryHe || null;

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
                                  ממה שתורגל:
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
                                          <span className="text-white/45">מה לעשות: </span>
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
                                    <span className="text-white/45 font-bold">מה הילד כבר זוכר טוב: </span>
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
                                      {diagnosticParentVisibleTextHe(x.labelHe)} - דיוק {x.accuracy}% ({x.questions} שאלות)
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
                                      {x.tierHe || "תוצאות טובות בנושא"}
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(x.labelHe)} - דיוק {x.accuracy}% ({x.questions} שאלות)
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
                                      {diagnosticParentVisibleTextHe(x.labelHe)} - דיוק {x.accuracy}% ({x.questions} שאלות)
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
                                      - דיוק {x.accuracy}% ({x.questions} שאלות)
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
                            {parentHomeActionHe &&
                            !serverHomeRecommendationsListHe.some((rec) =>
                              isDuplicateParentReportText(parentHomeActionHe, rec)
                            ) ? (
                              <div className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-yellow-500/15 border-yellow-400/45">
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">👪</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      מה אפשר לעשות בבית
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(parentHomeActionHe)}
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
                                      המלצה לילד/ה - שימור מה שעובד טוב
                                    </div>
                                    <div className="parent-report-print-muted-text text-xs md:text-sm text-white/80 break-words">
                                      {diagnosticParentVisibleTextHe(r.textHe)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {parMaint.map((r) => (
                              <div
                                key={r.id}
                                className="parent-report-rec-item p-2 md:p-3 rounded-lg border bg-violet-500/12 border-violet-400/40"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg shrink-0">💬</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="parent-report-print-subheading font-semibold text-xs md:text-sm text-white/90 mb-0.5">
                                      המלצה להורה - עידוד ושימור
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

          {/* --- אזור גרפים בלבד --- */}
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
            {(() => {
              const exclusive = normalizeLearningTimeExclusiveBreakdown(
                displayReport?.summary?.learningTimeExclusiveBreakdown
              );
              if (!exclusive) return null;
              const qMin = exclusive.questionPracticeMinutes;
              const bMin = exclusive.bookReadingMinutes;
              const oMin = exclusive.otherActiveLearningMinutes;
              const chartRow = [
                {
                  name: "חלוקה",
                  question: qMin,
                  book: bMin,
                  other: oMin,
                },
              ];
              return (
                <div className="parent-report-chart-card bg-black/30 border border-white/10 rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/20">
                  <div className="text-center mb-1 md:mb-2">
                    <h2 className="parent-report-print-chart-title text-base md:text-xl font-bold tracking-tight">
                      חלוקת זמן הלמידה
                    </h2>
                    <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/55 mt-0.5">
                      תרגול עם שאלות, קריאת ספרים ולמידה פעילה נוספת
                    </p>
                  </div>
                  <div className="w-full" style={{ minHeight: isMobile ? 160 : 180, direction: "ltr" }}>
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 180}>
                      <BarChart
                        layout="vertical"
                        data={chartRow}
                        margin={{ top: 8, right: 16, left: 8, bottom: 20 }}
                      >
                        <XAxis
                          type="number"
                          domain={[0, "dataMax"]}
                          tick={{ fill: "#ffffff85", fontSize: isMobile ? 10 : 11 }}
                          tickMargin={6}
                          tickFormatter={(value) =>
                            `${formatExclusiveLearningMinutesHe(value)} דק׳`
                          }
                        />
                        <YAxis type="category" dataKey="name" hide width={0} />
                        <Tooltip
                          contentStyle={activeTooltipStyle}
                          formatter={(value, name) => [
                            `${formatExclusiveLearningMinutesHe(value)} דק׳`,
                            name,
                          ]}
                        />
                        <Legend
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{
                            paddingBottom: 10,
                            fontSize: isMobile ? 11 : 12,
                            lineHeight: 1.4,
                          }}
                          iconSize={11}
                          formatter={(value) => {
                            let mins = 0;
                            if (value === "תרגול עם שאלות") mins = qMin;
                            else if (value === "קריאת ספרים") mins = bMin;
                            else if (value === "למידה פעילה נוספת") mins = oMin;
                            return (
                              <span className="parent-report-print-legend-label text-white/80">
                                {value} ({formatExclusiveLearningMinutesHe(mins)} דק׳)
                              </span>
                            );
                          }}
                        />
                        <Bar
                          dataKey="question"
                          stackId="lt"
                          name="תרגול עם שאלות"
                          fill="#34d399"
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="book"
                          stackId="lt"
                          name="קריאת ספרים"
                          fill="#60a5fa"
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="other"
                          stackId="lt"
                          name="למידה פעילה נוספת"
                          fill="#fbbf24"
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
            {dailyActivityVisual.length > 0 && (
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
                      data={dailyActivityVisual}
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
                        contentStyle={activeTooltipStyle}
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

            {dailyActivityVisual.length > 0 && (
              <div className="parent-report-chart-card bg-black/30 border border-white/10 rounded-xl p-3 md:p-5 avoid-break shadow-sm shadow-black/20">
                <div className="text-center mb-1 md:mb-2">
                  <h2 className="parent-report-print-chart-title text-base md:text-xl font-bold tracking-tight">
                    פעילות לפי מקצועות (יומי)
                  </h2>
                  <p className="parent-report-print-chart-subtitle text-[11px] md:text-xs text-white/55 mt-0.5">
                    מספר נושאים שונים שתורגלו בכל יום
                  </p>
                </div>
                <div className="w-full" style={{ minHeight: isMobile ? 260 : 320 }}>
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                    <LineChart
                      data={dailyActivityVisual}
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
                        contentStyle={activeTooltipStyle}
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
                        name="מתמטיקה"
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
                        dataKey="historyTopics"
                        stroke={SUBJECT_CHART_COLORS.history}
                        strokeWidth={1.8}
                        name="היסטוריה"
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
                        dataKey="moledetVisualTopics"
                        stroke={SUBJECT_CHART_COLORS.moledet}
                        strokeWidth={1.8}
                        name={VISUAL_STRAND_LABEL_HE.moledet}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="geographyVisualTopics"
                        stroke={SUBJECT_CHART_COLORS.geography}
                        strokeWidth={1.8}
                        name={VISUAL_STRAND_LABEL_HE.geography}
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
                const overviewRows = filterSubjectOverviewRowsWithEvidence(buildSubjectOverviewRows(displayReport));
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
                        זמן תרגול (דקות) - בפרטים מלאים יופיעו גם שאלות ודיוק
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
                                contentStyle={activeTooltipStyle}
                                labelFormatter={(_label, payload) =>
                                  payload?.[0]?.payload?.name ?? ""
                                }
                                formatter={(_value, _name, props) => {
                                  const p = props?.payload;
                                  if (!p) return ["", ""];
                                  const q = Number(p.questions) || 0;
                                  const minutes = Number(p.minutes) || 0;
                                  if (q <= 0) {
                                    if (minutes > 0) {
                                      return ["אין שאלות שנענו בתקופה זו", ""];
                                    }
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
                const rawMap = (reportWithVisualMg || displayReport)[cfg.mapKey];
                if (!rawMap || Object.keys(rawMap).length === 0) return null;
                const map = regularReportDisplay
                  ? regularReportDisplay.filterMap(rawMap)
                  : rawMap;
                if (!map || Object.keys(map).length === 0) return null;
                const rows = buildTopicRowsForChart(map, cfg.prefix, regularReportDisplay);
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
                              contentStyle={activeTooltipStyle}
                              labelFormatter={(_label, payload) =>
                                payload?.[0]?.payload?.label ?? ""
                              }
                              formatter={(_value, _name, props) => {
                                const p = props?.payload;
                                if (!p) return ["", ""];
                                const q = Number(p.questions) || 0;
                                if (q <= 0) {
                                  return ["לא תורגל באותו נושא בתקופה שנבחרה", ""];
                                }
                                const timeLabel = formatRegularReportTopicTimeCellHe({
                                  questions: q,
                                  timeMinutes: p.timeMinutes,
                                });
                                const timePart = timeLabel === "-" ? "" : ` · ${timeLabel}`;
                                return [`דיוק ${p.accuracy}% · ${q} שאלות${timePart}`, ""];
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
                    <ParentReportTopicExplainBlock
                      rows={rows}
                      compact
                      registeredGradeKey={regularReportDisplay?.registeredGradeKey}
                    />
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
      {reportImmersive ? (
        <StudentFixedBottomAdChrome theme={isBright ? "bright" : "classic"} />
      ) : null}
    </Layout>
  );
}





