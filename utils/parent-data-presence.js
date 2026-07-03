/**
 * Phase 1 (A+B+C): unified parent-facing data presence + raw-metric strength lines.
 * Does not change storage or scoring — classification and copy only.
 */

import { practicedSubjectCountFromReport } from "../lib/learning/normalized-subject-practice.js";
import {
  rawMetricStrengthMixedSubjectHe,
  rawMetricStrengthPositiveHe,
} from "./parent-report-language/parent-report-hebrew-copy-spec.js";

export const ParentDataPresence = Object.freeze({
  noData: "noData",
  hasVolumeNoPattern: "hasVolumeNoPattern",
  hasEvidenceLowConfidence: "hasEvidenceLowConfidence",
  hasEvidenceReady: "hasEvidenceReady",
});

const PATTERN_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "hebrew",
  "moledet-geography",
];

/** Minimum questions in window for a subject to qualify for a “strength” line from raw metrics. */
const RAW_STRENGTH_MIN_Q = 10;
/** High accuracy threshold (percent) for executive strength bullet (“מקצוע שהילד מצליח בו יותר”). */
const RAW_STRENGTH_HIGH_ACC = 82;
/** Mid band for consistency bullet (“תוצאות די עקביות בתקופה”). */
const RAW_STRENGTH_MID_LO = 72;

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
export function patternDiagnosticsHasGlobalSignal(report) {
  const subjects = report?.patternDiagnostics?.subjects;
  if (!subjects || typeof subjects !== "object" || Array.isArray(subjects)) return false;
  const pdVersion = Number(report?.patternDiagnostics?.version) || 0;
  for (const id of PATTERN_SUBJECT_ORDER) {
    const raw = subjects[id];
    if (!raw) continue;
    const sub =
      pdVersion >= 2 || Array.isArray(raw.weaknesses)
        ? raw
        : raw;
    if (sub?.hasAnySignal) return true;
  }
  return false;
}

/** Unified parent-facing copy when the window has practice but not enough for a clear picture. */
export const PARENT_THIN_DATA_EXPLAINER_HE =
  "יש תרגול בתקופה שנבחרה, אבל עדיין אין מספיק בסיס לתובנה ברורה. כדאי להמשיך עוד כמה ימים ולבדוק שוב.";

/**
 * @param {Record<string, unknown>} report
 * @returns {{ state: string, recommendationsExplainerHe: string|null, lowConfidenceExplainerHe: string|null }}
 */
export function deriveParentDataPresenceForDiagnosticsView(report, diagnosticsView) {
  const totalQ = Number(report?.summary?.totalQuestions) || 0;
  if (totalQ <= 0) {
    return {
      state: ParentDataPresence.noData,
      recommendationsExplainerHe: "אין עדיין תרגול בתקופה שנבחרה.",
      lowConfidenceExplainerHe: null,
    };
  }

  const mode = String(diagnosticsView?.mode || "");
  const rowCount = Array.isArray(diagnosticsView?.rows) ? diagnosticsView.rows.length : 0;
  const legacyCount = Array.isArray(diagnosticsView?.legacyRecommendations)
    ? diagnosticsView.legacyRecommendations.length
    : 0;

  if (mode === "new" && rowCount > 0) {
    return {
      state: ParentDataPresence.hasEvidenceReady,
      recommendationsExplainerHe: null,
      lowConfidenceExplainerHe: null,
    };
  }
  if (mode === "legacy" && legacyCount > 0) {
    return {
      state: ParentDataPresence.hasEvidenceReady,
      recommendationsExplainerHe: null,
      lowConfidenceExplainerHe: null,
    };
  }

  const units = Array.isArray(report?.diagnosticEngineV2?.units) ? report.diagnosticEngineV2.units : [];
  if (units.length >= 4) {
    const gated = units.filter((u) => u?.outputGating?.cannotConcludeYet === true).length;
    if (gated >= Math.ceil(units.length * 0.65)) {
      return {
        state: ParentDataPresence.hasEvidenceLowConfidence,
        recommendationsExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
        lowConfidenceExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
      };
    }
  }

  if (!patternDiagnosticsHasGlobalSignal(report)) {
    const practicedSubjects = practicedSubjectCountFromReport(report);
    if (practicedSubjects >= 2 && mode === "new" && rowCount === 0 && totalQ > 0) {
      return {
        state: ParentDataPresence.hasEvidenceLowConfidence,
        recommendationsExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
        lowConfidenceExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
      };
    }
    return {
      state: ParentDataPresence.hasVolumeNoPattern,
      recommendationsExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
      lowConfidenceExplainerHe: null,
    };
  }

  if (mode === "new" && rowCount === 0 && totalQ > 0) {
    return {
      state: ParentDataPresence.hasEvidenceLowConfidence,
      recommendationsExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
      lowConfidenceExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
    };
  }

  return {
    state: ParentDataPresence.hasVolumeNoPattern,
    recommendationsExplainerHe: PARENT_THIN_DATA_EXPLAINER_HE,
    lowConfidenceExplainerHe: null,
  };
}

/**
 * Hebrew strength lines from summary.* only (independent of patternDiagnostics).
 * @param {Record<string, unknown>|null|undefined} summary
 * @returns {string[]}
 */
/**
 * @param {Record<string, unknown>|null|undefined} summary
 * @param {Record<string, unknown>|null|undefined} [report]
 * @param {Set<string>|string[]|null} [weakSubjectIds]
 */
export function deriveRawMetricStrengthLinesHe(summary, report = null, weakSubjectIds = null) {
  if (!summary || typeof summary !== "object") return [];

  const weakSubjects = new Set(
    weakSubjectIds instanceof Set
      ? weakSubjectIds
      : Array.isArray(weakSubjectIds)
        ? weakSubjectIds
        : [],
  );
  void report;

  const rows = [
    { subjectId: "english", label: "אנגלית", q: summary.englishQuestions, acc: summary.englishAccuracy },
    { subjectId: "hebrew", label: "עברית", q: summary.hebrewQuestions, acc: summary.hebrewAccuracy },
    { subjectId: "science", label: "מדעים", q: summary.scienceQuestions, acc: summary.scienceAccuracy },
    { subjectId: "math", label: "מתמטיקה", q: summary.mathQuestions, acc: summary.mathAccuracy },
    { subjectId: "geometry", label: "גאומטריה", q: summary.geometryQuestions, acc: summary.geometryAccuracy },
    {
      subjectId: "moledet-geography",
      label: "מולדת וגאוגרפיה",
      q: summary.moledetGeographyQuestions,
      acc: summary.moledetGeographyAccuracy,
    },
  ];
  const out = [];
  for (const { subjectId, label, q, acc } of rows) {
    const nq = Math.max(0, Math.floor(Number(q) || 0));
    const ac = Math.round(Number(acc) || 0);
    if (nq < RAW_STRENGTH_MIN_Q) continue;
    if (ac >= RAW_STRENGTH_MID_LO) {
      if (weakSubjects.has(subjectId)) {
        out.push(rawMetricStrengthMixedSubjectHe(label));
      } else {
        out.push(rawMetricStrengthPositiveHe(label, nq, ac));
      }
    }
  }
  return out.slice(0, 4);
}

/**
 * @param {string[]} rawLines
 * @param {string[]} diagnosticLines
 * @param {number} [max]
 */
export function mergeExecutiveStrengthLinesHe(rawLines, diagnosticLines, max = 5) {
  const out = [];
  const seen = new Set();
  for (const line of [...(rawLines || []), ...(diagnosticLines || [])]) {
    const t = String(line || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) continue;
    const key = t.slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Blocked substrings that must never appear in parent-facing report text (whole-string / UI copy). */
export const PARENT_REPORT_FORBIDDEN_LEAKAGE_SUBSTRINGS = Object.freeze(["דוגמה לכל סוג"]);

/** Demo / placeholder five zeros — must not appear as an isolated token (avoid matching inside #000000 or 100000). */
export const PARENT_REPORT_STANDALONE_ZERO_LEAK_RE = /(?<![#0-9])00000(?![0-9])/g;

/**
 * When PR1 sanitization removed all bullet lines but the time window has practice volume —
 * do not tell parents “אין נתונים” (contradicts tables).
 */
export const PARENT_BULLETS_EMPTY_WITH_VOLUME_HE = PARENT_THIN_DATA_EXPLAINER_HE;

/**
 * Remove known internal/demo leakage from a string (defense in depth).
 * @param {string} text
 */
export function stripKnownParentReportLeakageHe(text) {
  let s = String(text || "");
  for (const bad of PARENT_REPORT_FORBIDDEN_LEAKAGE_SUBSTRINGS) {
    if (bad && s.includes(bad)) s = s.split(bad).join("").replace(/\s{2,}/g, " ").trim();
  }
  s = s.replace(PARENT_REPORT_STANDALONE_ZERO_LEAK_RE, "").replace(/\s{2,}/g, " ").trim();
  return s;
}

/**
 * Subject question count from V2 summary for a canonical subject id.
 * @param {Record<string, unknown>|null|undefined} report
 * @param {string} subjectId
 */
export function subjectQuestionCountFromReportSummary(report, subjectId) {
  const s = report?.summary;
  if (!s || typeof s !== "object") return 0;
  switch (subjectId) {
    case "math":
      return Math.max(0, Math.floor(Number(s.mathQuestions) || 0));
    case "geometry":
      return Math.max(0, Math.floor(Number(s.geometryQuestions) || 0));
    case "english":
      return Math.max(0, Math.floor(Number(s.englishQuestions) || 0));
    case "science":
      return Math.max(0, Math.floor(Number(s.scienceQuestions) || 0));
    case "hebrew":
      return Math.max(0, Math.floor(Number(s.hebrewQuestions) || 0));
    case "moledet-geography":
      return Math.max(0, Math.floor(Number(s.moledetGeographyQuestions) || 0));
    default:
      return 0;
  }
}

/**
 * Subject accuracy (0–100) from V2 summary for a canonical subject id.
 * @param {Record<string, unknown>|null|undefined} report
 * @param {string} subjectId
 */
export function subjectAccuracyFromReportSummary(report, subjectId) {
  const s = report?.summary;
  if (!s || typeof s !== "object") return null;
  let raw = null;
  switch (subjectId) {
    case "math":
      raw = s.mathAccuracy;
      break;
    case "geometry":
      raw = s.geometryAccuracy;
      break;
    case "english":
      raw = s.englishAccuracy;
      break;
    case "science":
      raw = s.scienceAccuracy;
      break;
    case "hebrew":
      raw = s.hebrewAccuracy;
      break;
    case "moledet-geography":
      raw = s.moledetGeographyAccuracy;
      break;
    default:
      return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
