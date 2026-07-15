/**
 * Parent Report — date-filtered sessions only (single pipeline).
 * One storage bucket (operations.* or topics.*) = one table row; no V1 fallback.
 */

import { STORAGE_KEY } from "./math-constants.js";
import {
  generateRecommendations,
  getMathReportBucketDisplayName,
  getTopicName,
  getEnglishTopicName,
  getScienceTopicName,
  getHistoryTopicName,
  getHebrewTopicName,
  getMoledetGeographyTopicName,
  mathReportBaseOperationKey,
  formatParentReportGradeLabel,
  canonicalParentReportGradeKey,
} from "./math-report-generator.js";
import { mistakeTimestampMs, normalizeMistakeEvent } from "./mistake-event.js";
import {
  formatParentReportActivityIsrael,
  parseActivityTimestampMs,
} from "../lib/learning-supabase/parent-report-activity-time.js";
import { sanitizeReportDurationSeconds } from "../lib/parent-server/report-duration-sanity.js";
import { analyzeLearningPatterns } from "./learning-patterns-analysis.js";
import {
  enrichTopicMapsWithRowDiagnostics,
  attachEvidenceContractsV1ToTopicMaps,
  splitBucketModeRowKey,
  splitTopicRowKey,
  TRACK_ROW_MODE_SEP,
  mathScopeGradeFromSession,
  mathScopeLevelFromSession,
  normalizeSessionModeForMath,
  buildMathScopedMistakeAggregationKey,
  MATH_MISTAKE_UNSCOPED_MARKER,
  MATH_SCOPE_UNKNOWN,
} from "./parent-report-row-diagnostics.js";
import {
  buildGradeEvidenceFields,
  practiceGradeRelation,
} from "../lib/learning-supabase/practice-grade-resolution.js";
import {
  filterCoreV2Units,
  isCoreParentReportRow,
  isCoreV2UnitForReport,
  registeredGradeKeyFromReportMaps,
} from "./parent-report-core-grade-filter.js";
import {
  mergeEvidenceSourceCounts,
  summarizeEvidenceSources,
} from "../lib/learning-supabase/evidence-source.js";
import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";
import {
  buildHistorySubtopicReportMap,
  historyMistakeSubtopicKey,
  enrichHistoryRecommendations,
} from "./history-subtopic-report.js";
import { enrichTopicMapsWithRowTrends, filterMistakesForRow } from "./parent-report-row-trend.js";
import {
  enrichTopicMapsWithTrendV1,
  loadTopicAnswerEventsFromReportStorage,
} from "./parent-report-topic-trend-v1.js";
import { buildWeaknessConfidencePatternsV1 } from "./intelligence-layer-v1/weakness-confidence-patterns.js";
import { enrichTopicMapsWithRowBehaviorProfiles } from "./parent-report-row-behavior.js";
import { validateParentReportDataIntegrity } from "./parent-report-data-integrity.js";
import { enrichReportMapsWithTopicStepHints } from "./topic-next-step-engine.js";
import { applyConsistencyGuards } from "./system-intelligence/consistency-engine.js";
import { applyDependencyGuards } from "./system-intelligence/dependency-engine.js";
import { attachFeedbackSignal } from "./system-intelligence/feedback-engine.js";
import { applyTimeDecisionGuards } from "./system-intelligence/time-decision-engine.js";
import { applyFeedbackDecisionGuards } from "./system-intelligence/feedback-decision-engine.js";
import { computeTopicPriority } from "./system-intelligence/priority-engine.js";
import { computeGlobalScore } from "./system-intelligence/global-score.js";
import { applyMathScopedParentDisplayNames } from "./math-topic-parent-display.js";
import { deriveRawMetricStrengthLinesHe } from "./parent-data-presence.js";
import { strengthOverviewLineHe } from "./parent-report-language/parent-report-hebrew-copy-spec.js";
import { collectTopicEngineRowsFromReport } from "./parent-report-engine-insights-he.js";
import { runDiagnosticEngineV2 } from "./diagnostic-engine-v2/index.js";
import { enrichDiagnosticEngineV2WithProfessionalFrameworkV1 } from "./learning-diagnostics/diagnostic-framework-v1.js";
import { enrichDiagnosticEngineV2WithProfessionalEngineV1 } from "./learning-diagnostics/professional-engine-output-v1.js";
import { attachFastDiagnosisToDiagnosticEngineV2 } from "./fast-diagnostic-engine/index.js";
import { runDiagnosticEngineV3 } from "./diagnostic-engine-v3/index.js";
import {
  applyLearningPatternDecisionToUnitsAndRows,
  buildSubjectEngineDecisionContractFromTopicMap,
  resolveSubjectSummaryTextFromEngineContract,
} from "./learning-pattern-decision/index.js";
import {
  SP_SUBJECT_ENGINE_CONTRACT,
  RENDER_SOURCE_SUBJECT_ENGINE,
} from "./learning-pattern-decision/engine-decision-codes.js";
import {
  buildTopicRollupsFromLearningPatternDecision,
  syncRowFlagsFromLearningPatternDecision,
} from "./learning-pattern-decision/parent-report-ui-helpers.js";
import { safeBuildHybridRuntimeForReport } from "./ai-hybrid-diagnostic/safe-build-hybrid-runtime.js";
import { getActiveDiagnosisSessionSummaryForReport } from "./active-diagnosis-session-summary.js";
import {
  evidenceExampleBodyFallbackHe,
  evidenceExampleTitleFallbackHe,
  buildSubjectEvidenceCoverageLines,
  practicedSubjectsSummaryLineHe,
  notPracticedSubjectsSummaryLineHe,
  filterInsightLinesForUnpracticedSubjects,
  normalizeParentFacingHe,
  tierStableStrengthHe,
  tierWeaknessRecurringHe,
  tierWeaknessSupportHe,
  v2SubjectDiagnosticRestraintHe,
  v2SubjectMemoryPartialEvidenceHe,
  v2ShortOverviewCannotConcludeHe,
  topicRecommendationV2CautionGatedHe,
  parentFacingPatternLabelHe,
  parentFacingDiagnosisSnippetHe,
  sanitizeDiagnosticEngineV2ForParentFacing,
  buildParentDiagnosticExplanationV1FromV2Unit,
} from "./parent-report-language/index.js";
import {
  formatParentReportModeHe,
  formatParentReportLevelHe,
  formatParentReportSubjectHe,
} from "./parent-report-language/parent-report-display-labels.he.js";
import { resolvePracticeDisplayLevelKey } from "../lib/learning/parent-report-display-level.js";
import { isScienceSubjectId } from "../lib/learning/display-level.js";
import { withholdSummaryCopyHe } from "./parent-report-language/subject-withhold-summary-he.js";
import { hardenBaseReportWithRowIdentity } from "./parent-report-output-integrity/harden-report-rows.js";
import {
  resolveUnitHomeMethodHe,
  resolveUnitNextGoalHe,
  resolveUnitParentActionHe,
} from "./parent-report-recommendation-consistency.js";
import { EVIDENCE_CONTRACT_VERSION } from "./contracts/parent-report-contracts-v1.js";
import { shortReportDiagnosticsParentVisibleHe } from "./parent-report-ui-explain-he.js";
import {
  safeGetItem,
  safeGetJsonArray,
  safeGetJsonObject,
} from "./safe-local-storage.js";

function modeLabel(m) {
  return formatParentReportModeHe(m);
}

function evidenceContractsV1Enabled() {
  const envFlag = String(process?.env?.NEXT_PUBLIC_PARENT_REPORT_CONTRACTS_V1 ?? "1").trim().toLowerCase();
  if (envFlag === "0" || envFlag === "false" || envFlag === "off") return false;
  try {
    const runtimeFlag = String(
      safeGetItem("mleo_parent_report_contracts_v1") || ""
    )
      .trim()
      .toLowerCase();
    if (runtimeFlag === "0" || runtimeFlag === "false" || runtimeFlag === "off") return false;
  } catch {
    // Ignore storage read errors - keep additive trace enabled by default.
  }
  return true;
}

/** @returns {number|null} */
function parseSessionTime(session) {
  if (!session || typeof session !== "object") return null;
  const t1 = Number(session.timestamp);
  if (Number.isFinite(t1)) return t1;
  if (session.date == null || session.date === "") return null;
  const t2 = new Date(session.date).getTime();
  if (Number.isFinite(t2)) return t2;
  return null;
}

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string|null|undefined} value */
export function normalizeCalendarDateString(value) {
  const s = String(value || "").trim().slice(0, 10);
  return CALENDAR_DATE_RE.test(s) ? s : null;
}

/**
 * UTC calendar boundaries for custom parent-report ranges (timezone-safe storage).
 * @param {string} customStartDate YYYY-MM-DD
 * @param {string} customEndDate YYYY-MM-DD
 * @param {Date} [now]
 */
export function resolveCustomReportCalendarRange(customStartDate, customEndDate, now = new Date()) {
  const startCalendar = normalizeCalendarDateString(customStartDate);
  const endCalendar = normalizeCalendarDateString(customEndDate);
  if (!startCalendar || !endCalendar) {
    throw new Error("invalid custom calendar date range");
  }
  const startMs = Date.parse(`${startCalendar}T00:00:00.000Z`);
  let endMs = Date.parse(`${endCalendar}T23:59:59.999Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error("invalid custom calendar date range");
  }
  const nowMs = now.getTime();
  if (endMs > nowMs) endMs = nowMs;
  return { startCalendar, endCalendar, startMs, endMs };
}

function sessionInRange(session, startMs, endMs) {
  const t = parseSessionTime(session);
  if (!Number.isFinite(t)) return false;
  return t >= startMs && t <= endMs;
}

/** Latest session timestamp in a row's sessions (for תאריך אחרון). */
function latestSessionMs(sessions) {
  let max = null;
  if (!Array.isArray(sessions)) return max;
  for (const s of sessions) {
    const t = parseSessionTime(s);
    if (!Number.isFinite(t) || t <= 0) continue;
    if (max === null || t > max) max = t;
  }
  return max;
}

/** DD/MM/YYYY HH:mm in Asia/Jerusalem (never raw UTC / browser local). */
function formatLastSessionAt(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return formatParentReportActivityIsrael(ms);
}

function validActivityMs(ms) {
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Ensure sessions is always an array (never drop keys due to wrong shape). */
function normalizeSessionsArray(sessions) {
  if (Array.isArray(sessions)) return sessions;
  if (sessions && typeof sessions === "object") return Object.values(sessions);
  return [];
}

/**
 * Duration in seconds for aggregation. Uses session.duration when present; if duration is
 * undefined/null, estimates (session.total || 0) * 30 seconds per question (geometry/math trackers store seconds).
 */
function sessionDurationSeconds(session) {
  if (!session || typeof session !== "object") return 0;
  let sec = 0;
  if (session.duration !== undefined && session.duration !== null) {
    const n = Number(session.duration);
    if (Number.isFinite(n) && n >= 0) sec = n;
  } else {
    const total = session.total !== undefined && session.total !== null ? Number(session.total) : 0;
    const t = Number.isFinite(total) ? total : 0;
    sec = t * 30;
  }
  const answerCount =
    session.total !== undefined && session.total !== null ? Number(session.total) : 0;
  return sanitizeReportDurationSeconds(sec, {
    answerCount: Number.isFinite(answerCount) ? answerCount : 0,
  }).seconds;
}

function mergeAggregateModeCountsFromSessions(sessions) {
  let merged = null;
  for (const s of sessions) {
    if (!s?.aggregateModeCounts || typeof s.aggregateModeCounts !== "object") continue;
    merged = merged || {};
    for (const [key, value] of Object.entries(s.aggregateModeCounts)) {
      const n = Math.max(0, Math.floor(Number(value) || 0));
      if (!key || n <= 0) continue;
      merged[key] = (merged[key] || 0) + n;
    }
  }
  return merged;
}

function mergeAggregateModeCountMaps(a, b) {
  if (!b || typeof b !== "object") return a;
  const out = a && typeof a === "object" ? { ...a } : {};
  for (const [key, value] of Object.entries(b)) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (!key || n <= 0) continue;
    out[key] = (out[key] || 0) + n;
  }
  return out;
}

/**
 * Build rows from a tracking bucket — same rule as geometry: row key = storage bucket id only.
 * Sessions are grouped under the bucket they were saved in; date is the only session filter.
 */
function buildMapFromBucket({
  bucket,
  progressData,
  startMs,
  endMs,
  subject,
  displayNameFn,
}) {
  const map = {};
  const raw = bucket && typeof bucket === "object" && !Array.isArray(bucket) ? bucket : {};

  for (const bucketKey of Object.keys(raw)) {
    const item = raw[bucketKey];
    if (!item || typeof item !== "object") continue;
    const list = normalizeSessionsArray(item.sessions);
    const storageKey = String(bucketKey);
    const rowBucketKey =
      subject === "math" ? mathReportBaseOperationKey(storageKey) : storageKey;

    const aggregateModeCountsByComposite = {};
    const aggregateModeCountsByGradeScope = {};
    for (const s of list) {
      const modeNorm = normalizeSessionModeForMath(s);
      const g = mathScopeGradeFromSession(s);
      const l = mathScopeLevelFromSession(s);
      const compositeKey = `${rowBucketKey}${TRACK_ROW_MODE_SEP}${modeNorm}${TRACK_ROW_MODE_SEP}${g}${TRACK_ROW_MODE_SEP}${l}`;
      aggregateModeCountsByComposite[compositeKey] = mergeAggregateModeCountMaps(
        aggregateModeCountsByComposite[compositeKey],
        s.aggregateModeCounts,
      );
      const gradeScopeKey = `${rowBucketKey}${TRACK_ROW_MODE_SEP}gradeScope${TRACK_ROW_MODE_SEP}${g}`;
      aggregateModeCountsByGradeScope[gradeScopeKey] = mergeAggregateModeCountMaps(
        aggregateModeCountsByGradeScope[gradeScopeKey],
        s.aggregateModeCounts,
      );
    }

    for (const s of list) {
      if (!sessionInRange(s, startMs, endMs)) continue;
      const modeNorm = normalizeSessionModeForMath(s);
      const g = mathScopeGradeFromSession(s);
      const l = mathScopeLevelFromSession(s);
      const compositeKey = `${rowBucketKey}${TRACK_ROW_MODE_SEP}${modeNorm}${TRACK_ROW_MODE_SEP}${g}${TRACK_ROW_MODE_SEP}${l}`;
      if (!map[compositeKey]) map[compositeKey] = [];
      map[compositeKey].push(s);
    }

    for (const itemKey of Object.keys(map)) {
      const sessions = map[itemKey];
      if (!sessions.length) continue;
      const { bucketKey: splitBucketKey } = splitBucketModeRowKey(itemKey);
      const progressLookupKey = splitBucketKey;
      const legacy = progressData[progressLookupKey] || { total: 0, correct: 0 };
      const gradeScopeKey = `${rowBucketKey}${TRACK_ROW_MODE_SEP}gradeScope${TRACK_ROW_MODE_SEP}${mathScopeGradeFromSession(sessions[0])}`;
      map[itemKey] = {
        sessions,
        aggregateModeCounts: mergeAggregateModeCountMaps(
          aggregateModeCountsByComposite[itemKey] || null,
          aggregateModeCountsByGradeScope[gradeScopeKey] || null,
        ),
        legacyProgress: legacy,
        displayNameFn,
        subject,
        itemKey,
      };
    }
  }

  const out = {};
  for (const itemKey of Object.keys(map)) {
    const pack = map[itemKey];
    if (!pack?.sessions?.length) continue;
    out[itemKey] = buildRowSummary({
      subject: pack.subject,
      itemKey: pack.itemKey,
      sessions: pack.sessions,
      legacyProgress: pack.legacyProgress,
      displayNameFn: pack.displayNameFn,
      aggregateModeCounts: pack.aggregateModeCounts,
    });
  }
  return out;
}

/** Convert legacy daily array (math/geometry/english) to YYYY-MM-DD map */
export function normalizeDailyToDateMap(daily) {
  const out = {};
  if (!daily) return out;
  if (Array.isArray(daily)) {
    daily.forEach((row) => {
      if (row && row.date) {
        out[row.date] = {
          timeMinutes: Math.round((row.total || 0) / 60),
          raw: row,
        };
      }
    });
    return out;
  }
  if (typeof daily === "object") {
    Object.entries(daily).forEach(([date, row]) => {
      out[date] = {
        timeMinutes: Math.round(((row && row.total) || 0) / 60),
        raw: row,
      };
    });
  }
  return out;
}

function dominantKey(counts) {
  const keys = Object.keys(counts);
  if (keys.length === 0) return null;
  return keys.sort((a, b) => counts[b] - counts[a])[0];
}

function countsToSortedList(counts) {
  return Object.entries(counts || {})
    .map(([key, count]) => ({ key, count: Number(count) || 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Collapse key: pedagogical topic + practiced content grade (never merge different grades). */
export function canonicalTopicGradeCollapseKey(subjectId, row, rowKey) {
  const split = splitTopicRowKey(String(rowKey || ""));
  const canonicalBucket =
    subjectId === "math"
      ? mathReportBaseOperationKey(String(row?.bucketKey || split.bucketKey || rowKey || ""))
      : String(row?.bucketKey || split.bucketKey || rowKey || "").trim();
  const gradePart =
    String(row?.gradeKey || "").trim() ||
    (split.gradeScope && split.gradeScope !== MATH_SCOPE_UNKNOWN ? String(split.gradeScope).trim() : "") ||
    MATH_SCOPE_UNKNOWN;
  return `${canonicalBucket}${TRACK_ROW_MODE_SEP}gradeScope${TRACK_ROW_MODE_SEP}${gradePart}`;
}

/**
 * Canonical parent-report entity: child + subject + pedagogical topic + content grade.
 * Mode/level variants within the same grade merge; different practice grades stay separate rows.
 * @param {string} subjectId
 * @param {Record<string, Record<string, unknown>>} rowsByKey
 */
export function collapseTopicRowsToCanonicalTopicEntity(subjectId, rowsByKey) {
  const input = rowsByKey && typeof rowsByKey === "object" ? rowsByKey : {};
  /** @type {Record<string, { rows: Array<Record<string, unknown>>, rowKeys: string[] }>} */
  const grouped = {};
  for (const [rowKey, row] of Object.entries(input)) {
    if (!row || typeof row !== "object") continue;
    const groupKey = canonicalTopicGradeCollapseKey(subjectId, row, rowKey);
    if (!groupKey) continue;
    if (!grouped[groupKey]) grouped[groupKey] = { rows: [], rowKeys: [] };
    grouped[groupKey].rows.push(row);
    grouped[groupKey].rowKeys.push(String(rowKey));
  }

  /** @type {Record<string, Record<string, unknown>>} */
  const collapsed = {};
  for (const [groupKey, pack] of Object.entries(grouped)) {
    const bucketKey = String(groupKey).split(TRACK_ROW_MODE_SEP)[0] || groupKey;
    const rows = Array.isArray(pack?.rows) ? pack.rows : [];
    if (!rows.length) continue;
    let questions = 0;
    let correct = 0;
    let wrong = 0;
    let timeMinutes = 0;
    let lastSessionMs = null;
    let lastSessionAt = null;
    let latestActivitySource = null;
    let lastAnswerAt = null;
    let lastAnswerMs = null;
    const modeCounts = {};
    const gradeCounts = {};
    const levelCounts = {};
    const displayLevelCounts = { regular: 0, advanced: 0 };
    /** @type {{ easy: number, medium: number, hard: number, unknown: number }} */
    const mergedSourceBreakdown = { easy: 0, medium: 0, hard: 0, unknown: 0 };
    let mergedEvidenceSourceCounts = {};
    let representative = rows[0];
    for (const r of rows) {
      const q = Number(r?.questions) || 0;
      const c = Number(r?.correct) || 0;
      const w = Number(r?.wrong) || Math.max(0, q - c);
      const tm = Number(r?.timeMinutes) || 0;
      questions += q;
      correct += c;
      wrong += w;
      timeMinutes += tm;
      const aggModeCounts =
        r?.aggregateModeCounts && typeof r.aggregateModeCounts === "object" ? r.aggregateModeCounts : null;
      if (aggModeCounts) {
        for (const [mk, cnt] of Object.entries(aggModeCounts)) {
          const n = Math.max(0, Math.floor(Number(cnt) || 0));
          if (!mk || n <= 0) continue;
          modeCounts[mk] = (modeCounts[mk] || 0) + n;
        }
      } else {
        const mKey = String(r?.modeKey || "").trim();
        if (mKey) modeCounts[mKey] = (modeCounts[mKey] || 0) + q;
      }
      const gKey = String(r?.gradeKey || "").trim();
      if (gKey) gradeCounts[gKey] = (gradeCounts[gKey] || 0) + q;
      const lKey = String(r?.levelKey || "").trim();
      if (lKey) levelCounts[lKey] = (levelCounts[lKey] || 0) + q;
      const dlKey = r?.displayLevelKey || resolvePracticeDisplayLevelKey(lKey, subjectId);
      if (dlKey) displayLevelCounts[dlKey] = (displayLevelCounts[dlKey] || 0) + q;
      if (r?._sourceDifficultyBreakdown && typeof r._sourceDifficultyBreakdown === "object") {
        for (const [sk, sv] of Object.entries(r._sourceDifficultyBreakdown)) {
          const n = Math.max(0, Math.floor(Number(sv) || 0));
          if (mergedSourceBreakdown[sk] != null) mergedSourceBreakdown[sk] += n;
        }
      }
      if (r?.evidenceSourceCounts) {
        mergedEvidenceSourceCounts = mergeEvidenceSourceCounts(
          mergedEvidenceSourceCounts,
          r.evidenceSourceCounts
        );
      }
      const lms = Number(r?.lastSessionMs);
      if (Number.isFinite(lms) && (lastSessionMs == null || lms > lastSessionMs)) {
        lastSessionMs = lms;
        lastSessionAt = r?.lastSessionAt || null;
        latestActivitySource = r?.latestActivitySource || latestActivitySource;
      }
      const lam = Number(r?.lastAnswerMs);
      if (Number.isFinite(lam) && (lastAnswerMs == null || lam > lastAnswerMs)) {
        lastAnswerMs = lam;
        lastAnswerAt = r?.lastAnswerAt || null;
      }
      const repQ = Number(representative?.questions) || 0;
      const repMs = Number(representative?.lastSessionMs);
      if (q > repQ || (q === repQ && Number.isFinite(lms) && (!Number.isFinite(repMs) || lms > repMs))) {
        representative = r;
      }
    }
    const modeKey = dominantKey(modeCounts) || String(representative?.modeKey || "").trim() || "learning";
    const gradeKey = dominantKey(gradeCounts) || String(representative?.gradeKey || "").trim() || null;
    const levelKey =
      displayLevelCounts.advanced > displayLevelCounts.regular
        ? "advanced"
        : dominantKey(displayLevelCounts) ||
          resolvePracticeDisplayLevelKey(dominantKey(levelCounts) || representative?.levelKey, subjectId) ||
          "regular";
    const displayLevelKey = isScienceSubjectId(subjectId) ? "regular" : levelKey;
    const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
    const registeredGradeKey =
      normalizeGradeLevelToKey(representative?.registeredGradeKey) ||
      normalizeGradeLevelToKey(representative?.registeredGrade) ||
      null;
    const contentGradeKey = gradeKey || null;
    const gradeEvidence = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);
    const mergedEvidenceSourceSummary = summarizeEvidenceSources(mergedEvidenceSourceCounts);
    const merged = {
      ...representative,
      bucketKey,
      topicRowKey: groupKey,
      registeredGradeKey: gradeEvidence.registeredGradeLevel,
      contentGradeKey: gradeEvidence.contentGradeLevel,
      actualGradeKey: gradeEvidence.contentGradeLevel,
      gradeRelation: gradeEvidence.gradeRelation,
      gradeDelta: gradeEvidence.gradeDelta,
      evidenceSourceCounts: mergedEvidenceSourceSummary.evidenceSourceCounts,
      evidenceSources: mergedEvidenceSourceSummary.evidenceSources,
      primaryEvidenceSource: mergedEvidenceSourceSummary.primaryEvidenceSource,
      questions,
      correct,
      wrong,
      accuracy,
      timeMinutes,
      timeHours: (timeMinutes / 60).toFixed(2),
      needsPractice: accuracy < 70,
      excellent: accuracy >= 90 && questions >= 10,
      modeKey,
      mode: modeLabel(modeKey),
      gradeKey: gradeKey || null,
      grade: formatParentReportGradeLabel(gradeKey),
      levelKey: displayLevelKey || null,
      displayLevelKey: displayLevelKey || null,
      level: displayLevelKey ? formatParentReportLevelHe(displayLevelKey, subjectId) : "לא זמין",
      _sourceDifficultyBreakdown:
        mergedSourceBreakdown.easy + mergedSourceBreakdown.medium + mergedSourceBreakdown.hard > 0
          ? { ...mergedSourceBreakdown }
          : representative?._sourceDifficultyBreakdown || null,
      displayName: String(representative?.displayName || "").trim() || String(representative?.bucketKey || bucketKey),
      lastSessionMs: validActivityMs(Number(lastSessionMs)),
      lastSessionAt: lastSessionAt || representative?.lastSessionAt || "לא זמין",
      latestActivityAt:
        validActivityMs(Number(lastSessionMs)) != null
          ? formatParentReportActivityIsrael(Number(lastSessionMs))
          : "לא זמין",
      latestActivityMs: validActivityMs(Number(lastSessionMs)),
      lastAnswerMs: validActivityMs(Number(lastAnswerMs)),
      lastAnswerAt: lastAnswerAt || representative?.lastAnswerAt || null,
      latestActivitySource:
        latestActivitySource || representative?.latestActivitySource || null,
      canonicalTopicEntity: true,
      rowCountMerged: rows.length,
      parentTopicSubSignals: {
        modeBreakdown: countsToSortedList(modeCounts),
        gradeBreakdown: countsToSortedList(gradeCounts),
        levelBreakdown: countsToSortedList(levelCounts),
        sourceRowKeys: Array.isArray(pack?.rowKeys) ? [...pack.rowKeys] : [],
      },
    };
    const outputKey =
      gradeKey && gradeKey !== MATH_SCOPE_UNKNOWN
        ? `${bucketKey}::grade:${gradeKey}`
        : bucketKey;
    collapsed[outputKey] = merged;
  }
  return collapsed;
}

/** Test hook. */
export function collapseTopicRowsToCanonicalTopicEntityForTests(subjectId, rowsByKey) {
  return collapseTopicRowsToCanonicalTopicEntity(subjectId, rowsByKey);
}

/** כיתה/רמה לתצוגה: הערך מהסשן העדכני ביותר בטווח (לא שכיחות היסטורית). */
function latestSessionFieldValue(sessions, field) {
  let bestT = -Infinity;
  let bestVal = null;
  if (!Array.isArray(sessions)) return null;
  for (const s of sessions) {
    const t = parseSessionTime(s);
    if (!Number.isFinite(t)) continue;
    const v = s[field];
    if (v == null || v === "") continue;
    if (t >= bestT) {
      bestT = t;
      bestVal = v;
    }
  }
  return bestVal;
}

function countDistribution(sessions, field) {
  const c = {};
  sessions.forEach((s) => {
    const v = s[field];
    if (v == null || v === "") return;
    c[v] = (c[v] || 0) + 1;
  });
  return c;
}

/**
 * Aggregate only valid session question/correct data.
 * - Sessions with missing/invalid/non-positive `total` are excluded.
 * - Sessions with missing/invalid `correct` are excluded (no implicit 0-correct).
 */
function sumQuestionsCorrect(sessions, legacyProgress) {
  let q = 0;
  let correctKnown = 0;
  sessions.forEach((s) => {
    const t =
      s && s.total !== undefined && s.total !== null ? Number(s.total) : NaN;
    if (!Number.isFinite(t) || t <= 0) return;
    const c =
      typeof s.correct === "number" &&
      Number.isFinite(s.correct) &&
      s.correct >= 0 &&
      s.correct <= t
        ? s.correct
        : NaN;
    if (!Number.isFinite(c)) return;
    q += t;
    correctKnown += c;
  });
  return { questions: q, correct: correctKnown };
}

function buildRowSummary({
  subject,
  itemKey,
  sessions,
  legacyProgress,
  displayNameFn,
  aggregateModeCounts: aggregateModeCountsInput = null,
}) {
  const tp = splitTopicRowKey(itemKey);
  const bucketKey = tp.bucketKey;
  const modeFromKey = tp.modeKey;
  const timeSeconds = sessions.reduce((s, x) => s + sessionDurationSeconds(x), 0);
  const timeMinutes = Math.round(timeSeconds / 60);
  const { questions, correct } = sumQuestionsCorrect(sessions, legacyProgress);
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  const gradeDist = countDistribution(sessions, "grade");
  const levelDist = countDistribution(sessions, "level");
  const modeDist = countDistribution(sessions, "mode");
  const aggregateModeCounts =
    aggregateModeCountsInput || mergeAggregateModeCountsFromSessions(sessions);
  const gradeKeyLatest = latestSessionFieldValue(sessions, "grade");
  const levelKeyLatest = latestSessionFieldValue(sessions, "level");

  let gradeKeyRaw;
  let gradeKey;
  let levelKey;
  let modeKey;

  if (String(itemKey).split(TRACK_ROW_MODE_SEP).length >= 4) {
    gradeKeyRaw =
      tp.gradeScope === MATH_SCOPE_UNKNOWN ? null : String(tp.gradeScope).trim() || null;
    gradeKey = gradeKeyRaw ? canonicalParentReportGradeKey(gradeKeyRaw) : null;
    levelKey =
      tp.levelScope === MATH_SCOPE_UNKNOWN ? null : String(tp.levelScope).trim().toLowerCase() || null;
    modeKey = modeFromKey && modeFromKey !== "" ? modeFromKey : dominantKey(modeDist) || "learning";
  } else {
    gradeKeyRaw =
      gradeKeyLatest != null && gradeKeyLatest !== ""
        ? gradeKeyLatest
        : dominantKey(gradeDist);
    gradeKey = canonicalParentReportGradeKey(gradeKeyRaw);
    levelKey =
      levelKeyLatest != null && levelKeyLatest !== ""
        ? levelKeyLatest
        : dominantKey(levelDist);
    modeKey =
      modeFromKey && modeFromKey !== ""
        ? modeFromKey
        : dominantKey(modeDist) || "learning";
  }
  const displayLevelKey = resolvePracticeDisplayLevelKey(levelKey, subject);
  levelKey = displayLevelKey;
  if (aggregateModeCounts && typeof aggregateModeCounts === "object") {
    const aggregateDominant = dominantKey(aggregateModeCounts);
    if (aggregateDominant) modeKey = aggregateDominant;
  }
  const registeredFromSession = latestSessionFieldValue(sessions, "registeredGrade");
  const registeredGradeKey = canonicalParentReportGradeKey(registeredFromSession);
  const gradeEvidence = buildGradeEvidenceFields(registeredGradeKey, gradeKey);
  const needsPractice = accuracy < 70;
  const excellent = accuracy >= 90 && questions >= 10;
  const topicOpLabel = displayNameFn(bucketKey);
  const modeStr = modeLabel(modeKey);
  const lastMs = latestSessionMs(sessions);
  const lastSessionAt = formatLastSessionAt(lastMs) || "לא זמין";
  const lastAnswerMsFromSessions = (() => {
    let max = null;
    for (const s of sessions) {
      const t = parseActivityTimestampMs(s?.lastAnswerAt);
      if (!Number.isFinite(t)) continue;
      if (max == null || t > max) max = t;
    }
    return max;
  })();
  const latestActivitySourceFromSessions = latestSessionFieldValue(sessions, "latestActivitySource");
  const parentActivityTitleFromSessions = latestSessionFieldValue(sessions, "parentActivityTitle");
  let evidenceSourceCountsAcc = {};
  for (const s of sessions) {
    if (s && s.evidenceSourceCounts) {
      evidenceSourceCountsAcc = mergeEvidenceSourceCounts(evidenceSourceCountsAcc, s.evidenceSourceCounts);
    }
  }
  const evidenceSourceSummary = summarizeEvidenceSources(evidenceSourceCountsAcc);
  const base = {
    subject,
    bucketKey,
    lastSessionAt,
    lastSessionMs: validActivityMs(lastMs),
    latestActivityAt: lastSessionAt,
    latestActivityMs: validActivityMs(lastMs),
    lastAnswerMs: Number.isFinite(lastAnswerMsFromSessions) ? lastAnswerMsFromSessions : null,
    lastAnswerAt: Number.isFinite(lastAnswerMsFromSessions)
      ? formatParentReportActivityIsrael(lastAnswerMsFromSessions)
      : null,
    latestActivitySource: latestActivitySourceFromSessions || null,
    evidenceSourceCounts: evidenceSourceSummary.evidenceSourceCounts,
    evidenceSources: evidenceSourceSummary.evidenceSources,
    primaryEvidenceSource: evidenceSourceSummary.primaryEvidenceSource,
    parentActivityTitle: parentActivityTitleFromSessions || null,
    questions,
    correct,
    wrong: questions - correct,
    accuracy,
    timeMinutes,
    timeHours: (timeMinutes / 60).toFixed(2),
    needsPractice,
    excellent,
    grade: formatParentReportGradeLabel(gradeKeyRaw),
    gradeKey,
    registeredGradeKey: gradeEvidence.registeredGradeLevel,
    contentGradeKey: gradeEvidence.contentGradeLevel,
    actualGradeKey: gradeEvidence.contentGradeLevel,
    gradeRelation: gradeEvidence.gradeRelation,
    gradeDelta: gradeEvidence.gradeDelta,
    level: levelKey ? formatParentReportLevelHe(levelKey, subject) : "לא זמין",
    levelKey,
    displayLevelKey,
    mode: modeStr,
    modeKey,
    ...(aggregateModeCounts ? { aggregateModeCounts } : {}),
    // Topic/op only — mode appears in the dedicated מצב column in parent-report UI.
    displayName: topicOpLabel,
  };
  if (subject === "math") base.improvement = null;
  return base;
}

const SUBJECTS = [
  {
    id: "math",
    trackingKey: "mleo_time_tracking",
    container: "operations",
    progressStorage: () => STORAGE_KEY + "_progress",
    mistakesKey: "mleo_mistakes",
    mistakeKeyField: "operation",
    topicKey: (m) => m.operation,
    displayName: getMathReportBucketDisplayName,
  },
  {
    id: "geometry",
    trackingKey: "mleo_geometry_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_geometry_master_progress",
    mistakesKey: "mleo_geometry_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getTopicName,
  },
  {
    id: "english",
    trackingKey: "mleo_english_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_english_master_progress",
    mistakesKey: "mleo_english_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getEnglishTopicName,
  },
  {
    id: "science",
    trackingKey: "mleo_science_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_science_master_progress",
    mistakesKey: "mleo_science_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getScienceTopicName,
  },
  {
    id: "history",
    trackingKey: "mleo_history_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_history_master_progress",
    mistakesKey: "mleo_history_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getHistoryTopicName,
  },
  {
    id: "hebrew",
    trackingKey: "mleo_hebrew_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_hebrew_master_progress",
    mistakesKey: "mleo_hebrew_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getHebrewTopicName,
  },
  {
    id: "moledet-geography",
    trackingKey: "mleo_moledet_geography_time_tracking",
    container: "topics",
    progressStorage: () => "mleo_moledet_geography_master_progress",
    mistakesKey: "mleo_moledet_geography_mistakes",
    mistakeKeyField: "topic",
    topicKey: (m) => m.topic,
    displayName: getMoledetGeographyTopicName,
  },
];

function loadTracking(rawKey) {
  try {
    return JSON.parse(safeGetItem(rawKey) || "{}");
  } catch {
    return {};
  }
}

function loadProgress(path) {
  try {
    return JSON.parse(safeGetItem(path) || "{}");
  } catch {
    return {};
  }
}

function resolveRegisteredGradeKeyFromTrackingBuckets() {
  for (const def of SUBJECTS) {
    const saved = loadTracking(def.trackingKey);
    const bucket = saved[def.container] || {};
    for (const topicVal of Object.values(bucket)) {
      const sessions = topicVal?.sessions;
      if (!Array.isArray(sessions)) continue;
      for (const s of sessions) {
        const g = normalizeGradeLevelToKey(
          s?.registeredGradeKey || s?.registeredGrade || s?.grade
        );
        if (g) return g;
      }
    }
  }
  return null;
}

/**
 * מתמטיקה: ספירת טעויות לפי מפתח שורה scoped (פעולה+מצב+כיתה+רמה); טעויות בלי scope מלא → מפתח `op__UNSCOPED__`.
 * @param {unknown[]} mistakes
 * @param {number} startMs
 * @param {number} endMs
 */
function buildMathMistakesScopedCounts(mistakes, startMs, endMs) {
  const byKey = {};
  const arr = Array.isArray(mistakes) ? mistakes : [];
  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const t = mistakeTimestampMs(m);
    if (t === null || t < startMs || t > endMs) continue;
    const ev = normalizeMistakeEvent(m, "math");
    const scoped = buildMathScopedMistakeAggregationKey(ev);
    const op = mathReportBaseOperationKey(String(ev.topicOrOperation || m.operation || ""));
    const k = scoped || (op ? `${op}${MATH_MISTAKE_UNSCOPED_MARKER}` : null);
    if (!k) continue;
    if (!byKey[k]) byKey[k] = { count: 0, lastSeen: null };
    byKey[k].count += 1;
    if (!byKey[k].lastSeen || t > new Date(byKey[k].lastSeen).getTime()) {
      byKey[k].lastSeen = m.timestamp ?? m.storedAt;
    }
  }
  return byKey;
}

/**
 * Aggregate mistake counts by topic/op key. Supports legacy rows (storedAt, topic in snapshot, operation-only Hebrew/Moledet).
 * @param {unknown[]} mistakes
 * @param {number} startMs
 * @param {number} endMs
 * @param {(m: Record<string, unknown>) => string|undefined|null} getKey
 */
function filterMistakes(mistakes, startMs, endMs, getKey) {
  const arr = Array.isArray(mistakes) ? mistakes : [];
  const byKey = {};
  arr.forEach((m) => {
    if (!m || typeof m !== "object") return;
    const t = mistakeTimestampMs(m);
    if (t === null || t < startMs || t > endMs) return;
    const k = getKey(m);
    if (!k) return;
    if (!byKey[k]) byKey[k] = { count: 0, lastSeen: null };
    byKey[k].count += 1;
    if (!byKey[k].lastSeen || t > new Date(byKey[k].lastSeen).getTime()) {
      byKey[k].lastSeen = m.timestamp ?? m.storedAt;
    }
  });
  return byKey;
}

function mistakesInDateRange(mistakes, startMs, endMs) {
  const arr = Array.isArray(mistakes) ? mistakes : [];
  return arr.filter((m) => {
    if (!m || typeof m !== "object") return false;
    const t = mistakeTimestampMs(m);
    return t !== null && t >= startMs && t <= endMs;
  });
}

function buildDailyActivityFromSessions(startMs, endMs) {
  const byDate = {};
  const ensure = (dateStr) => {
    if (!byDate[dateStr]) {
      byDate[dateStr] = {
        date: dateStr,
        timeMinutes: 0,
        questions: 0,
        mathKeys: new Set(),
        geometryKeys: new Set(),
        englishKeys: new Set(),
        scienceKeys: new Set(),
        historyKeys: new Set(),
        hebrewKeys: new Set(),
        moledetKeys: new Set(),
      };
    }
    return byDate[dateStr];
  };
  SUBJECTS.forEach((def) => {
    const saved = loadTracking(def.trackingKey);
    const bucket = saved[def.container] || {};
    Object.keys(bucket).forEach((itemKey) => {
      const item = bucket[itemKey];
      normalizeSessionsArray(item.sessions).forEach((s) => {
        if (!sessionInRange(s, startMs, endMs)) return;
        const tMs = parseSessionTime(s);
        if (!Number.isFinite(tMs)) return;
        const d = new Date(tMs);
        const dateStr = d.toISOString().split("T")[0];
        const row = ensure(dateStr);
        const durMin = Math.round(sessionDurationSeconds(s) / 60);
        row.timeMinutes += durMin;
        const tq =
          s && s.total !== undefined && s.total !== null ? Number(s.total) : NaN;
        if (Number.isFinite(tq) && tq > 0) {
          row.questions += tq;
        }
        if (def.id === "math")
          row.mathKeys.add(mathReportBaseOperationKey(String(itemKey)));
        if (def.id === "geometry") row.geometryKeys.add(itemKey);
        if (def.id === "english") row.englishKeys.add(itemKey);
        if (def.id === "science") row.scienceKeys.add(itemKey);
        if (def.id === "history") row.historyKeys.add(itemKey);
        if (def.id === "hebrew") row.hebrewKeys.add(itemKey);
        if (def.id === "moledet-geography") row.moledetKeys.add(itemKey);
      });
    });
  });
  return Object.values(byDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => ({
      date: r.date,
      timeMinutes: r.timeMinutes,
      questions: r.questions,
      mathTopics: r.mathKeys.size,
      geometryTopics: r.geometryKeys.size,
      englishTopics: r.englishKeys.size,
      scienceTopics: r.scienceKeys.size,
      historyTopics: r.historyKeys.size,
      hebrewTopics: r.hebrewKeys.size,
      moledetGeographyTopics: r.moledetKeys.size,
    }));
}

const V2_SUBJECT_ORDER = [
  "math",
  "geometry",
  "english",
  "science",
  "history",
  "hebrew",
  "moledet-geography",
];

const V2_SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};

function safeNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

const EVIDENCE_STRENGTH_HE = { low: "מוגבלת", medium: "בינונית", strong: "טובה" };

const INSUFFICIENT_EVIDENCE_LINE_HE =
  "מידע מועט בנושא - כדאי להמשיך בתרגול לפני שקובעים כיוון חד משמעי.";

/** Strip internal engine identifiers from diagnostic trace lines shown to parents. */
function sanitizeDecisionTraceDetailHeForParents(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/suppressAggressiveStep/i.test(s)) {
    return "כמות המידע עוזרת להחליט כמה בזהירות להתקדם בצעד הבא.";
  }
  return s;
}

const MAX_DIAGNOSTIC_CARDS_PER_SUBJECT = 5;

const POSITIVE_LEVEL_RANK = { excellent: 3, very_good: 2, good: 1, none: 0 };

/** Positive-first evidence line: approved tier text (no diagnosis/taxonomy dependency). */
function v2PositiveStrengthBodyHe() {
  return "תרגול טוב ועקבי - נראית שליטה טובה בחומר.";
}

/**
 * Deterministic strength line from row volume in evidenceTrace; falls back to generic tier text.
 * @param {Record<string, unknown>|null|undefined} u
 */
function v2PositiveStrengthBodyFromUnitHe(u) {
  const ev = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
  const v0 = ev.find((e) => e?.type === "volume")?.value ?? ev[0]?.value;
  const q = safeNumber(v0?.questions);
  const acc = safeNumber(v0?.accuracy);
  if (q > 0) {
    return normalizeParentFacingHe(
      `על סמך ${Math.round(q)} שאלות בנושא, נראית שליטה יציבה עם דיוק של ${Math.round(acc)}%.`
    );
  }
  return normalizeParentFacingHe(v2PositiveStrengthBodyHe());
}

/**
 * @param {Record<string, unknown>|null|undefined} unit
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string[]}
 */
function collectDiagnosticEvidenceLinesHe(unit, row) {
  const r = row && typeof row === "object" ? row : {};
  const lines = [];
  const seen = new Set();
  const push = (s) => {
    const t = shortReportDiagnosticsParentVisibleHe(String(s || "").trim());
    if (!t) return;
    const k = t.replace(/\s+/g, " ");
    if (seen.has(k)) return;
    seen.add(k);
    lines.push(normalizeParentFacingHe(t));
  };

  const ev = Array.isArray(unit?.evidenceTrace) ? unit.evidenceTrace : [];
  const vol = ev.find((e) => e?.type === "volume")?.value;
  if (vol && safeNumber(vol.questions) > 0) {
    push(
      `בתקופה שנבחרה: ${Math.round(safeNumber(vol.questions))} שאלות, דיוק כ-${Math.round(safeNumber(vol.accuracy))}%.`
    );
  }

  const mist = ev.find((e) => e?.type === "mistake_events")?.value;
  if (mist && safeNumber(mist.wrong) > 0) {
    push(
      `נרשמו ${Math.round(safeNumber(mist.wrong))} טעויות רלוונטיות (מתוך ${Math.round(safeNumber(mist.total))} ניסיונות).`
    );
  }

  if (r.trend && typeof r.trend === "object" && String(r.trend.summaryHe || "").trim()) {
    push(String(r.trend.summaryHe));
  }

  if (Array.isArray(r.decisionTrace)) {
    for (const e of r.decisionTrace.slice(-3)) {
      const d = sanitizeDecisionTraceDetailHeForParents(String(e?.detailHe || "").trim());
      if (d) push(d);
    }
  }

  const ec = r.contractsV1?.evidence;
  if (ec && typeof ec === "object" && EVIDENCE_STRENGTH_HE[ec.evidenceStrength]) {
    push(`עד כמה הנתונים מבוססים כרגע: ${EVIDENCE_STRENGTH_HE[ec.evidenceStrength]}.`);
  }

  if (r._feedback === "improved") push("הדיוק השתפר לעומת התקופה הקודמת.");
  else if (r._feedback === "worsened") push("הדיוק ירד לעומת התקופה הקודמת.");
  else if (r._feedback === "no_change") push("הדיוק דומה לתקופה הקודמת.");

  if (r._timeAdjusted === "declining_block") {
    push("בגלל מגמת ירידה בדיוק, ההמלצה כרגע זהירה יותר.");
  } else if (r._timeAdjusted === "improving_soften") {
    push("בגלל שיפור במגמה, ההמלצה רוככה לתרגול מתאים יותר.");
  }

  if (Number.isFinite(Number(r._priorityScore)) && Number(r._priorityScore) >= 3) {
    push("הנושא קיבל עדיפות גבוהה יחסית ברשימת הפעולות.");
  }

  if (lines.length === 0) {
    push(INSUFFICIENT_EVIDENCE_LINE_HE);
  }

  return lines.slice(0, 8);
}

function diagnosticCardRankScore(unit) {
  const pl = String(unit?.priority?.level || "");
  const pr = { P4: 5, P3: 4, P2: 3, P1: 2 };
  const base = pr[pl] || 0;
  const diag = unit?.diagnosis?.allowed ? 1 : 0;
  const vol = safeNumber(
    unit?.evidenceTrace?.find((e) => e?.type === "volume")?.value?.questions ??
      unit?.evidenceTrace?.[0]?.value?.questions
  );
  return base * 100000 + diag * 10000 + Math.min(vol, 9999);
}

function diagnosticCardLabel(unit) {
  const tid = String(unit?.taxonomy?.id || "").trim();
  if (tid) return tid;
  const bk = String(unit?.bucketKey || "").trim();
  return bk ? `topic:${bk}` : "topic";
}

function diagnosticCardLabelHe(unit) {
  const mapped = parentFacingPatternLabelHe(unit);
  if (mapped) return mapped;
  const line = String(unit?.diagnosis?.lineHe || "").trim();
  if (line) {
    return normalizeParentFacingHe(shortReportDiagnosticsParentVisibleHe(parentFacingDiagnosisSnippetHe(unit, line)));
  }
  const name = String(unit?.displayName || unit?.bucketKey || "הנושא").trim();
  return normalizeParentFacingHe(`נושא: ${name}`);
}

function diagnosticCardConfidence(unit) {
  const cs = unit?.canonicalState;
  const fromCs = cs?.assessment?.confidenceLevel;
  const fromU = unit?.confidence?.level;
  return String(fromCs || fromU || "low").trim().toLowerCase();
}

/**
 * @param {string} subjectId
 * @param {unknown[]} subjectUnits
 * @param {Record<string, unknown>|null|undefined} topicMap
 */
function buildDiagnosticCardsForSubject(subjectId, subjectUnits, topicMap, registeredGradeKey = null) {
  const map = topicMap && typeof topicMap === "object" ? topicMap : {};
  const coreUnits = filterCoreV2Units(subjectUnits, map, registeredGradeKey);
  const list = Array.isArray(coreUnits) ? [...coreUnits] : [];
  if (list.length === 0) return [];
  list.sort((a, b) => diagnosticCardRankScore(b) - diagnosticCardRankScore(a));
  const out = [];
  for (const u of list) {
    if (out.length >= MAX_DIAGNOSTIC_CARDS_PER_SUBJECT) break;
    if (!u || typeof u !== "object") continue;
    const trk = String(u.topicRowKey || "");
    const row = trk ? map[trk] : null;
    const rowSafe = row && typeof row === "object" ? row : {};
    const evidence = collectDiagnosticEvidenceLinesHe(u, rowSafe);
    const rowGk =
      rowSafe && typeof rowSafe === "object" && rowSafe.gradeKey != null && String(rowSafe.gradeKey).trim()
        ? String(rowSafe.gradeKey).trim()
        : (() => {
            if (!trk) return null;
            const p = splitTopicRowKey(trk);
            const g = p?.gradeKey;
            return g != null && String(g).trim() !== "" ? String(g).trim() : null;
          })();
    const recommendationHe =
      resolveUnitParentActionHe(u, rowGk) ||
      resolveUnitNextGoalHe(u, rowGk) ||
      resolveUnitHomeMethodHe(u, rowGk) ||
      null;
    const id = `dc:${subjectId}:${trk.replace(/\u0001/g, "|")}`;
    out.push({
      id,
      subjectId,
      topicId: String(u.bucketKey || ""),
      topicName: normalizeParentFacingHe(String(u.displayName || u.bucketKey || "").trim() || "הנושא"),
      label: diagnosticCardLabel(u),
      labelHe: diagnosticCardLabelHe(u),
      confidence: diagnosticCardConfidence(u),
      evidence,
      recommendationHe,
      fastDiagnosis: u.fastDiagnosis && typeof u.fastDiagnosis === "object" ? u.fastDiagnosis : null,
      source: {
        unitId: String(u.unitKey || ""),
        rowKey: trk,
      },
    });
  }
  return out;
}

/** Strip tokens that must not appear in parent overview (priority codes, ids). */
function stripParentOverviewLeakageHe(text) {
  let s = String(text || "");
  s = s.replace(/\bP[1-4]\b/g, "");
  s = s.replace(/::+/g, " ");
  s = s.replace(/\bdc:/gi, "");
  s = s.replace(/\u0001/g, " ");
  s = shortReportDiagnosticsParentVisibleHe(s);
  s = normalizeParentFacingHe(s.replace(/\s{2,}/g, " ").trim());
  return s;
}

function unitAttentionOverviewSortKey(u) {
  const pl = String(u?.priority?.level || "");
  const pr = { P4: 5, P3: 4, P2: 3, P1: 2 };
  const base = pr[pl] || 0;
  const diag = u?.diagnosis?.allowed ? 1 : 0;
  const wrongs = safeNumber(u?.recurrence?.wrongCountForRules);
  return base * 10000 + diag * 1000 + Math.min(wrongs, 999);
}

function unitStrengthOverviewSortKey(u) {
  const cs = u?.canonicalState;
  const pal = String(cs?.evidence?.positiveAuthorityLevel || "none");
  const R = { excellent: 4, very_good: 3, good: 2, none: 0 };
  const action = String(cs?.actionState || "");
  let s = (R[pal] ?? 0) * 100;
  if (action === "maintain" || action === "expand_cautiously") s += 50;
  if (action === "expand_cautiously") s += 10;
  const vol = safeNumber(
    u?.evidenceTrace?.find((e) => e?.type === "volume")?.value?.questions ?? u?.evidenceTrace?.[0]?.value?.questions
  );
  return s * 1000 + Math.min(vol, 999);
}

/**
 * @param {Record<string, unknown>} unit
 */
function unitTopicQuestionCount(unit) {
  const vol = unit?.evidenceTrace?.find((e) => e?.type === "volume")?.value;
  return Math.max(0, Math.round(safeNumber(vol?.questions)));
}

/**
 * Thin topic row: 1–3 questions, engine cannot conclude, recommendation withheld.
 * @param {Record<string, unknown>} unit
 */
function unitRequiresShortThinOverviewHedge(unit) {
  if (!unit || typeof unit !== "object") return false;
  const q = unitTopicQuestionCount(unit);
  if (q < 1 || q > 3) return false;
  const cs = unit.canonicalState;
  const cannot =
    unit.outputGating?.cannotConcludeYet === true || cs?.assessment?.cannotConcludeYet === true;
  if (!cannot) return false;
  const action = String(cs?.actionState || "").trim();
  if (action !== "withhold" && action !== "probe_only") return false;
  const suff = String(unit?.confidence?.rowSignals?.dataSufficiencyLevel || "").toLowerCase();
  if (suff && suff !== "low" && q <= 3) return false;
  return true;
}

/**
 * @param {string} line
 * @param {Record<string, unknown>} unit
 */
function appendThinOverviewHedgeToLine(line, unit) {
  const base = String(line || "").trim();
  if (!base || !unitRequiresShortThinOverviewHedge(unit)) return base;
  const hedge = v2ShortOverviewCannotConcludeHe();
  if (base.includes(hedge)) return base;
  return `${base} - ${hedge}`;
}

/**
 * @param {string} subjectId
 * @param {Record<string, unknown>} unit
 * @param {"attention"|"strength"} kind
 */
function overviewShortLineWithSubject(subjectId, unit, kind) {
  const subj = V2_SUBJECT_LABEL_HE[subjectId] || "";
  const name = String(unit?.displayName || "").trim() || "נושא";
  const vol = unit?.evidenceTrace?.find((e) => e?.type === "volume")?.value;
  const pat = parentFacingPatternLabelHe(unit);
  let core = "";
  if (kind === "attention") {
    if (pat) {
      core = `${name}: ${pat}`;
    } else if (unit?.diagnosis?.allowed && String(unit?.diagnosis?.lineHe || "").trim()) {
      core = `${name}: ${shortReportDiagnosticsParentVisibleHe(parentFacingDiagnosisSnippetHe(unit, unit.diagnosis.lineHe))}`;
    } else if (vol && safeNumber(vol.questions) > 0) {
      core = `${name}: כ-${Math.round(safeNumber(vol.questions))} שאלות, דיוק ${Math.round(safeNumber(vol.accuracy))}%`;
    } else {
      core = name;
    }
  } else {
    if (vol && safeNumber(vol.questions) > 0) {
      return stripParentOverviewLeakageHe(
        strengthOverviewLineHe({
          subject: subj,
          subjectId,
          topic: name,
          q: Math.round(safeNumber(vol.questions)),
          acc: Math.round(safeNumber(vol.accuracy)),
        }),
      );
    }
    core = name;
  }
  const line = `${subj}: ${core}`.replace(/\s+/g, " ").trim();
  const out = stripParentOverviewLeakageHe(line);
  return kind === "attention" ? appendThinOverviewHedgeToLine(out, unit) : out;
}

/**
 * Phase 2: align top amber overview with V2 priority (post-engine). Does not mutate diagnosticCards.
 * @param {{
 *   diagnosticEngineV2: { units?: unknown[] } | null,
 *   patternDiagnostics: unknown,
 *   maps: Record<string, Record<string, unknown>>,
 *   fallbackOverview: Record<string, unknown>,
 *   insufficientDataSubjectsHe: string[],
 * }} p
 */
function buildDiagnosticOverviewHeV2(p) {
  void p?.patternDiagnostics;
  const maps = p?.maps && typeof p.maps === "object" ? p.maps : {};
  const registeredGradeKey =
    p?.registeredGradeKey != null && String(p.registeredGradeKey).trim()
      ? String(p.registeredGradeKey).trim()
      : registeredGradeKeyFromReportMaps(maps);
  const allUnits = Array.isArray(p?.diagnosticEngineV2?.units) ? p.diagnosticEngineV2.units : [];
  const subjectQuestionCounts =
    p?.subjectQuestionCounts && typeof p.subjectQuestionCounts === "object" ? p.subjectQuestionCounts : {};
  const units = allUnits.filter((u) => {
    const sid = String(u?.subjectId || "");
    if ((Number(subjectQuestionCounts[sid]) || 0) <= 0) return false;
    const topicMap = maps[sid] && typeof maps[sid] === "object" ? maps[sid] : {};
    const trk = String(u?.topicRowKey || "");
    const mapR = trk && topicMap[trk] ? topicMap[trk] : null;
    return isCoreV2UnitForReport(u, mapR, registeredGradeKey);
  });
  const fallback = p?.fallbackOverview && typeof p.fallbackOverview === "object" ? p.fallbackOverview : {};
  const insufficientDataSubjectsHe = Array.isArray(p?.insufficientDataSubjectsHe)
    ? p.insufficientDataSubjectsHe
    : [];
  const thinEvidenceSubjectsHe = Array.isArray(p?.thinEvidenceSubjectsHe) ? p.thinEvidenceSubjectsHe : [];

  if (units.length === 0) {
    return {
      strongestAreaLineHe: fallback.strongestAreaLineHe ?? null,
      mainFocusAreaLineHe: fallback.mainFocusAreaLineHe ?? null,
      readyForProgressPreviewHe: Array.isArray(fallback.readyForProgressPreviewHe)
        ? fallback.readyForProgressPreviewHe
        : [],
      requiresAttentionPreviewHe: Array.isArray(fallback.requiresAttentionPreviewHe)
        ? fallback.requiresAttentionPreviewHe
        : [],
      insufficientDataSubjectsHe,
      notPracticedSubjectsHe: [],
      thinEvidenceSubjectsHe,
      practicedSubjectsSummaryHe: p?.practicedSubjectsSummaryHe ?? null,
    };
  }

  const uList = units.filter((u) => u && typeof u === "object");

  const attentionCandidates = uList.filter((u) => {
    const pl = String(u?.priority?.level || "").trim();
    if (pl === "P1" || pl === "P2" || pl === "P3" || pl === "P4") return true;
    if (u?.diagnosis?.allowed === true) return true;
    if (safeNumber(u?.recurrence?.wrongCountForRules) > 0) return true;
    return false;
  });

  const attentionSorted = [...attentionCandidates].sort(
    (a, b) => unitAttentionOverviewSortKey(b) - unitAttentionOverviewSortKey(a)
  );
  const strengthSorted = [...uList].sort(
    (a, b) => unitStrengthOverviewSortKey(b) - unitStrengthOverviewSortKey(a)
  );

  let mainFocusAreaLineHe = null;
  let mainFocusAreaIsHighAccuracy = false;
  if (attentionCandidates.length === 0) {
    mainFocusAreaLineHe = fallback.mainFocusAreaLineHe ?? null;
  } else if (attentionSorted[0]) {
    const u = attentionSorted[0];
    const sid = String(u.subjectId || "");
    const uTraces = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
    const uVolume = uTraces.find((tr) => String(tr?.type || "") === "volume")?.value || {};
    const uAcc = Number(uVolume?.accuracy) || 0;
    mainFocusAreaIsHighAccuracy = uAcc >= 78;
    mainFocusAreaLineHe = overviewShortLineWithSubject(sid, u, "attention");
  }
  if (!String(mainFocusAreaLineHe || "").trim()) {
    mainFocusAreaLineHe = fallback.mainFocusAreaLineHe ?? null;
  }

  const strengthCandidates = strengthSorted.filter((u) => {
    const cs = u?.canonicalState;
    if (!cs || typeof cs !== "object") return false;
    const pal = String(cs?.evidence?.positiveAuthorityLevel || "");
    const a = String(cs?.actionState || "");
    return (
      pal === "excellent" ||
      pal === "very_good" ||
      pal === "good" ||
      a === "maintain" ||
      a === "expand_cautiously"
    );
  });

  let strongestAreaLineHe = null;
  if (strengthCandidates[0]) {
    const u = strengthCandidates[0];
    strongestAreaLineHe = overviewShortLineWithSubject(String(u.subjectId || ""), u, "strength");
  }
  if (!String(strongestAreaLineHe || "").trim()) {
    strongestAreaLineHe = fallback.strongestAreaLineHe ?? null;
  }

  const readyForProgressPreviewHe = [];
  const seenProg = new Set();
  for (let i = 1; i < strengthCandidates.length && readyForProgressPreviewHe.length < 3; i++) {
    const u = strengthCandidates[i];
    const sid = String(u.subjectId || "");
    const line = overviewShortLineWithSubject(sid, u, "strength");
    const k = line.replace(/\s+/g, " ");
    if (!k || seenProg.has(k)) continue;
    if (strongestAreaLineHe && k === String(strongestAreaLineHe).replace(/\s+/g, " ")) continue;
    seenProg.add(k);
    readyForProgressPreviewHe.push(line);
  }
  if (readyForProgressPreviewHe.length === 0 && Array.isArray(fallback.readyForProgressPreviewHe)) {
    for (const x of fallback.readyForProgressPreviewHe) {
      if (readyForProgressPreviewHe.length >= 3) break;
      const t = stripParentOverviewLeakageHe(String(x || ""));
      if (t) readyForProgressPreviewHe.push(t);
    }
  }

  const requiresAttentionPreviewHe = [];
  if (attentionCandidates.length === 0) {
    if (Array.isArray(fallback.requiresAttentionPreviewHe)) {
      for (const x of fallback.requiresAttentionPreviewHe) {
        if (requiresAttentionPreviewHe.length >= 5) break;
        const t = stripParentOverviewLeakageHe(String(x || ""));
        if (t) requiresAttentionPreviewHe.push(t);
      }
    }
  } else {
    const seenAtt = new Set();
    for (let i = 1; i < attentionSorted.length && requiresAttentionPreviewHe.length < 5; i++) {
      const u = attentionSorted[i];
      const sid = String(u.subjectId || "");
      const line = overviewShortLineWithSubject(sid, u, "attention");
      const k = line.replace(/\s+/g, " ");
      if (!k || seenAtt.has(k)) continue;
      if (mainFocusAreaLineHe && k === String(mainFocusAreaLineHe).replace(/\s+/g, " ")) continue;
      seenAtt.add(k);
      requiresAttentionPreviewHe.push(line);
    }
    if (requiresAttentionPreviewHe.length === 0 && Array.isArray(fallback.requiresAttentionPreviewHe)) {
      for (const x of fallback.requiresAttentionPreviewHe) {
        if (requiresAttentionPreviewHe.length >= 5) break;
        const t = stripParentOverviewLeakageHe(String(x || ""));
        if (t) requiresAttentionPreviewHe.push(t);
      }
    }
  }

  return {
    strongestAreaLineHe,
    mainFocusAreaLineHe,
    mainFocusAreaIsHighAccuracy,
    readyForProgressPreviewHe,
    requiresAttentionPreviewHe,
    insufficientDataSubjectsHe,
    notPracticedSubjectsHe: [],
    thinEvidenceSubjectsHe,
    practicedSubjectsSummaryHe: p?.practicedSubjectsSummaryHe ?? null,
  };
}

/** @param {Parameters<typeof buildDiagnosticOverviewHeV2>[0]} params */
export function buildDiagnosticOverviewHeV2ForTests(params) {
  return buildDiagnosticOverviewHeV2(params);
}

function intelligenceSummaryFromV2Units(list) {
  let lowConfidenceCount = 0;
  let noWeaknessCount = 0;
  let recurrenceCount = 0;
  for (const u of list) {
    const iv = u?.intelligenceV1;
    if (!iv || typeof iv !== "object") continue;
    if (String(iv.confidence?.band || "") === "low") lowConfidenceCount += 1;
    if (String(iv.weakness?.level || "") === "none") noWeaknessCount += 1;
    if (iv.patterns?.recurrenceFull) recurrenceCount += 1;
  }
  return { lowConfidenceCount, noWeaknessCount, recurrenceCount };
}

/**
 * @param {unknown[]} units
 * @param {{
 *   subjectId?: string,
 *   subjectReportQuestions?: number,
 *   subjectLabelHe?: string,
 *   reportSubjectAccuracy?: number|null,
 *   reportTotalQuestions?: number,
 *   topicMap?: Record<string, unknown>|null,
 * }} [opts]
 */
function summarizeV2UnitsForSubject(units, opts = {}) {
  const topicMap = opts.topicMap && typeof opts.topicMap === "object" ? opts.topicMap : {};
  const registeredGradeKey =
    opts.registeredGradeKey != null && String(opts.registeredGradeKey).trim()
      ? String(opts.registeredGradeKey).trim()
      : registeredGradeKeyFromReportMaps({ topicMap });
  const list = filterCoreV2Units(units, topicMap, registeredGradeKey);
  const subjectReportQuestions = Math.max(0, Number(opts.subjectReportQuestions) || 0);
  const reportTotalQuestions = Math.max(0, Number(opts.reportTotalQuestions) || 0);
  const subjectLabelHe = String(opts.subjectLabelHe || "").trim();
  const reportSubjectAccuracyRaw =
    opts.reportSubjectAccuracy == null ? null : Number(opts.reportSubjectAccuracy);
  const reportSubjectAccuracy =
    reportSubjectAccuracyRaw != null && Number.isFinite(reportSubjectAccuracyRaw)
      ? Math.max(0, Math.min(100, Math.round(reportSubjectAccuracyRaw)))
      : null;
  if (list.length === 0) {
    return {
      hasAnySignal: false,
      intelligenceSummary: { lowConfidenceCount: 0, noWeaknessCount: 0, recurrenceCount: 0 },
    };
  }

  const cs = (u) => u?.canonicalState;
  const actionOf = (u) => cs(u)?.actionState || "withhold";

  const diagnosed = list.filter((u) => !!u?.diagnosis?.allowed);
  const strengthUnits = list.filter((u) => actionOf(u) === "maintain" || actionOf(u) === "expand_cautiously");
  const uncertain = list.filter((u) => cs(u)?.assessment?.cannotConcludeYet);

  const topWeak =
    diagnosed.find((u) => String(u?.priority?.level || "") === "P4") ||
    diagnosed.find((u) => String(u?.priority?.level || "") === "P3") ||
    diagnosed[0] ||
    null;

  const actionAnchor = (() => {
    if (topWeak) return topWeak;
    const maintainUnit = list.find((u) => actionOf(u) === "maintain" || actionOf(u) === "expand_cautiously");
    if (maintainUnit) return maintainUnit;
    return list[0] || null;
  })();

  const anchorTrk = actionAnchor ? String(actionAnchor.topicRowKey || "") : "";
  const anchorRow =
    anchorTrk && topicMap[anchorTrk] && typeof topicMap[anchorTrk] === "object"
      ? topicMap[anchorTrk]
      : null;
  const anchorGradeKey = (() => {
    if (anchorRow && anchorRow.gradeKey != null && String(anchorRow.gradeKey).trim()) {
      return String(anchorRow.gradeKey).trim();
    }
    if (!anchorTrk) return null;
    const p = splitTopicRowKey(anchorTrk);
    const g = p?.gradeKey;
    return g != null && String(g).trim() !== "" ? String(g).trim() : null;
  })();

  const POSITIVE_LEVEL_RANK_LOCAL = { excellent: 3, very_good: 2, good: 1, none: 0 };
  const posLevel = (u) => cs(u)?.evidence?.positiveAuthorityLevel || "none";
  const rankPositive = (a, b) => {
    const la = String(posLevel(a));
    const lb = String(posLevel(b));
    return (POSITIVE_LEVEL_RANK_LOCAL[lb] || 0) - (POSITIVE_LEVEL_RANK_LOCAL[la] || 0);
  };

  const excellentUnits = strengthUnits
    .filter((u) => posLevel(u) === "excellent")
    .sort(rankPositive);
  const veryGoodUnits = strengthUnits
    .filter((u) => posLevel(u) === "very_good")
    .sort(rankPositive);
  const goodUnits = strengthUnits
    .filter((u) => posLevel(u) === "good")
    .sort(rankPositive);

  const mapStrengthRow = (u, /** @type {boolean} */ excellentFlag) => ({
    labelHe: normalizeParentFacingHe(String(u?.displayName || "")),
    questions: safeNumber(u?.evidenceTrace?.[0]?.value?.questions),
    accuracy: safeNumber(u?.evidenceTrace?.[0]?.value?.accuracy),
    excellent: excellentFlag,
    tierHe: tierStableStrengthHe(),
    topicStateId: cs(u)?.topicStateId || null,
    stateHash: cs(u)?.stateHash || null,
  });

  const stableExcellence = excellentUnits.slice(0, 5).map((u) => mapStrengthRow(u, true));
  const topStrengths = veryGoodUnits.slice(0, 3).map((u) => mapStrengthRow(u, false));
  const maintain = goodUnits.slice(0, 5).map((u) => mapStrengthRow(u, false));

  const topWeaknesses = diagnosed
    .filter((u) => parentFacingPatternLabelHe(u))
    .slice(0, 3)
    .map((u) => {
      const taxonomyId = String(u?.taxonomy?.id || u?.diagnosis?.taxonomyId || "").trim();
      return {
        labelHe: parentFacingPatternLabelHe(u),
        mistakeCount: safeNumber(u?.recurrence?.wrongCountForRules),
        tierHe:
          safeNumber(u?.recurrence?.wrongCountForRules) >= 5 ? tierWeaknessRecurringHe() : tierWeaknessSupportHe(),
        topicStateId: cs(u)?.topicStateId || null,
        stateHash: cs(u)?.stateHash || null,
        taxonomyId: taxonomyId || null,
        parentDiagnosticExplanationV1: buildParentDiagnosticExplanationV1FromV2Unit(u),
      };
    });

  const rankedForEvidence = [...strengthUnits].sort(rankPositive);
  const evidenceExamples = [];
  for (const u of rankedForEvidence.slice(0, 2)) {
    const level = cs(u)?.evidence?.positiveAuthorityLevel || "none";
    const confidence = level === "excellent" || level === "very_good" ? "high" : "moderate";
    evidenceExamples.push({
      type: "success",
      titleHe: normalizeParentFacingHe(String(u?.displayName || evidenceExampleTitleFallbackHe())),
      bodyHe: v2PositiveStrengthBodyFromUnitHe(u),
      confidence,
    });
  }
  for (const u of diagnosed) {
    if (evidenceExamples.length >= 2) break;
    const confidence = cs(u)?.assessment?.confidenceLevel || String(u?.confidence?.level || "");
    if (confidence !== "high" && confidence !== "moderate") continue;
    evidenceExamples.push({
      type: "mistake",
      titleHe: normalizeParentFacingHe(String(u?.displayName || evidenceExampleTitleFallbackHe())),
      bodyHe: normalizeParentFacingHe(
        parentFacingDiagnosisSnippetHe(
          u,
          String(u?.diagnosis?.lineHe || parentFacingPatternLabelHe(u) || evidenceExampleBodyFallbackHe()),
        ),
      ),
      confidence,
    });
  }

  const evidenceSuccess =
    rankedForEvidence[0] != null
      ? {
          titleHe: normalizeParentFacingHe(
            String(rankedForEvidence[0]?.displayName || evidenceExampleTitleFallbackHe())
          ),
          bodyHe: v2PositiveStrengthBodyFromUnitHe(rankedForEvidence[0]),
          confidence:
            (cs(rankedForEvidence[0])?.evidence?.positiveAuthorityLevel === "excellent" ||
             cs(rankedForEvidence[0])?.evidence?.positiveAuthorityLevel === "very_good")
              ? "high"
              : "moderate",
        }
      : null;

  const p4Unit = diagnosed.find((u) => String(u?.priority?.level || "") === "P4");
  const leadPositive = rankedForEvidence[0] || null;
  const leadAction = actionOf(leadPositive);
  const isStrengthLead = leadAction === "maintain" || leadAction === "expand_cautiously";
  const additiveOnLead = !!leadPositive?.outputGating?.additiveCautionAllowed;

  let summaryHe = (() => {
    if (p4Unit) {
      return normalizeParentFacingHe(
        `בנושא ${String(p4Unit?.displayName || evidenceExampleTitleFallbackHe())}: ${String(
          parentFacingPatternLabelHe(p4Unit) || "עדיף עוד קצת תרגול לפני שקובעים כיוון סופי."
        )}`
      );
    }
    if (isStrengthLead && leadPositive) {
      const leadLevel = cs(leadPositive)?.evidence?.positiveAuthorityLevel || "none";
      const isStrongLead = leadLevel === "excellent" || leadLevel === "very_good";
      const name = String(leadPositive.displayName || evidenceExampleTitleFallbackHe());
      const base = `בנושא ${name}: ${tierStableStrengthHe()}`;
      const pattern = parentFacingPatternLabelHe(topWeak);
      if (isStrongLead && additiveOnLead && pattern) {
        return normalizeParentFacingHe(`${base} · ${pattern}`);
      }
      if (isStrongLead && additiveOnLead && topWeak) {
        return normalizeParentFacingHe(`${base} ${topicRecommendationV2CautionGatedHe()}`);
      }
      return normalizeParentFacingHe(base);
    }
    if (topWeak) {
      const weakQ = Number(topWeak?.evidenceTrace?.[0]?.value?.questions) || 0;
      const weakAcc = Number(topWeak?.evidenceTrace?.[0]?.value?.accuracy) || 0;
      if (weakQ >= 5 && weakAcc < 70) {
        return normalizeParentFacingHe(
          `בנושא ${String(topWeak?.displayName || evidenceExampleTitleFallbackHe())}: כדאי לחזק את הנושא בתרגול קצר - לפי ${weakQ} שאלות ודיוק של ${Math.round(weakAcc)}%.`,
        );
      }
      return normalizeParentFacingHe(
        `בנושא ${String(topWeak?.displayName || evidenceExampleTitleFallbackHe())}: ${String(
          parentFacingPatternLabelHe(topWeak) || "עדיף עוד קצת תרגול לפני שקובעים כיוון סופי."
        )}`
      );
    }
    const name =
      String(p4Unit?.displayName || "").trim() ||
      String(topWeak?.displayName || "").trim() ||
      String(leadPositive?.displayName || "").trim() ||
      String(list[0]?.displayName || "").trim() ||
      evidenceExampleTitleFallbackHe();
    const anchorU = p4Unit || topWeak || leadPositive || list[0] || null;
    const rawAct = anchorU ? cs(anchorU)?.actionState : null;
    const act = rawAct || "withhold";
    const sumUnitQuestions = list.reduce((acc, u) => acc + safeNumber(u?.evidenceTrace?.[0]?.value?.questions), 0);
    if (act === "withhold") {
      if (sumUnitQuestions >= 10) {
        const inner = withholdSummaryCopyHe("topic", {
          subjectReportQuestions,
          sumUnitQuestions,
          strengthUnitCount: strengthUnits.length,
          diagnosedCount: diagnosed.length,
          weakPatternHe: parentFacingPatternLabelHe(topWeak),
          units: list,
          subjectLabelHe,
          reportSubjectAccuracy,
          reportTotalQuestions,
        });
        return normalizeParentFacingHe(`בנושא ${name}: ${inner}`);
      }
      // Grammar fix (was: "עדיין אין מספיק מה שרואים בשורות כדי לסגור תמונה ברורה." — broken syntax).
      return normalizeParentFacingHe(`בנושא ${name}: עדיין אין מספיק נתונים כדי לקבוע תמונה ברורה.`);
    }
    if (act === "probe_only") {
      return normalizeParentFacingHe(`בנושא ${name}: עדיף עוד קצת תרגול לפני שקובעים כיוון סופי.`);
    }
    return normalizeParentFacingHe(
      `בנושא ${name}: עדיף עוד קצת תרגול לפני שקובעים כיוון סופי.`
    );
  })();

  const intelligenceSummary = intelligenceSummaryFromV2Units(list);

  const subjectId = String(opts.subjectId || "").trim();
  let subjectEngineContract = null;
  let subjectSummaryRenderSource = "legacy";
  let subjectSummaryTemplateId = "legacy_short_subject_summary";

  if (subjectId && topicMap && typeof topicMap === "object" && Object.keys(topicMap).length > 0) {
    subjectEngineContract = buildSubjectEngineDecisionContractFromTopicMap(subjectId, topicMap, {
      subjectLabelKey: subjectId,
    });
    const contractSummary = resolveSubjectSummaryTextFromEngineContract(subjectEngineContract, {
      subjectLabelHe: String(opts.subjectLabelHe || "").trim(),
    });
    if (contractSummary) {
      summaryHe = contractSummary;
      subjectSummaryRenderSource = RENDER_SOURCE_SUBJECT_ENGINE;
      subjectSummaryTemplateId =
        String(subjectEngineContract.summarySlots?.openingTemplateId || "").trim() ||
        "SUBJECT_OPENING_PRIORITY_TOPIC_0";
    }
  }

  return {
    hasAnySignal: list.length > 0,
    intelligenceSummary,
    summaryHe,
    subjectSummaryRenderSource,
    subjectSummaryTemplateId,
    subjectSummaryDecisionCode: subjectEngineContract?.subjectDecision || null,
    [SP_SUBJECT_ENGINE_CONTRACT]: subjectEngineContract,
    topStrengths,
    topWeaknesses,
    strengths: [],
    weaknesses: [],
    maintain,
    improving: [],
    stableExcellence,
    studentRecommendationsImprove: [],
    studentRecommendationsMaintain: [],
    parentRecommendationsImprove: [],
    parentRecommendationsMaintain: [],
    evidenceMistake: null,
    evidenceSuccess,
    evidenceExamples,
    parentActionHe: actionAnchor ? resolveUnitParentActionHe(actionAnchor, anchorGradeKey) : null,
    nextWeekGoalHe: actionAnchor ? resolveUnitNextGoalHe(actionAnchor, anchorGradeKey) : null,
    subjectPriorityReasonHe: (() => {
      const t = parentFacingPatternLabelHe(topWeak);
      return t ? normalizeParentFacingHe(t) : null;
    })(),
    subjectDoNowHe: actionAnchor ? resolveUnitParentActionHe(actionAnchor, anchorGradeKey) : null,
    subjectAvoidNowHe: (() => {
      const t = String(actionAnchor?.intervention?.avoidHe || "").trim();
      return t ? normalizeParentFacingHe(t) : null;
    })(),
    dominantMistakePatternLabelHe: (() => {
      const t = parentFacingPatternLabelHe(topWeak);
      return t ? normalizeParentFacingHe(t) : null;
    })(),
    recommendedHomeMethodHe: actionAnchor
      ? resolveUnitNextGoalHe(actionAnchor, anchorGradeKey) || resolveUnitHomeMethodHe(actionAnchor, anchorGradeKey)
      : null,
    subjectMemoryNarrativeHe: uncertain.length ? v2SubjectMemoryPartialEvidenceHe() : null,
    subjectDiagnosticRestraintHe: uncertain.length ? v2SubjectDiagnosticRestraintHe() : null,
  };
}

/** Test hook: keep regular-report recommendation mapping verifiable in phase suites. */
export function summarizeV2UnitsForSubjectForTests(units, opts) {
  return summarizeV2UnitsForSubject(units, opts);
}

/** Test hook: diagnostic evidence lines per unit + row. */
export function collectDiagnosticEvidenceLinesForTests(unit, row) {
  return collectDiagnosticEvidenceLinesHe(unit, row);
}

/** Test hook: deterministic positive strength body from unit evidenceTrace. */
export function v2PositiveStrengthBodyFromUnitForTests(u) {
  return v2PositiveStrengthBodyFromUnitHe(u);
}

/** Test hook: patternDiagnostics.diagnosticCards builder. */
export function buildDiagnosticCardsForSubjectForTests(subjectId, subjectUnits, topicMap) {
  return buildDiagnosticCardsForSubject(subjectId, subjectUnits, topicMap);
}

/**
 * @param {unknown} diagnosticEngineV2
 * @param {Record<string, Record<string, unknown>>|null|undefined} maps
 */
function buildPatternDiagnosticsFromV2(
  diagnosticEngineV2,
  maps,
  subjectQuestionCounts,
  subjectAccuracyById,
  reportTotalQuestions,
  registeredGradeKey = null,
) {
  const units = Array.isArray(diagnosticEngineV2?.units) ? diagnosticEngineV2.units : [];
  const regKey =
    registeredGradeKey != null && String(registeredGradeKey).trim()
      ? String(registeredGradeKey).trim()
      : registeredGradeKeyFromReportMaps(maps);
  const counts =
    subjectQuestionCounts && typeof subjectQuestionCounts === "object" ? subjectQuestionCounts : {};
  const accMap =
    subjectAccuracyById && typeof subjectAccuracyById === "object" ? subjectAccuracyById : {};
  const subjects = {};
  for (const sid of V2_SUBJECT_ORDER) {
    const subjectUnits = units.filter((u) => String(u?.subjectId || "") === sid);
    const topicMap = maps?.[sid] && typeof maps[sid] === "object" ? maps[sid] : {};
    const srQ = Math.max(0, Number(counts[sid]) || 0);
    const labelHe = formatParentReportSubjectHe(sid);
    const accRaw = accMap[sid];
    const reportAcc =
      accRaw != null && Number.isFinite(Number(accRaw)) ? Math.round(Number(accRaw)) : null;
    const rtq = Math.max(0, Number(reportTotalQuestions) || 0);
    subjects[sid] = {
      subjectLabelHe: labelHe,
      ...summarizeV2UnitsForSubject(subjectUnits, {
        subjectId: sid,
        subjectReportQuestions: srQ,
        subjectLabelHe: labelHe,
        reportSubjectAccuracy: reportAcc,
        reportTotalQuestions: rtq,
        topicMap,
        registeredGradeKey: regKey,
      }),
      diagnosticCards: buildDiagnosticCardsForSubject(sid, subjectUnits, topicMap, regKey),
    };
  }
  return { version: 2, subjects };
}

function systemIntelligenceTopicKey(subjectId, topicRowKey, row) {
  const bk =
    row && typeof row === "object" && row.bucketKey != null && row.bucketKey !== ""
      ? String(row.bucketKey)
      : String(splitBucketModeRowKey(String(topicRowKey || "")).bucketKey || topicRowKey || "");
  if (String(subjectId) === "math") {
    return String(mathReportBaseOperationKey(bk));
  }
  return String(splitTopicRowKey(String(topicRowKey || "")).bucketKey || topicRowKey || "");
}

function buildSystemIntelligenceHistoryMapFromMaps(maps) {
  const historyMap = {};
  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const w = row.trend?.windows;
      if (!w || typeof w !== "object") continue;
      const order = ["previousComparablePeriod", "recentShortWindow", "currentPeriod"];
      const h = [];
      for (const k of order) {
        const acc = Number(w[k]?.accuracy);
        if (Number.isFinite(acc)) h.push({ accuracy: acc });
      }
      if (h.length < 2) continue;
      const topicKey = systemIntelligenceTopicKey(subjectId, topicRowKey, row);
      historyMap[topicKey] = h;
    }
  }
  return historyMap;
}

/**
 * System-level downgrade guards + metadata (no Phase2/contract changes).
 * @param {Record<string, Record<string, unknown>>} maps
 * @returns {{ globalScore: { score: number, level: string } }}
 */
function applySystemIntelligenceLayerToMaps(maps) {
  const topicResults = [];
  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      if (Number(row.questions) <= 0) continue;
      const step = row.diagnosticRecommendedNextStep;
      if (step == null || step === "") continue;
      const topicKey = systemIntelligenceTopicKey(subjectId, topicRowKey, row);
      topicResults.push({
        topicKey,
        topicRowKey,
        subjectId,
        recommendedNextStep: String(step),
        __reportRow: row,
      });
    }
  }
  if (topicResults.length === 0) {
    return { globalScore: computeGlobalScore([]) };
  }

  const historyMap = buildSystemIntelligenceHistoryMapFromMaps(maps);

  let topics = topicResults;
  topics = applyConsistencyGuards(topics);
  topics = applyDependencyGuards(topics);
  topics = attachFeedbackSignal(topics, historyMap || {});
  topics = applyTimeDecisionGuards(topics, historyMap || {});
  topics = applyFeedbackDecisionGuards(topics);
  topics = computeTopicPriority(topics);

  const globalScore = computeGlobalScore(topics);

  for (const t of topics) {
    const row = t.__reportRow;
    if (!row || typeof row !== "object") continue;
    row.diagnosticRecommendedNextStep = t.recommendedNextStep;
    if (t._consistencyAdjusted) row._consistencyAdjusted = true;
    if (t._dependencyAdjusted) row._dependencyAdjusted = true;
    if (Object.prototype.hasOwnProperty.call(t, "_feedback")) {
      row._feedback = t._feedback;
    }
    if (Object.prototype.hasOwnProperty.call(t, "_timeAdjusted")) {
      row._timeAdjusted = t._timeAdjusted;
    }
    if (Object.prototype.hasOwnProperty.call(t, "_feedbackAdjusted")) {
      row._feedbackAdjusted = t._feedbackAdjusted;
    }
    if (Object.prototype.hasOwnProperty.call(t, "_priorityScore")) {
      row._priorityScore = t._priorityScore;
    }
    if (process.env.NODE_ENV !== "production") {
      if (
        t._consistencyAdjusted ||
        t._dependencyAdjusted ||
        Object.prototype.hasOwnProperty.call(t, "_feedback") ||
        Object.prototype.hasOwnProperty.call(t, "_timeAdjusted") ||
        Object.prototype.hasOwnProperty.call(t, "_feedbackAdjusted") ||
        Object.prototype.hasOwnProperty.call(t, "_priorityScore")
      ) {
        row._systemIntelligenceTrace = {
          consistencyAdjusted: !!t._consistencyAdjusted,
          dependencyAdjusted: !!t._dependencyAdjusted,
          feedback: Object.prototype.hasOwnProperty.call(t, "_feedback") ? t._feedback : null,
          timeAdjusted: Object.prototype.hasOwnProperty.call(t, "_timeAdjusted") ? t._timeAdjusted : null,
          feedbackAdjusted: Object.prototype.hasOwnProperty.call(t, "_feedbackAdjusted") ? t._feedbackAdjusted : null,
          priorityScore: Object.prototype.hasOwnProperty.call(t, "_priorityScore") ? t._priorityScore : null,
        };
      }
    }
  }

  return { globalScore };
}

/**
 * @param {string} playerName
 * @param {string} period 'week'|'month'|'custom'
 * @param {string|null} customStartDate YYYY-MM-DD
 * @param {string|null} customEndDate YYYY-MM-DD
 */
export function generateParentReportV2(
  playerName,
  period = "week",
  customStartDate = null,
  customEndDate = null
) {
  if (typeof window === "undefined" && typeof globalThis?.window === "undefined") return null;

  const now = new Date();
  let startDate;
  let endDate;
  let startDateCalendar = null;
  let endDateCalendar = null;

  if (period === "custom" && customStartDate && customEndDate) {
    const resolved = resolveCustomReportCalendarRange(customStartDate, customEndDate, now);
    startDate = new Date(resolved.startMs);
    endDate = new Date(resolved.endMs);
    startDateCalendar = resolved.startCalendar;
    endDateCalendar = resolved.endCalendar;
  } else {
    const days = period === "week" ? 7 : period === "month" ? 30 : 365;
    endDate = now;
    startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const mathOperations = {};
  const geometryTopics = {};
  const englishTopics = {};
  const scienceTopics = {};
  const historyTopics = {};
  const hebrewTopics = {};
  const moledetGeographyTopics = {};

  const maps = {
    math: mathOperations,
    geometry: geometryTopics,
    english: englishTopics,
    science: scienceTopics,
    history: historyTopics,
    hebrew: hebrewTopics,
    "moledet-geography": moledetGeographyTopics,
  };

  let mathTotalQuestions = 0;
  let mathTotalCorrect = 0;
  let geometryTotalQuestions = 0;
  let geometryTotalCorrect = 0;
  let englishTotalQuestions = 0;
  let englishTotalCorrect = 0;
  let scienceTotalQuestions = 0;
  let scienceTotalCorrect = 0;
  let historyTotalQuestions = 0;
  let historyTotalCorrect = 0;
  let hebrewTotalQuestions = 0;
  let hebrewTotalCorrect = 0;
  let moledetGeographyTotalQuestions = 0;
  let moledetGeographyTotalCorrect = 0;


  SUBJECTS.forEach((def) => {
    const saved = loadTracking(def.trackingKey);
    const progress = loadProgress(def.progressStorage());
    const progressData = progress.progress || {};
    const bucket = saved[def.container] || {};
    const targetMap = maps[def.id];

    const builtRaw = buildMapFromBucket({
      bucket,
      progressData,
      startMs,
      endMs,
      subject: def.id === "moledet-geography" ? "moledet-geography" : def.id,
      displayNameFn: def.displayName,
    });
    const built = collapseTopicRowsToCanonicalTopicEntity(def.id, builtRaw);

    Object.assign(targetMap, built);

    Object.values(built).forEach((row) => {
      if (def.id === "math") {
        mathTotalQuestions += row.questions;
        mathTotalCorrect += row.correct;
      } else if (def.id === "geometry") {
        geometryTotalQuestions += row.questions;
        geometryTotalCorrect += row.correct;
      } else if (def.id === "english") {
        englishTotalQuestions += row.questions;
        englishTotalCorrect += row.correct;
      } else if (def.id === "science") {
        scienceTotalQuestions += row.questions;
        scienceTotalCorrect += row.correct;
      } else if (def.id === "history") {
        historyTotalQuestions += row.questions;
        historyTotalCorrect += row.correct;
      } else if (def.id === "hebrew") {
        hebrewTotalQuestions += row.questions;
        hebrewTotalCorrect += row.correct;
      } else if (def.id === "moledet-geography") {
        moledetGeographyTotalQuestions += row.questions;
        moledetGeographyTotalCorrect += row.correct;
      }
    });
  });

  applyMathScopedParentDisplayNames(mathOperations);

  const totalQuestions =
    mathTotalQuestions +
    geometryTotalQuestions +
    englishTotalQuestions +
    scienceTotalQuestions +
    historyTotalQuestions +
    hebrewTotalQuestions +
    moledetGeographyTotalQuestions;
  const totalCorrect =
    mathTotalCorrect +
    geometryTotalCorrect +
    englishTotalCorrect +
    scienceTotalCorrect +
    historyTotalCorrect +
    hebrewTotalCorrect +
    moledetGeographyTotalCorrect;
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const mathProgress = loadProgress(STORAGE_KEY + "_progress");
  const geometryProgress = loadProgress("mleo_geometry_master_progress");
  const englishProgress = loadProgress("mleo_english_master_progress");
  const scienceProgress = loadProgress("mleo_science_master_progress");
  const historyProgress = loadProgress("mleo_history_master_progress");
  const hebrewProgress = loadProgress("mleo_hebrew_master_progress");
  const moledetGeographyProgress = loadProgress("mleo_moledet_geography_master_progress");

  const stars =
    (mathProgress.stars || 0) +
    (geometryProgress.stars || 0) +
    (englishProgress.stars || 0) +
    (scienceProgress.stars || 0) +
    (historyProgress.stars || 0) +
    (hebrewProgress.stars || 0) +
    (moledetGeographyProgress.stars || 0);
  const xp =
    (mathProgress.xp || 0) +
    (geometryProgress.xp || 0) +
    (englishProgress.xp || 0) +
    (scienceProgress.xp || 0) +
    (historyProgress.xp || 0) +
    (hebrewProgress.xp || 0) +
    (moledetGeographyProgress.xp || 0);
  const playerLevel = Math.max(
    mathProgress.playerLevel || 1,
    geometryProgress.playerLevel || 1,
    englishProgress.playerLevel || 1,
    scienceProgress.playerLevel || 1,
    historyProgress.playerLevel || 1,
    hebrewProgress.playerLevel || 1,
    moledetGeographyProgress.playerLevel || 1
  );

  const mathAchievements = mathProgress.badges || [];
  const geometryAchievements = geometryProgress.badges || [];
  const englishAchievements = englishProgress.badges || [];
  const scienceAchievements = scienceProgress.badges || [];
  const historyAchievements = historyProgress.badges || [];
  const hebrewAchievements = hebrewProgress.badges || [];
  const moledetGeographyAchievements = moledetGeographyProgress.badges || [];
  const achievements = [
    ...mathAchievements,
    ...geometryAchievements,
    ...englishAchievements,
    ...scienceAchievements,
    ...historyAchievements,
    ...hebrewAchievements,
    ...moledetGeographyAchievements,
  ];

  const mathMistakesRaw = safeGetJsonArray("mleo_mistakes");
  const geometryMistakesRaw = safeGetJsonArray("mleo_geometry_mistakes");
  const englishMistakesRaw = safeGetJsonArray("mleo_english_mistakes");
  const scienceMistakesRaw = safeGetJsonArray("mleo_science_mistakes");
  const historyMistakesRaw = safeGetJsonArray("mleo_history_mistakes");
  const hebrewMistakesRaw = safeGetJsonArray("mleo_hebrew_mistakes");
  const moledetGeographyMistakesRaw = safeGetJsonArray("mleo_moledet_geography_mistakes");

  const mathMistakesByOperation = buildMathMistakesScopedCounts(mathMistakesRaw, startMs, endMs);
  const geometryMistakesByTopic = filterMistakes(
    geometryMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic || (m.snapshot && m.snapshot.topic)
  );
  const englishMistakesByTopic = filterMistakes(
    englishMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic
  );
  const scienceMistakesByTopic = filterMistakes(
    scienceMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic
  );
  const historyMistakesByTopic = filterMistakes(
    historyMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic
  );
  const historyMistakesBySubtopic = filterMistakes(
    historyMistakesRaw,
    startMs,
    endMs,
    historyMistakeSubtopicKey
  );
  const historySubtopics = buildHistorySubtopicReportMap({
    historyTopics,
    mistakeCountsBySubtopic: historyMistakesBySubtopic,
  });
  maps.historySubtopics = historySubtopics;
  const hebrewMistakesByTopic = filterMistakes(
    hebrewMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic || m.operation
  );
  const moledetGeographyMistakesByTopic = filterMistakes(
    moledetGeographyMistakesRaw,
    startMs,
    endMs,
    (m) => m.topic || m.operation
  );

  const rawMistakesBySubject = {
    math: mistakesInDateRange(mathMistakesRaw, startMs, endMs),
    geometry: mistakesInDateRange(geometryMistakesRaw, startMs, endMs),
    english: mistakesInDateRange(englishMistakesRaw, startMs, endMs),
    science: mistakesInDateRange(scienceMistakesRaw, startMs, endMs),
    history: mistakesInDateRange(historyMistakesRaw, startMs, endMs),
    hebrew: mistakesInDateRange(hebrewMistakesRaw, startMs, endMs),
    "moledet-geography": mistakesInDateRange(
      moledetGeographyMistakesRaw,
      startMs,
      endMs
    ),
  };

  const mathRecommendations = generateRecommendations(
    mathOperations,
    mathMistakesByOperation
  );
  const geometryRecommendations = generateRecommendations(
    geometryTopics,
    geometryMistakesByTopic
  );
  const englishRecommendations = generateRecommendations(
    englishTopics,
    englishMistakesByTopic
  );
  const scienceRecommendations = generateRecommendations(
    scienceTopics,
    scienceMistakesByTopic
  );
  const historyRecommendations = enrichHistoryRecommendations(
    historySubtopics,
    historyMistakesBySubtopic,
    generateRecommendations
  );
  const hebrewRecommendations = generateRecommendations(
    hebrewTopics,
    hebrewMistakesByTopic
  );
  const moledetGeographyRecommendations = generateRecommendations(
    moledetGeographyTopics,
    moledetGeographyMistakesByTopic
  );
  const recommendations = [
    ...mathRecommendations,
    ...geometryRecommendations,
    ...englishRecommendations,
    ...scienceRecommendations,
    ...historyRecommendations,
    ...hebrewRecommendations,
    ...moledetGeographyRecommendations,
  ];

  let totalTimeMinutes = 0;
  [
    mathOperations,
    geometryTopics,
    englishTopics,
    scienceTopics,
    historyTopics,
    hebrewTopics,
    moledetGeographyTopics,
  ].forEach((m) => {
    Object.values(m).forEach((row) => {
      totalTimeMinutes += row.timeMinutes || 0;
    });
  });

  const dailyActivity = buildDailyActivityFromSessions(startMs, endMs);

  const needsPractice = [
    ...Object.entries(mathOperations)
      .filter(([_, d]) => d.needsPractice)
      .map(
        ([_, d]) =>
          `מתמטיקה: ${d.displayName || getMathReportBucketDisplayName(d.bucketKey)}`
      ),
    ...Object.entries(geometryTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(([_, d]) => `גאומטריה: ${d.displayName || getTopicName(d.bucketKey)}`),
    ...Object.entries(englishTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(([_, d]) => `אנגלית: ${d.displayName || getEnglishTopicName(d.bucketKey)}`),
    ...Object.entries(scienceTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(([_, d]) => `מדעים: ${d.displayName || getScienceTopicName(d.bucketKey)}`),
    ...Object.entries(historyTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(([_, d]) => `היסטוריה: ${d.displayName || getHistoryTopicName(d.bucketKey)}`),
    ...Object.entries(hebrewTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(([_, d]) => `עברית: ${d.displayName || getHebrewTopicName(d.bucketKey)}`),
    ...Object.entries(moledetGeographyTopics)
      .filter(([_, d]) => d.needsPractice)
      .map(
        ([_, d]) =>
          `מולדת וגאוגרפיה: ${d.displayName || getMoledetGeographyTopicName(d.bucketKey)}`
      ),
  ];

  const excellent = [
    ...Object.entries(mathOperations)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(
        ([_, d]) =>
          `מתמטיקה: ${d.displayName || getMathReportBucketDisplayName(d.bucketKey)}`
      ),
    ...Object.entries(geometryTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(([_, d]) => `גאומטריה: ${d.displayName || getTopicName(d.bucketKey)}`),
    ...Object.entries(englishTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(([_, d]) => `אנגלית: ${d.displayName || getEnglishTopicName(d.bucketKey)}`),
    ...Object.entries(scienceTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(([_, d]) => `מדעים: ${d.displayName || getScienceTopicName(d.bucketKey)}`),
    ...Object.entries(historyTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(([_, d]) => `היסטוריה: ${d.displayName || getHistoryTopicName(d.bucketKey)}`),
    ...Object.entries(hebrewTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(([_, d]) => `עברית: ${d.displayName || getHebrewTopicName(d.bucketKey)}`),
    ...Object.entries(moledetGeographyTopics)
      .filter(([_, d]) => d.excellent && d.questions >= 10)
      .map(
        ([_, d]) =>
          `מולדת וגאוגרפיה: ${d.displayName || getMoledetGeographyTopicName(d.bucketKey)}`
      ),
  ];

  const dailyChallenge = safeGetJsonObject("mleo_daily_challenge");
  const weeklyChallenge = safeGetJsonObject("mleo_weekly_challenge");

  const allItems = {
    ...Object.fromEntries(
      Object.entries(mathOperations).map(([k, v]) => [`math_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(geometryTopics).map(([k, v]) => [`geometry_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(englishTopics).map(([k, v]) => [`english_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(scienceTopics).map(([k, v]) => [`science_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(historyTopics).map(([k, v]) => [`history_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(hebrewTopics).map(([k, v]) => [`hebrew_${k}`, v])
    ),
    ...Object.fromEntries(
      Object.entries(moledetGeographyTopics).map(([k, v]) => [
        `moledet-geography_${k}`,
        v,
      ])
    ),
  };

  const mathAccuracy =
    mathTotalQuestions > 0
      ? Math.round((mathTotalCorrect / mathTotalQuestions) * 100)
      : 0;
  const geometryAccuracy =
    geometryTotalQuestions > 0
      ? Math.round((geometryTotalCorrect / geometryTotalQuestions) * 100)
      : 0;
  const englishAccuracy =
    englishTotalQuestions > 0
      ? Math.round((englishTotalCorrect / englishTotalQuestions) * 100)
      : 0;
  const scienceAccuracy =
    scienceTotalQuestions > 0
      ? Math.round((scienceTotalCorrect / scienceTotalQuestions) * 100)
      : 0;
  const historyAccuracy =
    historyTotalQuestions > 0
      ? Math.round((historyTotalCorrect / historyTotalQuestions) * 100)
      : 0;
  const hebrewAccuracy =
    hebrewTotalQuestions > 0
      ? Math.round((hebrewTotalCorrect / hebrewTotalQuestions) * 100)
      : 0;
  const moledetGeographyAccuracy =
    moledetGeographyTotalQuestions > 0
      ? Math.round(
          (moledetGeographyTotalCorrect / moledetGeographyTotalQuestions) * 100
        )
      : 0;

  const mistakesBySubjectMaps = {
    math: mathMistakesByOperation,
    geometry: geometryMistakesByTopic,
    english: englishMistakesByTopic,
    science: scienceMistakesByTopic,
    history: historyMistakesByTopic,
    hebrew: hebrewMistakesByTopic,
    "moledet-geography": moledetGeographyMistakesByTopic,
  };
  const trackingSnapshots = {};
  SUBJECTS.forEach((def) => {
    const saved = loadTracking(def.trackingKey);
    trackingSnapshots[def.id] = saved[def.container] || {};
  });

  enrichTopicMapsWithRowDiagnostics(maps, mistakesBySubjectMaps, endMs);
  enrichTopicMapsWithRowTrends(maps, trackingSnapshots, rawMistakesBySubject, startMs, endMs);
  enrichTopicMapsWithTrendV1(maps, loadTopicAnswerEventsFromReportStorage());
  enrichTopicMapsWithRowBehaviorProfiles(maps, rawMistakesBySubject, startMs, endMs);
  const contractsV1TraceEnabled = evidenceContractsV1Enabled();
  if (contractsV1TraceEnabled) {
    attachEvidenceContractsV1ToTopicMaps(maps, startMs, endMs);
  }
  enrichReportMapsWithTopicStepHints(maps, mistakesBySubjectMaps, endMs, undefined, {
    rawMistakesBySubject,
    startMs,
  });

  const systemIntelligenceLayer = applySystemIntelligenceLayerToMaps(maps);

  for (const [sid, topicMap] of Object.entries(maps)) {
    if (!topicMap || typeof topicMap !== "object") continue;
    for (const key of Object.keys(topicMap)) {
      if (key.includes("\u0001")) {
        throw new Error(`generateParentReportV2: topic key "${key}" in subject "${sid}" contains composite separator - must be collapsed before engine`);
      }
    }
  }

  const diagnosticEngineV2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs,
    endMs,
  });

  enrichDiagnosticEngineV2WithProfessionalFrameworkV1(diagnosticEngineV2, maps, {
    mathQuestions: mathTotalQuestions,
    hebrewQuestions: hebrewTotalQuestions,
    englishQuestions: englishTotalQuestions,
    scienceQuestions: scienceTotalQuestions,
    historyQuestions: historyTotalQuestions,
    geometryQuestions: geometryTotalQuestions,
    moledetGeographyQuestions: moledetGeographyTotalQuestions,
    mathAccuracy,
    hebrewAccuracy,
    englishAccuracy,
    scienceAccuracy,
    historyAccuracy,
    geometryAccuracy,
    moledetGeographyAccuracy,
    totalQuestions,
  });

  enrichDiagnosticEngineV2WithProfessionalEngineV1(
    diagnosticEngineV2,
    maps,
    {
      mathQuestions: mathTotalQuestions,
      hebrewQuestions: hebrewTotalQuestions,
      englishQuestions: englishTotalQuestions,
      scienceQuestions: scienceTotalQuestions,
      geometryQuestions: geometryTotalQuestions,
      moledetGeographyQuestions: moledetGeographyTotalQuestions,
      mathAccuracy,
      hebrewAccuracy,
      englishAccuracy,
      scienceAccuracy,
      geometryAccuracy,
      moledetGeographyAccuracy,
      totalQuestions,
    },
    {
      rawMistakesBySubject,
      startMs,
      endMs,
      studentGradeKey: null,
    }
  );

  if (Array.isArray(diagnosticEngineV2?.units)) {
    for (const u of diagnosticEngineV2.units) {
      if (!u || typeof u !== "object") continue;
      const sid = String(u.subjectId || "");
      const trk = String(u.topicRowKey || "");
      const row = maps[sid]?.[trk];
      const mistakes = filterMistakesForRow(
        sid,
        trk,
        row,
        rawMistakesBySubject[sid],
        startMs,
        endMs
      );
      const iv1 = buildWeaknessConfidencePatternsV1({
        row: row && typeof row === "object" ? row : {},
        mistakes,
        unit: u,
      });
      u.intelligenceV1 = iv1;
      if (row && typeof row === "object") {
        row.intelligenceV1 = iv1;
      }
    }
  }

  attachFastDiagnosisToDiagnosticEngineV2({
    diagnosticEngineV2,
    rawMistakesBySubject,
    maps,
    startMs,
    endMs,
  });

  const diagnosticEngineV3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs,
    endMs,
    probeEvidence: null,
    diagnosticEngineV2,
  });

  applyLearningPatternDecisionToUnitsAndRows({
    diagnosticEngineV2,
    maps,
    diagnosticEngineV3,
    rawMistakesBySubject,
    startMs,
    endMs,
  });
  syncRowFlagsFromLearningPatternDecision(maps);

  const lpdRollups = buildTopicRollupsFromLearningPatternDecision(
    maps,
    V2_SUBJECT_LABEL_HE,
    (subjectId, row) => {
      const bk = String(row?.bucketKey || "");
      switch (subjectId) {
        case "math":
          return String(row.displayName || getMathReportBucketDisplayName(bk));
        case "geometry":
          return String(row.displayName || getTopicName(bk));
        case "english":
          return String(row.displayName || getEnglishTopicName(bk));
        case "science":
          return String(row.displayName || getScienceTopicName(bk));
        case "history":
          return String(row.displayName || getHistoryTopicName(bk));
        case "hebrew":
          return String(row.displayName || getHebrewTopicName(bk));
        case "moledet-geography":
          return String(row.displayName || getMoledetGeographyTopicName(bk));
        default:
          return String(row.displayName || bk || "נושא");
      }
    },
  );
  needsPractice.length = 0;
  needsPractice.push(...lpdRollups.needsPractice);
  excellent.length = 0;
  excellent.push(...lpdRollups.excellent);

  /** Best-effort only: failures must not break the parent report (V2 remains primary). */
  const hybridRuntime = safeBuildHybridRuntimeForReport({
    diagnosticEngineV2,
    maps,
    rawMistakesBySubject,
    startMs,
    endMs,
  });

  const dataIntegrityReport = validateParentReportDataIntegrity({
    trackingSnapshots,
    rawMistakesBySubject,
    maps,
    dailyActivity,
    startMs,
    endMs,
  });

  const legacyPatternDiagnostics = analyzeLearningPatterns(
    {
      mathOperations,
      geometryTopics,
      englishTopics,
      scienceTopics,
      historyTopics,
      historySubtopics,
      hebrewTopics,
      moledetGeographyTopics,
    },
    rawMistakesBySubject
  );
  const hasV2Units = Array.isArray(diagnosticEngineV2?.units) && diagnosticEngineV2.units.length > 0;
  const subjectQuestionCounts = {
    math: mathTotalQuestions,
    geometry: geometryTotalQuestions,
    english: englishTotalQuestions,
    science: scienceTotalQuestions,
    history: historyTotalQuestions,
    hebrew: hebrewTotalQuestions,
    "moledet-geography": moledetGeographyTotalQuestions,
  };
  const subjectAccuracyById = {
    math: mathAccuracy,
    geometry: geometryAccuracy,
    english: englishAccuracy,
    science: scienceAccuracy,
    history: historyAccuracy,
    hebrew: hebrewAccuracy,
    "moledet-geography": moledetGeographyAccuracy,
  };
  const registeredGradeKey = registeredGradeKeyFromReportMaps(maps);
  const patternDiagnostics = hasV2Units
    ? buildPatternDiagnosticsFromV2(
        diagnosticEngineV2,
        maps,
        subjectQuestionCounts,
        subjectAccuracyById,
        totalQuestions,
        registeredGradeKey,
      )
    : legacyPatternDiagnostics;

  const evidenceCoverage = buildSubjectEvidenceCoverageLines(subjectQuestionCounts, V2_SUBJECT_LABEL_HE);
  const practicedSubjectsSummaryHe = practicedSubjectsSummaryLineHe(
    subjectQuestionCounts,
    V2_SUBJECT_LABEL_HE,
  );

  const fallbackDiagnosticOverviewHe = {
    strongestAreaLineHe: filterInsightLinesForUnpracticedSubjects(
      [excellent[0]].filter(Boolean),
      subjectQuestionCounts,
      V2_SUBJECT_LABEL_HE,
    )[0] || null,
    mainFocusAreaLineHe: filterInsightLinesForUnpracticedSubjects(
      [needsPractice[0]].filter(Boolean),
      subjectQuestionCounts,
      V2_SUBJECT_LABEL_HE,
    )[0] || null,
    readyForProgressPreviewHe: filterInsightLinesForUnpracticedSubjects(
      excellent.filter(Boolean).slice(1, 4),
      subjectQuestionCounts,
      V2_SUBJECT_LABEL_HE,
    ),
    requiresAttentionPreviewHe: filterInsightLinesForUnpracticedSubjects(
      needsPractice.slice(0, 5),
      subjectQuestionCounts,
      V2_SUBJECT_LABEL_HE,
    ),
    insufficientDataSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    notPracticedSubjectsHe: [],
    thinEvidenceSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
    practicedSubjectsSummaryHe,
  };

  const diagnosticOverviewHe = hasV2Units
    ? buildDiagnosticOverviewHeV2({
        diagnosticEngineV2,
        patternDiagnostics,
        maps,
        registeredGradeKey,
        subjectQuestionCounts,
        fallbackOverview: fallbackDiagnosticOverviewHe,
        insufficientDataSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
        thinEvidenceSubjectsHe: evidenceCoverage.thinEvidenceSubjectsHe,
        practicedSubjectsSummaryHe,
      })
    : fallbackDiagnosticOverviewHe;

  let mixedGradePractice = false;
  const gradeRelationsSeen = new Set();
  for (const map of Object.values(maps)) {
    for (const row of Object.values(map || {})) {
      const rel = String(row?.gradeRelation || "").trim();
      if (rel) gradeRelationsSeen.add(rel);
      if (rel === "lower" || rel === "higher") mixedGradePractice = true;
    }
  }
  const mixedGradePracticeNoteHe = mixedGradePractice
    ? "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד."
    : null;

  const weakSubjectIds = new Set();
  for (const row of collectTopicEngineRowsFromReport({
    mathOperations: maps.mathOperations,
    geometryTopics: maps.geometryTopics,
    englishTopics: maps.englishTopics,
    scienceTopics: maps.scienceTopics,
    historyTopics: maps.historyTopics,
    historySubtopics: maps.historySubtopics,
    hebrewTopics: maps.hebrewTopics,
    moledetGeographyTopics: maps.moledetGeographyTopics,
  })) {
    if (!isCoreParentReportRow(row, registeredGradeKey)) continue;
    const acc = Number(row.accuracy) || 0;
    const q = Number(row.questions) || 0;
    if (q >= 3 && acc < 60) weakSubjectIds.add(String(row.subjectId || ""));
  }

  const rawMetricStrengthsHe = deriveRawMetricStrengthLinesHe(
    {
      totalQuestions,
      englishQuestions: englishTotalQuestions,
      englishAccuracy,
      hebrewQuestions: hebrewTotalQuestions,
      hebrewAccuracy,
      scienceQuestions: scienceTotalQuestions,
      scienceAccuracy,
      historyQuestions: historyTotalQuestions,
      historyAccuracy,
      mathQuestions: mathTotalQuestions,
      mathAccuracy,
      geometryQuestions: geometryTotalQuestions,
      geometryAccuracy,
      moledetGeographyQuestions: moledetGeographyTotalQuestions,
      moledetGeographyAccuracy,
    },
    null,
    weakSubjectIds,
  );

  hardenBaseReportWithRowIdentity({
    registeredGradeKey,
    mathOperations,
    geometryTopics,
    englishTopics,
    scienceTopics,
    historyTopics,
    hebrewTopics,
    moledetGeographyTopics,
  });

  return {
    playerName,
    reportVersion: 2,
    period: period === "custom" ? "custom" : period,
    startDate: startDateCalendar ?? startDate.toISOString().split("T")[0],
    endDate: endDateCalendar ?? endDate.toISOString().split("T")[0],
    generatedAt: now.toISOString(),
    registeredGradeKey,
    gradePracticeMeta: {
      registeredGradeKey,
      mixedGradePractice,
      mixedGradePracticeNoteHe,
      gradeRelationsSeen: [...gradeRelationsSeen],
    },
    summary: {
      totalTimeMinutes,
      totalTimeHours: (totalTimeMinutes / 60).toFixed(2),
      totalQuestions,
      totalCorrect,
      overallAccuracy,
      mathQuestions: mathTotalQuestions,
      mathCorrect: mathTotalCorrect,
      mathAccuracy,
      geometryQuestions: geometryTotalQuestions,
      geometryCorrect: geometryTotalCorrect,
      geometryAccuracy,
      englishQuestions: englishTotalQuestions,
      englishCorrect: englishTotalCorrect,
      englishAccuracy,
      scienceQuestions: scienceTotalQuestions,
      scienceCorrect: scienceTotalCorrect,
      scienceAccuracy,
      historyQuestions: historyTotalQuestions,
      historyCorrect: historyTotalCorrect,
      historyAccuracy,
      hebrewQuestions: hebrewTotalQuestions,
      hebrewCorrect: hebrewTotalCorrect,
      hebrewAccuracy,
      moledetGeographyQuestions: moledetGeographyTotalQuestions,
      moledetGeographyCorrect: moledetGeographyTotalCorrect,
      moledetGeographyAccuracy,
      stars,
      playerLevel,
      xp,
      achievements: achievements.length,
      diagnosticOverviewHe,
      /** Phase 1: strengths from raw per-subject volume/accuracy (for short + contract strip). */
      rawMetricStrengthsHe,
    },
    /** Phase 1: same lines at top-level for short-page UI without digging into summary. */
    rawMetricStrengthsHe,
    mathOperations,
    geometryTopics,
    englishTopics,
    scienceTopics,
    historyTopics,
    historySubtopics,
    hebrewTopics,
    moledetGeographyTopics,
    allItems,
    dailyActivity,
    analysis: {
      needsPractice,
      excellent,
      mathMistakesByOperation,
      geometryMistakesByTopic,
      englishMistakesByTopic,
      scienceMistakesByTopic,
      historyMistakesByTopic,
      historyMistakesBySubtopic,
      hebrewMistakesByTopic,
      moledetGeographyMistakesByTopic,
      recommendations,
    },
    challenges: {
      daily: {
        questions: dailyChallenge.questions || 0,
        correct: dailyChallenge.correct || 0,
        bestScore: dailyChallenge.bestScore || 0,
      },
      weekly: {
        current: weeklyChallenge.current || 0,
        target: weeklyChallenge.target || 100,
        completed: weeklyChallenge.completed || false,
      },
      bySubject: {
        math: {
          questions: dailyChallenge.questions || 0,
          correct: dailyChallenge.correct || 0,
          bestScore: dailyChallenge.bestScore || 0,
        },
      },
    },
    achievements: achievements.map((name) => ({ name, earned: true })),
    /** Data-driven diagnostics for UI authority (V2 primary, legacy fallback only). */
    patternDiagnostics,
    legacyPatternDiagnostics,
    diagnosticPrimarySource: hasV2Units
      ? "diagnosticEngineV2"
      : "legacy_patternDiagnostics_fallback",
    /** שלמות נתונים — לבדיקה; לא מוצג ב UI בשלב 1 */
    dataIntegrityReport,
    /** מנוע אבחון V2 — פלט מובנה לפי stage1 blueprint (שכבות נפרדות, שערים, טקסונומיה) */
    diagnosticEngineV2: sanitizeDiagnosticEngineV2ForParentFacing(diagnosticEngineV2),
    /** DE3 — internal subskill/error/probe layer; does not override DE2 parent copy. */
    diagnosticEngineV3,
    /** AI-hybrid layer (V2 remains hard authority; ranking/probe/explanation bounded). */
    hybridRuntime,
    /** Phase 1 additive trace metadata only (no decisioning/wording behavior change). */
    contractsV1: {
      version: EVIDENCE_CONTRACT_VERSION,
      scope: "evidence-only",
      traceAttached: contractsV1TraceEnabled,
      enabled: contractsV1TraceEnabled,
      validationMode: "soft",
    },
    systemIntelligence: {
      globalScore: systemIntelligenceLayer?.globalScore ?? { score: 0, level: "unknown" },
    },
    /** Session-local active diagnosis snapshot when available (additive; no UI). */
    activeDiagnosisSessionSummary: getActiveDiagnosisSessionSummaryForReport(),
    /** Internal — DE3 re-run / server probe merge (not parent-facing). */
    _internalRawMistakesBySubject: rawMistakesBySubject,
    _reportStartMs: startMs,
    _reportEndMs: endMs,
  };
}
