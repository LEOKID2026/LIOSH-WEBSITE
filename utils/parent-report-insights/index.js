/**
 * Parent Report Insight Packet builder (entry).
 *
 * `buildParentReportInsightPacket({ aggregate, v2Report, detailedPayload, options })` produces a
 * deterministic, AI-safe projection of the deterministic parent report inputs. It does NOT call
 * `Date.now()` or any RNG; the caller injects `options.now` (ISO-8601 string) for `generatedAt`.
 *
 * Determinism contract (binding):
 *  - same input ⇒ byte-stable packet (excluding `generatedAt` which is caller-injected)
 *  - all arrays sorted by stable keys
 *  - object-literal emission (no `for...in` over input maps for output shape)
 *
 * Privacy contract (binding):
 *  - never carries raw `prompt` / `expectedAnswer` / `userAnswer` / `clientMeta` / DB ids
 *  - raw English topic keys appear ONLY inside `sourceId` strings
 *
 * The companion `buildAiNarrativeInput(packet)` produces the strict projection that the LLM sees.
 */

import { classifyDataConfidence, INSIGHT_DATA_CONFIDENCE_THRESHOLDS } from "./derive-data-confidence.js";
import { resolveRegisteredGradeKeyFromAggregate } from "../parent-report-core-grade-filter.js";
import { deriveFluencySignals } from "./derive-fluency-signals.js";
import { deriveMistakePatterns } from "./derive-mistake-patterns.js";
import { deriveTrendSignals } from "./derive-trend-signals.js";
import {
  deriveTopicInsights,
  deriveSubjectInsights,
  pickStrengths,
  pickFocusAreas,
} from "./derive-topic-insights.js";
import { getSubjectDisplayNameHe } from "./normalize-parent-facing-labels.js";
import { INSIGHT_PACKET_VERSION } from "./insight-packet-schema.js";
import {
  buildAiNarrativeInput,
  aiNarrativeInputSizeChars,
  isAiNarrativeInputWithinBudget,
  MAX_PROMPT_INPUT_CHARS,
} from "./build-ai-narrative-input.js";

const ALLOWED_RANGE_LABELS = new Set(["week", "month", "custom"]);

function safeNumber(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function normalizeNowOption(now) {
  if (now == null) return "";
  if (now instanceof Date) {
    const t = now.getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : "";
  }
  if (typeof now === "string") {
    const trimmed = now.trim();
    if (!trimmed) return "";
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : trimmed;
  }
  if (typeof now === "number" && Number.isFinite(now)) return new Date(now).toISOString();
  return "";
}

function computeRangeMeta(aggregateRange, options) {
  const from = aggregateRange?.from ? String(aggregateRange.from).slice(0, 10) : "";
  const to = aggregateRange?.to ? String(aggregateRange.to).slice(0, 10) : "";
  const label =
    typeof options?.rangeLabel === "string" && ALLOWED_RANGE_LABELS.has(options.rangeLabel)
      ? options.rangeLabel
      : "custom";
  let totalDays = 0;
  if (from && to) {
    const f = new Date(`${from}T00:00:00.000Z`);
    const t = new Date(`${to}T00:00:00.000Z`);
    if (Number.isFinite(f.getTime()) && Number.isFinite(t.getTime())) {
      totalDays = Math.max(1, Math.round((t - f) / 86_400_000) + 1);
    }
  }
  return { from, to, label, totalDays };
}

function buildOverallSection(aggregate) {
  const summary = aggregate?.summary && typeof aggregate.summary === "object" ? aggregate.summary : {};
  const totalQuestions = Math.max(0, Math.round(safeNumber(summary.totalAnswers)));
  const correctQuestions = Math.max(0, Math.round(safeNumber(summary.correctAnswers)));
  const accuracyPct = Number(safeNumber(summary.accuracy).toFixed(2));
  const totalTimeMinutes = Math.round(safeNumber(summary.totalDurationSeconds) / 60);
  return {
    totalSessions: Math.max(0, Math.round(safeNumber(summary.totalSessions))),
    totalQuestions,
    correctQuestions,
    accuracyPct: Math.max(0, Math.min(100, accuracyPct)),
    totalTimeMinutes,
    avgTimePerQuestionSec:
      typeof summary.avgTimePerQuestionSec === "number" && Number.isFinite(summary.avgTimePerQuestionSec)
        ? Number(summary.avgTimePerQuestionSec.toFixed(2))
        : null,
    avgHintsPerQuestion:
      typeof summary.avgHintsPerQuestion === "number" && Number.isFinite(summary.avgHintsPerQuestion)
        ? Number(summary.avgHintsPerQuestion.toFixed(2))
        : null,
    dataConfidence: classifyDataConfidence(totalQuestions),
    modeCounts: summary.modeCounts && typeof summary.modeCounts === "object" ? { ...summary.modeCounts } : {},
    levelCounts:
      summary.levelCounts && typeof summary.levelCounts === "object" ? { ...summary.levelCounts } : {},
    normalizedGradeLevel: typeof summary.normalizedGradeLevel === "string" ? summary.normalizedGradeLevel : "unknown",
  };
}

function buildThinDataWarnings(overall, subjectInsights) {
  const out = [];
  if (overall.dataConfidence === "thin") {
    out.push({
      scope: "overall",
      displayNameHe: "סך הכול",
      questionCount: overall.totalQuestions,
    });
  }
  for (const s of subjectInsights) {
    if (s.dataConfidence === "thin" && s.totalQuestions > 0) {
      out.push({
        scope: "subject",
        displayNameHe: s.displayNameHe,
        questionCount: s.totalQuestions,
      });
    }
  }
  return out;
}

function buildLimitations(overall, subjectInsights) {
  const out = [];
  if (overall.totalQuestions === 0) {
    out.push("אין מספיק נתונים בתקופה הזאת ליצירת תובנה משמעותית.");
    return out;
  }
  if (overall.dataConfidence === "thin") {
    out.push("נתוני התרגול בתקופה דלים - הניסוח נשמר זהיר ומאוזן.");
  } else if (overall.dataConfidence === "low") {
    out.push("הנתונים בתקופה עדיין מצומצמים - כדאי לחזור ולעקוב לאחר תרגול נוסף.");
  }
  const thinSubjects = subjectInsights.filter((s) => s.dataConfidence === "thin");
  if (thinSubjects.length > 0 && thinSubjects.length <= 3) {
    out.push(`במקצועות הבאים יש מעט תרגול בתקופה: ${thinSubjects.map((s) => s.displayNameHe).join(", ")}.`);
  }
  return out;
}

function buildDeterministicRecommendationsHe(strengths, focusAreas, mistakePatterns, overall) {
  const out = [];
  if (focusAreas.length > 0) {
    out.push(`מומלץ לתרגל בעדינות בבית את התחומים שכדאי לחזק: ${focusAreas.map((f) => f.displayNameHe).join(", ")}.`);
  }
  if (strengths.length > 0) {
    out.push(`כדאי להמשיך לעודד את התחומים שבהם התרגול נראה יציב: ${strengths.map((s) => s.displayNameHe).join(", ")}.`);
  }
  if (mistakePatterns.length > 0) {
    const top = mistakePatterns[0];
    if (top && top.topicDisplayHe) {
      out.push(`שמנו לב שטעויות חוזרות מופיעות בנושא ${top.topicDisplayHe} - שווה לשחזר אותו ביחד.`);
    }
  }
  if (overall.totalQuestions > 0 && overall.totalQuestions < 12) {
    out.push("מומלץ להמשיך לאסוף נתונים לאורך זמן לפני הסקת מסקנות חזקות.");
  }
  if (out.length === 0) {
    out.push("לא נמצאו המלצות אוטומטיות חזקות בתקופה זו - כדאי להמשיך עם שגרת תרגול רגילה.");
  }
  return out;
}

function buildAvailableSourceIdLists(strengths, focusAreas) {
  const availableStrengthSourceIds = strengths.map((s) => s.sourceId).filter(Boolean).sort();
  const availableFocusSourceIds = focusAreas.map((f) => f.sourceId).filter(Boolean).sort();
  return { availableStrengthSourceIds, availableFocusSourceIds };
}

function buildStudentSection(aggregate, options) {
  const studentAgg = aggregate?.student && typeof aggregate.student === "object" ? aggregate.student : {};
  const summary = aggregate?.summary && typeof aggregate.summary === "object" ? aggregate.summary : {};
  const explicitName =
    typeof options?.studentDisplayName === "string" && options.studentDisplayName.trim()
      ? options.studentDisplayName.trim()
      : "";
  const aggName = typeof studentAgg.full_name === "string" ? studentAgg.full_name.trim() : "";
  const registeredGradeLevel = resolveRegisteredGradeKeyFromAggregate(aggregate);
  return {
    displayName: explicitName || aggName || "",
    gradeLevel:
      typeof summary.normalizedGradeLevel === "string" && summary.normalizedGradeLevel
        ? summary.normalizedGradeLevel
        : registeredGradeLevel || "unknown",
    registeredGradeLevel: registeredGradeLevel || null,
  };
}

/**
 * @typedef {object} BuildPacketArgs
 * @property {object} aggregate - output of `aggregateParentReportPayload` (extended)
 * @property {object} [v2Report] - output of `generateParentReportV2`
 * @property {object} [detailedPayload] — optional detailed payload (unused today, reserved)
 * @property {object} [options]
 * @property {string|Date|number} [options.now] - caller-injected timestamp for `generatedAt` (binding)
 * @property {string} [options.studentDisplayName] — caller-supplied display name override
 * @property {"week"|"month"|"custom"} [options.rangeLabel]
 * @property {boolean} [options.preferDeterministic] — annotated in sourceMetadata
 */

export function buildParentReportInsightPacket(args, options = {}) {
  const { aggregate, v2Report } = args || {};
  if (!aggregate || typeof aggregate !== "object") {
    return {
      version: INSIGHT_PACKET_VERSION,
      generatedAt: normalizeNowOption(options?.now),
      ok: false,
      reason: "missing_aggregate",
    };
  }

  const generatedAt = normalizeNowOption(options?.now);
  const overall = buildOverallSection(aggregate);
  const range = computeRangeMeta(aggregate?.range, options);
  const fluencySignals = deriveFluencySignals(aggregate);
  const trendSignals = deriveTrendSignals(aggregate, v2Report);
  const subjectInsights = deriveSubjectInsights(aggregate, trendSignals.subjectTrends);
  const topicInsights = deriveTopicInsights(aggregate);
  const mistakePatterns = deriveMistakePatterns(aggregate);
  const strengths = pickStrengths(topicInsights, subjectInsights);
  const focusAreas = pickFocusAreas(topicInsights, subjectInsights);
  const thinDataWarnings = buildThinDataWarnings(overall, subjectInsights);
  const limitations = buildLimitations(overall, subjectInsights);
  const deterministicRecommendationsHe = buildDeterministicRecommendationsHe(
    strengths,
    focusAreas,
    mistakePatterns,
    overall
  );
  const { availableStrengthSourceIds, availableFocusSourceIds } = buildAvailableSourceIdLists(strengths, focusAreas);

  const subjects = subjectInsights.map((s) => ({
    key: s.key,
    sourceId: s.sourceId,
    displayNameHe: s.displayNameHe,
    totalQuestions: s.totalQuestions,
    accuracyPct: s.accuracyPct,
    totalTimeMinutes: s.totalTimeMinutes,
    avgTimePerQuestionSec: s.avgTimePerQuestionSec,
    avgHintsPerQuestion: s.avgHintsPerQuestion,
    trend: s.trend,
    dataConfidence: s.dataConfidence,
    modeCounts: s.modeCounts,
    levelCounts: s.levelCounts,
    topicHighlights: {
      strengthHe: topicInsights
        .filter((t) => t.subjectKey === s.key && t.isStrength)
        .map((t) => t.displayNameHe)
        .filter(Boolean)
        .slice(0, 3),
      focusHe: topicInsights
        .filter((t) => t.subjectKey === s.key && t.isFocusArea)
        .map((t) => t.displayNameHe)
        .filter(Boolean)
        .slice(0, 3),
    },
  }));

  const gradePracticeBreakdown = topicInsights
    .filter((t) => t.contentGradeLevel)
    .map((t) => ({
      subjectKey: t.subjectKey,
      topicKey: t.key,
      displayNameHe: t.displayNameHe,
      contentGradeLevel: t.contentGradeLevel,
      registeredGradeLevel: t.registeredGradeLevel,
      gradeRelation: t.gradeRelation,
      totalQuestions: t.totalQuestions,
      accuracyPct: t.accuracyPct,
    }));
  const mixedGradePractice = gradePracticeBreakdown.some(
    (row) => row.gradeRelation === "lower" || row.gradeRelation === "higher"
  );

  const topics = topicInsights.map((t) => ({
    key: t.key,
    subjectKey: t.subjectKey,
    sourceId: t.sourceId,
    displayNameHe: t.displayNameHe,
    contentGradeLevel: t.contentGradeLevel,
    registeredGradeLevel: t.registeredGradeLevel,
    gradeRelation: t.gradeRelation,
    gradeDelta: t.gradeDelta,
    totalQuestions: t.totalQuestions,
    accuracyPct: t.accuracyPct,
    avgTimePerQuestionSec: t.avgTimePerQuestionSec,
    avgHintsPerQuestion: t.avgHintsPerQuestion,
    fluency: t.fluency,
    isStrength: t.isStrength,
    isFocusArea: t.isFocusArea,
    dataConfidence: t.dataConfidence,
  }));

  const aggregateVersion =
    aggregate?.meta && typeof aggregate.meta.insightsVersion === "string"
      ? aggregate.meta.insightsVersion
      : aggregate?.meta && typeof aggregate.meta.version === "string"
      ? aggregate.meta.version
      : "unknown";

  return {
    ok: true,
    version: INSIGHT_PACKET_VERSION,
    generatedAt,
    student: buildStudentSection(aggregate, options),
    range,
    overall,
    subjects,
    topics,
    fluencySignals,
    mistakePatterns,
    trendSignals,
    strengths,
    focusAreas,
    availableStrengthSourceIds,
    availableFocusSourceIds,
    deterministicRecommendationsHe,
    thinDataWarnings,
    limitations,
    mixedGradePractice,
    mixedGradePracticeNoteHe: mixedGradePractice
      ? "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד."
      : null,
    gradePracticeBreakdown,
    sourceMetadata: {
      engineVersion: "v2",
      aggregateVersion,
      insightPacketVersion: INSIGHT_PACKET_VERSION,
      preferDeterministic: options?.preferDeterministic === true,
      thresholds: { ...INSIGHT_DATA_CONFIDENCE_THRESHOLDS },
    },
  };
}

export {
  buildAiNarrativeInput,
  aiNarrativeInputSizeChars,
  isAiNarrativeInputWithinBudget,
  MAX_PROMPT_INPUT_CHARS,
  classifyDataConfidence,
  INSIGHT_DATA_CONFIDENCE_THRESHOLDS,
  deriveFluencySignals,
  deriveMistakePatterns,
  deriveTrendSignals,
  deriveTopicInsights,
  deriveSubjectInsights,
  pickStrengths,
  pickFocusAreas,
  getSubjectDisplayNameHe,
  INSIGHT_PACKET_VERSION,
};
export {
  buildInsightPacketFromV2Snapshot,
  synthesizeAggregateFromV2Snapshot,
} from "./build-packet-from-v2-snapshot.js";
