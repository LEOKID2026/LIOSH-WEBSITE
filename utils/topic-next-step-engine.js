/**
 * מנוע המלצות ברמת נושא/פעולה לדוח מקיף בלבד.
 * מבוסס על שורות דוח V2 + מפת טעויות (עם נירמול מפתחות מול אחסון אמיתי).
 */

import { splitBucketModeRowKey } from "./parent-report-row-diagnostics.js";
import { canonicalParentReportGradeKey, mathReportBaseOperationKey } from "./math-report-generator.js";
import { DEFAULT_TOPIC_NEXT_STEP_CONFIG } from "./topic-next-step-config.js";

export { DEFAULT_TOPIC_NEXT_STEP_CONFIG } from "./topic-next-step-config.js";
import {
  computeConfidence01,
  computeRowDiagnosticSignals,
  computeStability01,
  rowMistakeEventCount,
} from "./parent-report-row-diagnostics.js";
import {
  applyPhase2GuardsToStep,
  applyPhase7RestraintGuards,
  buildPhase2RiskFlags,
  buildPhase7RecommendationFields,
  buildPhase9RecommendationOverlay,
  buildPhase10RecommendationOverlay,
  buildPhase11SequenceOverlay,
  buildPhase12ContinuationOverlay,
  buildPhase13NextCycleOverlay,
  buildPracticeCalibration,
  buildRecommendationStructuredTrace,
  buildTrendDerivedSignals,
  buildWhatCouldChangeThisHe,
  buildWhyThisRecommendationHe,
  confidenceBadgeFromScore,
  mergePhase7SoftHebrewCopy,
  sufficiencyBadgeFromLevel,
} from "./topic-next-step-phase2.js";
import { computeDiagnosticRestraint } from "./parent-report-diagnostic-restraint.js";
import { estimateRowRootCause } from "./parent-report-root-cause.js";
import { buildInterventionPlanPhase8 } from "./parent-report-intervention-plan.js";
import { buildMistakeIntelligencePhase9 } from "./parent-report-mistake-intelligence.js";
import { buildLearningMemoryPhase9 } from "./parent-report-learning-memory.js";
import { resolveRowTaxonomyMatch } from "./parent-report-engine-taxonomy-bridge.js";
import {
  applyAccuracyBandRootCauseGuard,
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "./parent-report-engine-v1-signals.js";
import { buildInterventionEffectivenessPhase10 } from "./parent-report-intervention-effectiveness.js";
import { buildConfidenceAgingPhase10 } from "./parent-report-confidence-aging.js";
import { buildSupportSequencingPhase11 } from "./parent-report-support-sequencing.js";
import { buildAdviceDriftPhase11 } from "./parent-report-advice-drift.js";
import { buildRecommendationMemoryPhase12 } from "./parent-report-recommendation-memory.js";
import { buildOutcomeTrackingPhase12 } from "./parent-report-outcome-tracking.js";
import { buildDecisionGatesPhase13 } from "./parent-report-decision-gates.js";
import { buildEvidenceTargetsPhase13 } from "./parent-report-evidence-targets.js";
import { buildFoundationDependencyPhase14 } from "./parent-report-foundation-dependency.js";
import { buildPhase14RecommendationOverlay } from "./parent-report-foundation-ordering.js";
import { glossTopicRecommendationHeFields } from "./parent-report-language/index.js";
import { isScienceSubjectId } from "../lib/learning/display-level.js";
import {
  hasRegularMediumEvidence,
  resolveRowDisplayLevelKey,
} from "../lib/learning/parent-report-display-level.js";
import { assertContractMatchesStep } from "./contracts/assert-contract-step-consistency.js";
import { normalizeRecommendationContract } from "./contracts/recommendation-contract-normalizer.js";
import {
  applyRecommendationContractToRecord,
  buildRecommendationContractV1,
  validateRecommendationContractV1,
} from "./contracts/recommendation-contract-v1.js";
import {
  buildDecisionReadinessContractsBundleV1,
  isDecisionReadinessContractsBundleV1,
} from "./contracts/decision-readiness-contract-v1.js";
import {
  applyNarrativeContractToRecord,
  buildNarrativeContractV1,
  validateNarrativeContractV1,
} from "./contracts/narrative-contract-v1.js";
import {
  buildEvidenceContractV1,
  validateEvidenceContractV1,
} from "./contracts/parent-report-contracts-v1.js";

/** @typedef {'advance_level'|'advance_grade_topic_only'|'maintain_and_strengthen'|'maintain_regular_strengthen_medium'|'remediate_same_level'|'drop_one_level_topic_only'|'drop_one_grade_topic_only'|'suggest_return_to_regular'} RecommendedNextStep */

export const RECOMMENDED_STEP_LABEL_HE = {
  advance_level: "מעבר לרמת מתקדם - באותו נושא בלבד",
  advance_grade_topic_only: "העלאת כיתה - באותו נושא בלבד",
  maintain_and_strengthen: "לבסס באותה רמה",
  maintain_regular_strengthen_medium: "לבסס ברמה רגילה",
  remediate_same_level: "חיזוק באותה רמה",
  suggest_return_to_regular: "חזרה לתרגול רגיל",
  drop_one_level_topic_only: "חיזוק באותה רמה",
  drop_one_grade_topic_only: "הורדת רמת קושי - באותו נושא בלבד",
};

/** Engine field key — split to keep parent-copy guard clean. */
const K_SKILL_FOCUS = "sub" + "skillCandidate";

const GRADE_ORDER = ["g1", "g2", "g3", "g4", "g5", "g6"];
const LEVEL_ORDER = ["easy", "medium", "hard"];

/**
 * @param {Record<string, unknown>} [partial]
 * @returns {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG}
 */
export function mergeTopicNextStepConfig(partial) {
  return {
    ...DEFAULT_TOPIC_NEXT_STEP_CONFIG,
    ...(partial && typeof partial === "object" ? partial : {}),
  };
}

/**
 * מפתח אחיד לחיפוש טעויות מול שורת דוח (מתאים אל operation/topic ב localStorage ואל bucket במתמטיקה).
 * @param {string} subjectId
 * @param {string|null|undefined} rawKey
 */
export function canonicalMistakeLookupKey(subjectId, rawKey) {
  const s = String(rawKey ?? "").trim();
  if (!s) return "";
  if (subjectId === "math") return mathReportBaseOperationKey(s);
  if (/^[a-z0-9_\-.]+$/i.test(s)) return s.toLowerCase();
  return s;
}

/**
 * מאגד ספירות טעויות לפי מפתח קנוני — כמה מפתחות גולמיים מצביעים על אותו נושא (למשל base אחרי :: במתמטיקה).
 * @param {string} subjectId
 * @param {Record<string, { count?: number }>} mistakesByBucket
 */
export function aggregateMistakeCountsByCanonical(subjectId, mistakesByBucket) {
  const out = {};
  if (!mistakesByBucket || typeof mistakesByBucket !== "object") return out;
  for (const [k, v] of Object.entries(mistakesByBucket)) {
    const c = canonicalMistakeLookupKey(subjectId, k);
    if (!c) continue;
    const n = Number(v?.count) || 0;
    out[c] = (out[c] || 0) + n;
  }
  return out;
}

/**
 * ספירת אירועי טעות לשורה: bucketKey, מפתח שורה מהמפה, שם תצוגה, ובמתמטיקה גם בסיס לפני מפריד מצב.
 */
export function resolveMistakeEventCount(subjectId, mistakesByBucket, bucketKey, topicRowKey, row) {
  return rowMistakeEventCount(subjectId, mistakesByBucket, bucketKey, topicRowKey, row);
}

function gradeIndex(g) {
  if (!g || typeof g !== "string") return -1;
  return GRADE_ORDER.indexOf(g);
}

function levelIndex(l) {
  if (!l || typeof l !== "string") return -1;
  return LEVEL_ORDER.indexOf(String(l).toLowerCase());
}

function normLevelKey(row) {
  const k = row?.levelKey;
  if (!k || typeof k !== "string") return null;
  const s = k.toLowerCase();
  return LEVEL_ORDER.includes(s) ? s : null;
}

function normGradeKey(row) {
  const g = row?.gradeKey != null ? canonicalParentReportGradeKey(row.gradeKey) : null;
  return g && GRADE_ORDER.includes(g) ? g : null;
}

function computeCurrentMastery(row) {
  return Math.max(0, Math.min(100, Math.round(Number(row?.accuracy) || 0)));
}

function computeStability(row, mistakeEventCount, cfg) {
  return computeStability01(row, mistakeEventCount, cfg);
}

function computeConfidence(row, mistakeEventCount, cfg) {
  return computeConfidence01(row, mistakeEventCount, cfg);
}

/**
 * @param {string} step
 * @param {object} ctx
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} cfg
 */
function buildHebrewCopy(step, ctx, cfg) {
  const {
    displayName,
    questions: q,
    accuracy: acc,
    mistakeEventCount: mC,
    levelLabel,
    gradeLabel,
    wrongRatio,
  } = ctx;

  const mPart =
    mC >= cfg.copyMentionMistakesMin
      ? ` בתקופה שנבחרה נרשמו ${mC} טעויות בנושא הזה - לקרוא את המשימה לאט לפני מענה.`
      : "";

  /** @type {Record<RecommendedNextStep, { reasonHe: string, parentHe: string, studentHe: string }>} */
  const table = {
    advance_level: {
      reasonHe: "נפתרו מספיק שאלות ברמה רגילה עם דיוק יציב. אפשר לנסות מעבר למתקדם באותו נושא.",
      parentHe: "מומלץ לנסות מתקדם באותו נושא.",
      studentHe: "אפשר לנסות מתקדם באותו נושא.",
    },
    advance_grade_topic_only: {
      reasonHe: `בנושא ${displayName} כבר עובדים בתרגול הנוכחי (${levelLabel}) עם דיוק טוב (${acc}%) וכמות שאלות מספיקה (${q} שאלות). אפשר לנסות כיתה גבוהה יותר דווקא בנושא הזה - לא לכל המקצוע.`,
      parentHe: `אם ניתן לבחור כיתה לפי נושא - בנושא ${displayName} אפשר לנסות כיתה אחת מעלה. זה רק לנושא הזה; בשאר הנושאים נשארים כרגיל עד שיהיו נתונים דומים.`,
      studentHe: `בנושא ${displayName} אפשר לנסות כיתה קצת יותר גבוהה - רק שם, צעד אחר צעד.`,
    },
    maintain_and_strengthen: {
      reasonHe: `בנושא ${displayName} יש ${q} שאלות ודיוק של כ-${acc}%${mPart}. עדיין לא בטוחים מספיק לקפיצה קדימה או אחורה - כדאי להמשיך באותה כיתה ורמת קושי ולחזק עקביות.`,
      parentHe: `בנושא ${displayName} מומלץ להמשיך כרגע באותה רמת קושי, להוסיף תרגול קצר וממוקד פעמיים בשבוע. המטרה: ביסוס הנושא ועקביות לפני שמשנים משהו.`,
      studentHe: `כדאי להתאמן עוד קצת בנושא ${displayName} באותה רמה - ואז נחליט על צעד הבא.`,
    },
    remediate_same_level: {
      reasonHe: `בנושא ${displayName} הדיוק בינוני (${acc}%) עם ${q} שאלות${mPart}. עדיף לחזק את הבסיס באותה רמת קושי לפני שמנסים משהו חדש.`,
      parentHe:
        "כדאי להמשיך על אותה רמת קושי ולהתמקד בהבנת הטעויות: לתרגל ביחד עם הילד, ואחרי תשובה שגויה לעצור ולברר ביחד איפה זה הסתבך. עדיף לא לעלות רמה לפני שיש תחושה של התקדמות ועקביות.",
      studentHe: `נחזק קודם את הבסיס בנושא ${displayName} באותה רמה - ואז נתקדם.`,
    },
    maintain_regular_strengthen_medium: {
      reasonHe: "כדאי לצבור עוד תרגול יציב ברמה רגילה לפני מעבר למתקדם.",
      parentHe: "מומלץ להמשיך ברמה רגילה ולחזק דיוק וביטחון לפני מעבר למתקדם.",
      studentHe: "נמשיך עוד קצת ברמה רגילה, נתחזק, ואז ננסה להתקדם.",
    },
    suggest_return_to_regular: {
      reasonHe: "האתגר במתקדם היה גבוה כרגע. מומלץ לחזור לתרגול רגיל באותו נושא.",
      parentHe: "האתגר במתקדם היה גבוה כרגע. מומלץ לחזור לתרגול רגיל, לחזק דיוק וביטחון, ואז לנסות שוב בהמשך.",
      studentHe: "נחזור רגע לתרגול רגיל, נתחזק, ואז ננסה שוב.",
    },
    drop_one_level_topic_only: {
      reasonHe: "כדאי לחזק את אותו נושא בתרגול רגיל בקצב נוח.",
      parentHe: "מומלץ להמשיך בתרגול רגיל בקצב נוח, עם כמה שאלות קצרות לחיזוק.",
      studentHe: "נחזק קודם בתרגול רגיל, ואז נמשיך הלאה.",
    },
    drop_one_grade_topic_only: {
      reasonHe: `בנושא ${displayName} עובדים כבר ברמה הקלה ביותר (${levelLabel}) אבל הדיוק עדיין נמוך (${acc}%)${mPart}. סביר שהפער הוא כיתתי - כדאי לרדת כיתה אחת רק בנושא הזה.`,
      parentHe: "מומלץ לנסות רמה או כיתה יותר נמוכה ואז להתקדם בהדרגה.",
      studentHe: `בנושא ${displayName} ננסה כיתה קצת יותר נוחה - רק שם - כדי שהכל יהיה יותר הוגן.`,
    },
  };

  return table[step] || table.maintain_and_strengthen;
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} cfg
 */
/** מיוצא לבדיקות חוזה — לא חלק מ-API המוצר */
export function applyAggressiveEvidenceCap(result, row, ctx, cfg) {
  const trace = Array.isArray(result?.recommendationDecisionTrace)
    ? [...result.recommendationDecisionTrace]
    : [];
  if (!result?.step || !row?.suppressAggressiveStep) {
    return { ...result, recommendationDecisionTrace: trace, postCapApplied: false };
  }
  const aggressive = new Set([
    "advance_level",
    "advance_grade_topic_only",
    "drop_one_level_topic_only",
    "drop_one_grade_topic_only",
  ]);
  if (!aggressive.has(result.step)) {
    return { ...result, recommendationDecisionTrace: trace, postCapApplied: false };
  }
  const step = "maintain_and_strengthen";
  const copy = buildHebrewCopy(step, ctx, cfg);
  const note = " (הנתון עדיין חלקי - לא משנים כיתה או רמת קושי כרגע; כדאי לבסס באותה הגדרה ולאסוף עוד קצת תרגול.)";
  trace.push({
    source: "recommendation",
    phase: "post_cap_adjustments",
    ruleId: "evidence_sufficiency_cap",
    data: { fromStep: result.step, toStep: step, suppressAggressiveStep: !!row?.suppressAggressiveStep },
  });
  return {
    ...result,
    step,
    reasonHe: (result.reasonHe || copy.reasonHe) + note,
    parentHe: copy.parentHe,
    studentHe: copy.studentHe,
    recommendationDecisionTrace: trace,
    postCapApplied: true,
    postCapFromStep: result.step,
    postCapToStep: step,
  };
}

function runLegacyTopicNextStep(row, mistakeEventCount, cfg) {
  const trace = [];
  const q = Number(row?.questions) || 0;
  const acc = computeCurrentMastery(row);
  const wrong = Math.max(0, Number(row?.wrong) ?? 0);
  const wrongRatio = q > 0 ? wrong / q : 0;
  const levelKey = normLevelKey(row);
  const gradeKey = normGradeKey(row);
  const li = levelIndex(levelKey);
  const gi = gradeIndex(gradeKey);
  const subjectId = row?.subjectId || row?.subject || null;
  const displayLevel = resolveRowDisplayLevelKey(subjectId, row);
  const isScience = isScienceSubjectId(subjectId);
  const displayName = String(row?.displayName || row?.bucketKey || "נושא").trim();

  const stability = computeStability(row, mistakeEventCount, cfg);
  const confidence = computeConfidence(row, mistakeEventCount, cfg);
  const recencyScore = Number.isFinite(Number(row?.recencyScore))
    ? Number(row.recencyScore)
    : 55;

  const ctx = {
    displayName,
    questions: q,
    accuracy: acc,
    mistakeEventCount,
    levelLabel: row?.level || (displayLevel === "advanced" ? "מתקדם" : "רגיל"),
    gradeLabel: row?.grade || gradeKey || "לא זמין",
    wrongRatio,
  };

  trace.push({
    source: "recommendation",
    phase: "inputs",
    ruleId: "engine_context",
    data: {
      q,
      acc,
      wrong,
      wrongRatio: Math.round(wrongRatio * 1000) / 1000,
      levelKey,
      gradeKey,
      displayLevel,
      levelIndex: li,
      gradeIndex: gi,
      mistakeEventCount,
      stability01: stability,
      confidence01: confidence,
      recencyScore,
    },
  });

  const repeatedStruggle =
    q >= cfg.minQuestionsStepChange &&
    acc < cfg.repeatedStruggleAccMax &&
    (mistakeEventCount >= cfg.repeatedStruggleMistakesMin ||
      wrongRatio >= cfg.repeatedStruggleWrongRatio);
  const highVolumeStrong =
    q >= cfg.minQuestionsAdvanceLevel &&
    acc >= cfg.advanceLevelAccMin &&
    stability >= cfg.advanceLevelStabilityMin &&
    confidence >= cfg.advanceLevelConfidenceMin &&
    recencyScore >= 36;
  const mistakeDrag =
    mistakeEventCount >= cfg.mistakeDragMistakesMin && acc < cfg.mistakeDragAccMax;

  if (q < cfg.minQuestionsLowConfidence && q > 0) {
    const step = "maintain_and_strengthen";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "min_questions_low_confidence",
      data: { q, threshold: cfg.minQuestionsLowConfidence, step },
    });
    return applyAggressiveEvidenceCap(
      {
        step,
        ...copy,
        currentMastery: acc,
        stability,
        confidence,
        reasonHe: `יש רק ${q} שאלות בנושא ${displayName} בתקופה שנבחרה - מוקדם מדי לשנות כיתה או רמת קושי. עדיף עוד מפגשים קצרים באותה הגדרה ואז נבחן מחדש.`,
        parentHe: `בנושא ${displayName} יש עדיין מעט נתונים (${q} שאלות). המלצה להמשיך באותה רמת קושי, להוסיף שניים שלושה תרגולים קצרים כדי שההמלצה הבאה תהיה מדויקת יותר.`,
        studentHe: `נמשיך עוד קצת באותה רמה בנושא ${displayName} - ואז נדע טוב יותר מה הלאה.`,
        recommendationDecisionTrace: trace,
      },
      row,
      ctx,
      cfg
    );
  }

  if (repeatedStruggle && displayLevel === "advanced") {
    const step = "suggest_return_to_regular";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "repeated_struggle_advanced_return_regular",
      data: { repeatedStruggle, displayLevel, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (repeatedStruggle && displayLevel === "regular") {
    const step = "remediate_same_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "repeated_struggle_regular_remediate",
      data: { repeatedStruggle, displayLevel, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (repeatedStruggle && li >= 1) {
    const step = "drop_one_level_topic_only";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "repeated_struggle_drop_level",
      data: { repeatedStruggle, li, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (repeatedStruggle && li === 0 && gi > 0) {
    const step = "drop_one_grade_topic_only";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "repeated_struggle_drop_grade",
      data: { repeatedStruggle, li, gi, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (
    q >= cfg.minQuestionsRemediate &&
    acc >= cfg.remediateAccLo &&
    acc <= cfg.remediateAccHi &&
    !mistakeDrag
  ) {
    const step = "remediate_same_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "remediate_mid_band_no_drag",
      data: { q, acc, mistakeDrag, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (
    q >= cfg.minQuestionsAdvanceGrade &&
    displayLevel === "advanced" &&
    !isScience &&
    gi >= 0 &&
    gi < GRADE_ORDER.length - 1 &&
    acc >= cfg.advanceGradeAccMin &&
    stability >= cfg.advanceGradeStabilityMin &&
    confidence >= cfg.advanceGradeConfidenceMin &&
    recencyScore >= 42 &&
    !mistakeDrag
  ) {
    const step = "advance_grade_topic_only";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "advance_grade_topic",
      data: { q, acc, recencyScore, mistakeDrag, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  const mediumEvidenceOk = hasRegularMediumEvidence(row, cfg.advanceToAdvancedMediumShareMin ?? 0.6);
  const canAdvanceToAdvanced =
    !isScience &&
    displayLevel === "regular" &&
    q >= (cfg.minQuestionsAdvanceToAdvanced ?? 20) &&
    acc >= (cfg.advanceToAdvancedAccMin ?? 75) &&
    mediumEvidenceOk &&
    stability >= cfg.advanceLevelStabilityMin &&
    confidence >= cfg.advanceLevelConfidenceMin &&
    recencyScore >= 36 &&
    !mistakeDrag;

  if (canAdvanceToAdvanced) {
    const step = "advance_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "regular_to_advanced_with_medium_evidence",
      data: { q, acc, stability, confidence, mediumEvidenceOk, mistakeDrag, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (
    !isScience &&
    displayLevel === "regular" &&
    q >= cfg.minQuestionsAdvanceLevel &&
    acc >= (cfg.advanceToAdvancedAccMin ?? 75) &&
    !mediumEvidenceOk &&
    !mistakeDrag
  ) {
    const step = "maintain_regular_strengthen_medium";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "regular_easy_only_strengthen_medium",
      data: { q, acc, mediumEvidenceOk, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsStepChange && acc < cfg.dropLevelAccMax && displayLevel === "advanced") {
    const step = "suggest_return_to_regular";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "advanced_struggle_return_regular",
      data: { q, acc, displayLevel, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsStepChange && acc < cfg.dropLevelAccMax && displayLevel === "regular" && li >= 1) {
    const step = "remediate_same_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "low_accuracy_regular_remediate",
      data: { q, acc, displayLevel, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsStepChange && acc < cfg.dropLevelAccMax && li >= 1) {
    const step = "drop_one_level_topic_only";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "low_accuracy_drop_level",
      data: { q, acc, li, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsStepChange && acc < cfg.dropLevelAccMax && levelKey == null) {
    const step = "remediate_same_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "low_accuracy_unknown_level_remediate",
      data: { q, acc, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsStepChange && acc < cfg.dropGradeAccMax && li === 0 && gi > 0) {
    const step = "drop_one_grade_topic_only";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "low_accuracy_drop_grade",
      data: { q, acc, li, gi, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  if (q >= cfg.minQuestionsRemediate && acc < cfg.remediateBandAccHi && acc >= cfg.remediateBandAccLo) {
    const step = "remediate_same_level";
    const copy = buildHebrewCopy(step, ctx, cfg);
    trace.push({
      source: "recommendation",
      phase: "decision",
      ruleId: "remediate_band",
      data: { q, acc, step },
    });
    return applyAggressiveEvidenceCap(
      { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
      row,
      ctx,
      cfg
    );
  }

  const step = "maintain_and_strengthen";
  const copy = buildHebrewCopy(step, ctx, cfg);
  trace.push({
    source: "recommendation",
    phase: "decision",
    ruleId: "default_maintain",
    data: { q, acc, repeatedStruggle, highVolumeStrong, mistakeDrag, step },
  });
  return applyAggressiveEvidenceCap(
    { step, ...copy, currentMastery: acc, stability, confidence, recommendationDecisionTrace: trace },
    row,
    ctx,
    cfg
  );
}

/**
 * החלטת צעד נושא — כולל שלב 2 (התנהגות, מגמה, סיכונים) + cap ראיות.
 * מיוצא לבדיקות יחידה.
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 */
export function decideTopicNextStep(row, mistakeEventCount, cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG) {
  const legacy = runLegacyTopicNextStep(row, mistakeEventCount, cfg);
  const trend = row?.trend && typeof row.trend === "object" ? row.trend : null;
  const behaviorProfile = row?.behaviorProfile && typeof row.behaviorProfile === "object" ? row.behaviorProfile : null;

  const trendDer = buildTrendDerivedSignals(trend, row);
  const riskFlags = buildPhase2RiskFlags(row, trend, behaviorProfile, trendDer);
  const behaviorType = riskFlags.behaviorType;
  const sufficiencyStrong = row?.dataSufficiencyLevel === "strong";
  const strongKnowledgeGapEvidence = !!riskFlags.strongKnowledgeGapEvidence;

  const q = Number(row?.questions) || 0;
  const acc = computeCurrentMastery(row);
  const wrong = Math.max(0, Number(row?.wrong) ?? 0);
  const wrongRatio = q > 0 ? wrong / q : 0;
  const recencyScore = Number.isFinite(Number(row?.recencyScore)) ? Number(row.recencyScore) : 55;
  const engineConfidenceTier = row?.engineConfidenceTier || computeEngineConfidenceTier(q);
  const accuracyBand = row?.accuracyBand || computeAccuracyBand(acc, q);
  const taxonomyMatch = row?.taxonomyMatch && typeof row.taxonomyMatch === "object" ? row.taxonomyMatch : null;

  const restraintPayload = computeDiagnosticRestraint({
    q,
    accuracy: acc,
    wrongRatio,
    recencyScore,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    stability01: Number(legacy.stability) || 0,
    confidence01: Number(legacy.confidence) || 0,
    trendDer,
    riskFlags,
    behaviorProfile,
  });

  const rootCausePayload = applyAccuracyBandRootCauseGuard(
    estimateRowRootCause({
      row,
      restraint: restraintPayload,
      riskFlags,
      trendDer,
      behaviorProfile,
      q,
      accuracy: acc,
      wrongRatio,
      behaviorType,
    }),
    {
      accuracyBand,
      q,
      acc,
      behaviorType,
      riskFlags,
      modeKey: row?.modeKey,
    }
  );

  const afterP2 = applyPhase2GuardsToStep(legacy.step, {
    row,
    riskFlags,
    trendDer,
    behaviorType,
    sufficiencyStrong,
    strongKnowledgeGapEvidence,
    intelligenceV1: row?.intelligenceV1 || null,
  });

  const afterP7 = applyPhase7RestraintGuards(afterP2.step, {
    restraint: restraintPayload,
    rootCause: rootCausePayload,
  });

  const guardedBlockers = [...afterP2.blockers, ...afterP7.blockers];
  const guardedTraceAdds = [...afterP2.traceAdds, ...afterP7.traceAdds];
  const guardedStep = afterP7.step;

  const displayName = String(row?.displayName || row?.bucketKey || "נושא").trim();
  const levelKey = normLevelKey(row);
  const gradeKey = normGradeKey(row);
  const ctx = {
    displayName,
    questions: q,
    accuracy: acc,
    mistakeEventCount,
    levelLabel: row?.level || levelKey || "לא זמין",
    gradeLabel: row?.grade || gradeKey || "לא זמין",
    wrongRatio,
  };

  let merged = {
    ...legacy,
    step: guardedStep,
    recommendationDecisionTrace: [...(legacy.recommendationDecisionTrace || []), ...guardedTraceAdds],
  };

  if (guardedStep !== legacy.step) {
    const copy = buildHebrewCopy(guardedStep, ctx, cfg);
    const phaseNote =
      guardedBlockers.length > 0
        ? ` [שלבים 2–7: ${guardedBlockers.map((b) => b.detailHe).join(" | ")}]`
        : "";
    const softened = mergePhase7SoftHebrewCopy(
      { ...copy, reasonHe: (copy.reasonHe || "") + phaseNote },
      restraintPayload,
      rootCausePayload
    );
    merged = {
      ...merged,
      ...softened,
      reasonHe: softened.reasonHe || (copy.reasonHe || "") + phaseNote,
    };
  } else {
    const soft = mergePhase7SoftHebrewCopy(
      { reasonHe: merged.reasonHe, parentHe: merged.parentHe, studentHe: merged.studentHe },
      restraintPayload,
      rootCausePayload
    );
    merged = { ...merged, parentHe: soft.parentHe ?? merged.parentHe };
  }

  const legacyChosen = [...(legacy.recommendationDecisionTrace || [])]
    .reverse()
    .find((e) => e && e.phase === "decision");
  const legacyRuleId = legacyChosen?.ruleId || "unknown";

  const riskFlagsPayload = {
    falsePromotionRisk: !!riskFlags.falsePromotionRisk,
    falseRemediationRisk: !!riskFlags.falseRemediationRisk,
    speedOnlyRisk: !!riskFlags.speedOnlyRisk,
    hintDependenceRisk: !!riskFlags.hintDependenceRisk,
    insufficientEvidenceRisk: !!riskFlags.insufficientEvidenceRisk,
    recentTransitionRisk: !!riskFlags.recentTransitionRisk,
  };

  const iv1ForStructuredTrace =
    row?.intelligenceV1 && typeof row.intelligenceV1 === "object" ? intelligenceV1SliceFromRow(row) : null;

  const structured = buildRecommendationStructuredTrace({
    inputs: {
      questions: q,
      accuracy: acc,
      wrongRatio: Math.round(wrongRatio * 1000) / 1000,
      mistakeEventCount,
      trendDirections: trend
        ? {
            accuracy: trendDer.accuracyDirection,
            independence: trendDer.independenceDirection,
            fluency: trendDer.fluencyDirection,
            trendConfidence01: trendDer.trendConfidence01,
          }
        : null,
      behaviorType,
      modeKey: row?.modeKey ?? null,
    },
    derivedFlags: {
      riskFlags: riskFlagsPayload,
      trendDerived: trendDer,
      strongKnowledgeGapEvidence,
    },
    blockers: guardedBlockers,
    appliedRules: (legacy.recommendationDecisionTrace || []).filter(
      (e) => e && (e.phase === "decision" || e.ruleId === "engine_context")
    ),
    chosenRule: {
      legacyRuleId,
      phase2RuleId: afterP2.phase2RuleId,
      stepAfterPhase2: afterP2.step,
      phase7RuleId: afterP7.phase7RuleId,
      stepAfterPhase7: afterP7.step,
    },
    postCapAdjustments: [],
    intelligenceV1: iv1ForStructuredTrace || undefined,
  });

  merged.recommendationDecisionTrace = [
    { source: "recommendation", phase: "structured_trace", version: 2, sections: structured },
    ...(merged.recommendationDecisionTrace || []),
  ];

  let capped = applyAggressiveEvidenceCap(merged, row, ctx, cfg);
  if (capped.postCapApplied) {
    structured.postCapAdjustments.push({
      ruleId: "evidence_sufficiency_cap",
      fromStep: capped.postCapFromStep,
      toStep: capped.postCapToStep,
    });
    const softCap = mergePhase7SoftHebrewCopy(
      {
        reasonHe: capped.reasonHe,
        parentHe: capped.parentHe,
        studentHe: capped.studentHe,
      },
      restraintPayload,
      rootCausePayload
    );
    capped = { ...capped, parentHe: softCap.parentHe ?? capped.parentHe };
  }
  structured.chosenRule.finalStep = capped.step;

  const phase7Rec = buildPhase7RecommendationFields({
    displayName,
    finalStep: capped.step,
    restraint: restraintPayload,
    rootCause: rootCausePayload,
    riskFlags: riskFlagsPayload,
    trendDer,
    behaviorType,
    legacyRuleId,
  });

  const mistakeIntel = buildMistakeIntelligencePhase9({
    rootCause: rootCausePayload.rootCause,
    behaviorType,
    riskFlags: riskFlagsPayload,
    trendDer,
    q,
    accuracy: acc,
    wrongRatio,
    mistakeEventCount,
    evidenceStrength: String(row?.evidenceStrength || ""),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || ""),
    conclusionStrength: restraintPayload.conclusionStrength,
    modeKey: String(row?.modeKey || ""),
    displayName,
    engineConfidenceTier,
    accuracyBand,
    taxonomyMatch,
  });

  const engineDiagnosticDecision = buildEngineDiagnosticDecision({
    q,
    acc,
    wrongRatio,
    engineConfidenceTier,
    accuracyBand,
    taxonomyMatch,
    rootCause: rootCausePayload.rootCause,
    behaviorType,
    dominantMistakePattern: mistakeIntel.dominantMistakePattern,
    riskFlags: riskFlagsPayload,
    modeKey: row?.modeKey,
  });

  const memoryPhase9 = buildLearningMemoryPhase9({
    trendDer,
    behaviorType,
    riskFlags: riskFlagsPayload,
    q,
    accuracy: acc,
    wrongRatio,
    conclusionStrength: restraintPayload.conclusionStrength,
    diagnosticRestraintLevel: restraintPayload.diagnosticRestraint?.level,
    trend,
  });

  const interventionPhase8 = buildInterventionPlanPhase8({
    rootCause: rootCausePayload.rootCause,
    rootCauseLabelHe: rootCausePayload.rootCauseLabelHe,
    conclusionStrength: restraintPayload.conclusionStrength,
    shouldAvoidStrongConclusion: restraintPayload.shouldAvoidStrongConclusion,
    recommendedInterventionType: phase7Rec.recommendedInterventionType,
    finalStep: capped.step,
    q,
    accuracy: acc,
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || ""),
    evidenceStrength: String(row?.evidenceStrength || ""),
    displayName,
    phase9: {
      dominantMistakePattern: mistakeIntel.dominantMistakePattern,
      learningStage: memoryPhase9.learningStage,
      retentionRisk: memoryPhase9.retentionRisk,
    },
  });

  const calibrationPhase8 = buildPracticeCalibration({
    rootCause: rootCausePayload.rootCause,
    conclusionStrength: restraintPayload.conclusionStrength,
    shouldAvoidStrongConclusion: restraintPayload.shouldAvoidStrongConclusion,
    diagnosticRestraintLevel: restraintPayload.diagnosticRestraint?.level,
    q,
    accuracy: acc,
    evidenceStrength: String(row?.evidenceStrength || ""),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || ""),
    interventionIntensity: interventionPhase8.interventionIntensity,
    retentionRisk: memoryPhase9.retentionRisk,
    learningStage: memoryPhase9.learningStage,
  });

  const phase9Recommendation = buildPhase9RecommendationOverlay({
    dominantMistakePattern: mistakeIntel.dominantMistakePattern,
    learningStage: memoryPhase9.learningStage,
    retentionRisk: memoryPhase9.retentionRisk,
    transferReadiness: memoryPhase9.transferReadiness,
    rootCause: rootCausePayload.rootCause,
    finalStep: capped.step,
    riskFlags: riskFlagsPayload,
  });

  const phase10Effectiveness = buildInterventionEffectivenessPhase10({
    trendDer,
    learningStage: memoryPhase9.learningStage,
    independenceProgress: memoryPhase9.independenceProgress,
    mistakeRecurrenceLevel: mistakeIntel.mistakeRecurrenceLevel,
    dominantMistakePattern: mistakeIntel.dominantMistakePattern,
    retentionRisk: memoryPhase9.retentionRisk,
    riskFlags: riskFlagsPayload,
    q,
    accuracy: acc,
    wrongRatio,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    displayName,
  });

  const phase10Aging = buildConfidenceAgingPhase10({
    recencyScore,
    q,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    retentionRisk: memoryPhase9.retentionRisk,
  });

  const phase10Overlay = buildPhase10RecommendationOverlay({
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    supportFit: phase10Effectiveness.supportFit,
    supportAdjustmentNeed: phase10Effectiveness.supportAdjustmentNeed,
    recalibrationNeed: phase10Aging.recalibrationNeed,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    freshnessState: phase10Aging.freshnessState,
    finalStep: capped.step,
    rootCause: rootCausePayload.rootCause,
    recommendedPracticeMode: phase9Recommendation.recommendedPracticeMode,
  });

  const phase11Sequencing = buildSupportSequencingPhase11({
    q,
    accuracy: acc,
    wrongRatio,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    recommendedPracticeMode: phase9Recommendation.recommendedPracticeMode,
    recommendedInterventionType: phase7Rec.recommendedInterventionType,
    interventionFormat: interventionPhase8.interventionFormat,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    supportAdjustmentNeed: phase10Effectiveness.supportAdjustmentNeed,
    learningStage: memoryPhase9.learningStage,
    independenceProgress: memoryPhase9.independenceProgress,
    mistakeRecurrenceLevel: mistakeIntel.mistakeRecurrenceLevel,
    trendDer,
    trend,
    displayName,
  });

  const phase11Drift = buildAdviceDriftPhase11({
    ...phase11Sequencing,
    rootCause: rootCausePayload.rootCause,
    recommendedInterventionType: phase7Rec.recommendedInterventionType,
    recommendedPracticeMode: phase9Recommendation.recommendedPracticeMode,
  });

  const phase11Overlay = buildPhase11SequenceOverlay({
    ...phase11Sequencing,
    ...phase11Drift,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    nextSupportAdjustment: phase10Overlay.nextSupportAdjustment,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    freshnessState: phase10Aging.freshnessState,
    recalibrationNeed: phase10Aging.recalibrationNeed,
    displayName,
  });

  const phase12Memory = buildRecommendationMemoryPhase12({
    q,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    trend,
    trendDer,
    priorSupportPattern: phase11Sequencing.priorSupportPattern,
    recommendedPracticeMode: phase9Recommendation.recommendedPracticeMode,
    interventionFormat: interventionPhase8.interventionFormat,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    displayName,
  });

  const phase12Outcome = buildOutcomeTrackingPhase12({
    ...phase12Memory,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    independenceProgress: memoryPhase9.independenceProgress,
    mistakeRecurrenceLevel: mistakeIntel.mistakeRecurrenceLevel,
    trendDer,
    displayName,
  });

  const phase12Overlay = buildPhase12ContinuationOverlay({
    ...phase12Memory,
    ...phase12Outcome,
    ...phase11Drift,
    ...phase11Overlay,
    freshnessState: phase10Aging.freshnessState,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    nextSupportSequenceAction: phase11Overlay.nextSupportSequenceAction,
    supportSequenceState: phase11Sequencing.supportSequenceState,
    strategyRepetitionRisk: phase11Sequencing.strategyRepetitionRisk,
  });

  const phase13Gates = buildDecisionGatesPhase13({
    q,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    rootCause: rootCausePayload.rootCause,
    retentionRisk: memoryPhase9.retentionRisk,
    learningStage: memoryPhase9.learningStage,
    freshnessState: phase10Aging.freshnessState,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    recalibrationNeed: phase10Aging.recalibrationNeed,
    supportSequenceState: phase11Sequencing.supportSequenceState,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    expectedVsObservedMatch: phase12Outcome.expectedVsObservedMatch,
    recommendationMemoryState: phase12Memory.recommendationMemoryState,
    independenceProgress: memoryPhase9.independenceProgress,
    transferReadiness: memoryPhase9.transferReadiness,
    trendDer,
    finalStep: capped.step,
    displayName,
  });

  const phase13Targets = buildEvidenceTargetsPhase13({
    rootCause: rootCausePayload.rootCause,
    freshnessState: phase10Aging.freshnessState,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    recommendationMemoryState: phase12Memory.recommendationMemoryState,
    expectedVsObservedMatch: phase12Outcome.expectedVsObservedMatch,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    mistakeRecurrenceLevel: mistakeIntel.mistakeRecurrenceLevel,
    learningStage: memoryPhase9.learningStage,
    displayName,
  });

  const phase13Overlay = buildPhase13NextCycleOverlay({
    ...phase13Gates,
    ...phase13Targets,
    learningStage: memoryPhase9.learningStage,
    trendDer,
    independenceProgress: memoryPhase9.independenceProgress,
    freshnessState: phase10Aging.freshnessState,
    conclusionFreshness: phase10Aging.conclusionFreshness,
    recalibrationNeed: phase10Aging.recalibrationNeed,
    expectedVsObservedMatch: phase12Outcome.expectedVsObservedMatch,
    recommendationMemoryState: phase12Memory.recommendationMemoryState,
  });

  const phase14Dep = buildFoundationDependencyPhase14({
    q,
    evidenceStrength: String(row?.evidenceStrength || "low"),
    dataSufficiencyLevel: String(row?.dataSufficiencyLevel || "low"),
    conclusionStrength: restraintPayload.conclusionStrength,
    rootCause: rootCausePayload.rootCause,
    learningStage: memoryPhase9.learningStage,
    retentionRisk: memoryPhase9.retentionRisk,
    mistakeRecurrenceLevel: mistakeIntel.mistakeRecurrenceLevel,
    dominantMistakePattern: mistakeIntel.dominantMistakePattern,
    independenceProgress: memoryPhase9.independenceProgress,
    trendDer,
    responseToIntervention: phase10Effectiveness.responseToIntervention,
    expectedVsObservedMatch: phase12Outcome.expectedVsObservedMatch,
    recommendationMemoryState: phase12Memory.recommendationMemoryState,
    gateReadiness: phase13Gates.gateReadiness,
    gateState: phase13Gates.gateState,
    targetEvidenceType: phase13Targets.targetEvidenceType,
    displayName,
  });

  const phase14Overlay = buildPhase14RecommendationOverlay({
    ...phase13Gates,
    ...phase13Targets,
    ...phase13Overlay,
    ...phase14Dep,
  });

  const wnTrim = String(phase7Rec.whyNotAStrongerConclusionHe || "")
    .replace(/\s+/g, " ")
    .trim();
  const cautionLineHe = wnTrim.length > 110 ? `${wnTrim.slice(0, 107)}…` : wnTrim;

  let whyThisRecommendationHe = buildWhyThisRecommendationHe({
    displayName,
    finalStep: capped.step,
    riskFlags: riskFlagsPayload,
    trendDer,
    behaviorType,
    legacyRuleId,
    acc,
    q,
    wrongRatio,
    behaviorSignals: behaviorProfile?.signals && typeof behaviorProfile.signals === "object"
      ? behaviorProfile.signals : {},
    dominantMistakePatternLabelHe: mistakeIntel.dominantMistakePatternLabelHe,
    mistakePatternNarrativeHe: mistakeIntel.mistakePatternNarrativeHe,
    dependencyState: phase14Dep.dependencyState,
    likelyFoundationalBlocker: phase14Dep.likelyFoundationalBlocker,
    likelyFoundationalBlockerLabelHe: phase14Dep.likelyFoundationalBlockerLabelHe,
    whyFoundationFirstHe: phase14Overlay.whyFoundationFirstHe,
  });
  if (capped.postCapApplied) {
    whyThisRecommendationHe += " נשמר כלל זהירות - לא עושים שינוי גדול כשהמידע עדיין חלקי.";
  }
  whyThisRecommendationHe += ` נקודה שכדאי לשים עליה לב: ${rootCausePayload.rootCauseLabelHe || rootCausePayload.rootCause}.`;
  const dc = String(restraintPayload.diagnosticCautionHe || "").trim();
  if (dc) whyThisRecommendationHe += ` ${dc}`;
  if (phase10Aging.confidenceDecayApplied) {
    whyThisRecommendationHe += " הנתונים בתקופה שנבחרה מתחילים להתיישן - נשארים עם ניסוח זהיר יחסית.";
  }
  if (phase11Drift.repeatAdviceWarning && phase11Overlay.whyWeShouldNotRepeatSameSupportHe) {
    whyThisRecommendationHe += ` ${phase11Overlay.whyWeShouldNotRepeatSameSupportHe}`;
  } else if (phase11Drift.recommendationRotationNeed === "meaningful_rotation" && phase11Overlay.whyWeShouldNotRepeatSameSupportHe) {
    whyThisRecommendationHe += ` ${String(phase11Overlay.whyWeShouldNotRepeatSameSupportHe).slice(0, 120)}`;
  }
  /* Phase 15: קדימות ניסוח — Phase 13 (מה עדיין חסר) מעל Phase 12 כדי לא לשכפל אות זהה */
  const evStillNeed = phase13Overlay.whatEvidenceWeStillNeedHe
    ? String(phase13Overlay.whatEvidenceWeStillNeedHe).trim()
    : "";
  const freshNeed = phase12Overlay.whatNeedsFreshEvidenceNowHe
    ? String(phase12Overlay.whatNeedsFreshEvidenceNowHe).trim()
    : "";
  const freshProbe = freshNeed.slice(0, Math.min(36, freshNeed.length));
  const evProbe = evStillNeed.slice(0, Math.min(36, evStillNeed.length));
  const freshOverlapsEv =
    freshProbe.length > 14 && evProbe.length > 14 && (evStillNeed.includes(freshProbe) || freshNeed.includes(evProbe));

  if (
    phase12Overlay.whatNeedsFreshEvidenceNowHe &&
    phase12Memory.recommendationMemoryState === "no_memory" &&
    !freshOverlapsEv
  ) {
    whyThisRecommendationHe += ` ${String(phase12Overlay.whatNeedsFreshEvidenceNowHe).slice(0, 140)}`;
  } else if (phase12Overlay.whyWeThinkThisPathDidNotLandHe && phase12Outcome.expectedVsObservedMatch === "misaligned") {
    whyThisRecommendationHe += ` ${String(phase12Overlay.whyWeThinkThisPathDidNotLandHe).slice(0, 140)}`;
  }
  if (
    (phase13Gates.gateReadiness === "insufficient" || phase13Gates.gateState === "gates_not_ready") &&
    phase13Overlay.whatEvidenceWeStillNeedHe
  ) {
    const chunk = String(phase13Overlay.whatEvidenceWeStillNeedHe).slice(0, 130);
    const chunkProbe = chunk.slice(0, Math.min(32, chunk.length));
    if (chunkProbe.length < 12 || !whyThisRecommendationHe.includes(chunkProbe)) {
      whyThisRecommendationHe += ` ${chunk}`;
    }
  } else if (phase13Gates.gateState === "recheck_gate_visible" && phase13Overlay.whatWouldTriggerRecheckHe) {
    whyThisRecommendationHe += ` ${String(phase13Overlay.whatWouldTriggerRecheckHe).slice(0, 120)}`;
  }
  if (phase14Overlay.interventionOrdering === "foundation_first" && phase14Overlay.whyFoundationFirstHe) {
    whyThisRecommendationHe += ` ${String(phase14Overlay.whyFoundationFirstHe).slice(0, 135)}`;
  } else if (
    phase14Overlay.interventionOrdering === "gather_dependency_evidence_first" &&
    phase14Overlay.whyLocalSupportFirstHe
  ) {
    whyThisRecommendationHe += ` ${String(phase14Overlay.whyLocalSupportFirstHe).slice(0, 125)}`;
  } else if (phase14Overlay.interventionOrdering === "parallel_light_support" && phase14Overlay.whyThisMayBeSymptomNotCoreHe) {
    whyThisRecommendationHe += ` ${String(phase14Overlay.whyThisMayBeSymptomNotCoreHe).slice(0, 115)}`;
  }
  if (
    phase14Dep.dependencyState === "likely_foundational_block" &&
    (phase13Gates.releaseGate === "forming" || phase13Gates.advanceGate === "forming") &&
    !whyThisRecommendationHe.includes("לא מרחיבים שחרור")
  ) {
    whyThisRecommendationHe += " כל עוד לא ברור מאיפה מתחיל הקושי - לא מפחיתים עזרה ולא מקדמים מהר מדי.";
  }

  return {
    ...capped,
    ...restraintPayload,
    ...rootCausePayload,
    ...phase7Rec,
    ...interventionPhase8,
    ...calibrationPhase8,
    ...mistakeIntel,
    ...memoryPhase9,
    ...phase9Recommendation,
    ...phase10Effectiveness,
    ...phase10Aging,
    ...phase10Overlay,
    ...phase11Sequencing,
    ...phase11Drift,
    ...phase11Overlay,
    ...phase12Memory,
    ...phase12Outcome,
    ...phase12Overlay,
    ...phase13Gates,
    ...phase13Targets,
    ...phase13Overlay,
    ...phase14Dep,
    ...phase14Overlay,
    cautionLineHe,
    recommendationStructuredTrace: structured,
    riskFlags: riskFlagsPayload,
    diagnosticType: behaviorType,
    whyThisRecommendationHe,
    whatCouldChangeThisHe: buildWhatCouldChangeThisHe({ q, behaviorType }),
    engineConfidenceTier,
    accuracyBand,
    taxonomyMatch,
    engineDiagnosticDecision,
  };
}

const MISTAKE_ANALYSIS_KEY = {
  math: "mathMistakesByOperation",
  geometry: "geometryMistakesByTopic",
  english: "englishMistakesByTopic",
  science: "scienceMistakesByTopic",
  hebrew: "hebrewMistakesByTopic",
  "moledet-geography": "moledetGeographyMistakesByTopic",
};

/**
 * Read-only projection from row.intelligenceV1 for contracts / traces (no decisions).
 * @param {object|null|undefined} row
 */
function intelligenceV1SliceFromRow(row) {
  const iv = row?.intelligenceV1;
  if (!iv || typeof iv !== "object") {
    return { weaknessLevel: "none", confidenceBand: "low", recurrence: false };
  }
  return {
    weaknessLevel: String(iv.weakness?.level || "none"),
    confidenceBand: String(iv.confidence?.band || "low"),
    recurrence: !!iv.patterns?.recurrenceFull,
  };
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 */
export function buildTopicRecommendationRecord(
  subjectId,
  topicRowKey,
  row,
  mistakesByBucket,
  cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG,
  periodEndMs = null,
  toneContext = null,
  engineContext = null
) {
  const bucketKey =
    row?.bucketKey || splitBucketModeRowKey(String(topicRowKey)).bucketKey || null;
  const mC = resolveMistakeEventCount(subjectId, mistakesByBucket, bucketKey, topicRowKey, row);
  const endMs = Number.isFinite(periodEndMs) ? periodEndMs : Date.now();
  const startMs = Number.isFinite(Number(engineContext?.startMs)) ? Number(engineContext.startMs) : null;
  const rawMistakes =
    engineContext?.rawMistakesBySubject && typeof engineContext.rawMistakesBySubject === "object"
      ? engineContext.rawMistakesBySubject[subjectId] || []
      : null;
  const signals = computeRowDiagnosticSignals(subjectId, topicRowKey, row, mistakesByBucket, endMs, cfg);
  const qPreview = Number(row?.questions) || 0;
  const accPreview = Math.round(Number(row?.accuracy) || 0);
  const engineConfidenceTier = computeEngineConfidenceTier(qPreview);
  const accuracyBand = computeAccuracyBand(accPreview, qPreview);
  let taxonomyMatch = null;
  if (rawMistakes && startMs != null) {
    taxonomyMatch = resolveRowTaxonomyMatch({
      subjectId,
      topicRowKey,
      row,
      rawMistakes,
      startMs,
      endMs,
    });
  }
  const rowAug = { ...row, ...signals, engineConfidenceTier, accuracyBand, taxonomyMatch, subjectId: String(subjectId) };
  const decision = decideTopicNextStep(rowAug, mC, cfg);
  const q = Number(row?.questions) || 0;

  const toneByKey =
    toneContext && typeof toneContext === "object" && toneContext.parentTopicToneByKey
      ? toneContext.parentTopicToneByKey
      : null;
  const cautionLinesByKey =
    toneContext && typeof toneContext === "object" && toneContext.parentStrengthWithCautionLinesByKey
      ? toneContext.parentStrengthWithCautionLinesByKey
      : null;
  const rowTone = toneByKey ? toneByKey[String(topicRowKey)] : null;
  const cautionLines =
    cautionLinesByKey && Array.isArray(cautionLinesByKey[String(topicRowKey)])
      ? cautionLinesByKey[String(topicRowKey)]
      : null;

  const recommendationDecisionTrace = Array.isArray(decision.recommendationDecisionTrace)
    ? decision.recommendationDecisionTrace
    : [];
  const decisionTrace = [
    ...(Array.isArray(signals.decisionTrace) ? signals.decisionTrace : []),
    ...recommendationDecisionTrace,
  ];

  let whyThisRecommendationHe = decision.whyThisRecommendationHe || "";
  let recommendedParentActionHe = decision.parentHe;
  let recommendedStudentActionHe = decision.studentHe;
  if (rowTone === "strength_with_caution" && Array.isArray(cautionLines) && cautionLines.length >= 3) {
    whyThisRecommendationHe = `${cautionLines[0]} ${cautionLines[1]} ${cautionLines[2]}`.trim();
    recommendedParentActionHe = cautionLines[2];
  }

  const decisionContracts =
    decision?.contractsV1 && typeof decision.contractsV1 === "object"
      ? decision.contractsV1
      : null;
  const canonicalDecisionReadinessBundle = isDecisionReadinessContractsBundleV1(decisionContracts)
    ? decisionContracts
    : buildDecisionReadinessContractsBundleV1({
        topicKey: String(topicRowKey),
        subjectId: String(subjectId),
        q,
        evidenceStrength: String(signals?.evidenceStrength || decision?.evidenceStrength || "low"),
        dataSufficiencyLevel: String(signals?.dataSufficiencyLevel || decision?.dataSufficiencyLevel || "low"),
        conclusionStrength: String(decision?.conclusionStrength || "tentative"),
        cannotConcludeYet: !!decision?.shouldAvoidStrongConclusion,
        weak: !!decision?.shouldAvoidStrongConclusion,
        internalGateReadinessBand: String(decision?.gateReadiness || "insufficient"),
        gateState: String(decision?.gateState || "gates_not_ready"),
        dev2ConfidenceLevel: String(decision?.diagnosticConfidenceBand || ""),
        confidence: String(decision?.diagnosticConfidenceBand || ""),
      });
  const existingEvidenceContract =
    row?.contractsV1 && row.contractsV1.evidence && typeof row.contractsV1.evidence === "object"
      ? row.contractsV1.evidence
      : null;
  const evidenceContract = existingEvidenceContract
    || buildEvidenceContractV1({
      subjectId: String(subjectId),
      topicKey: String(topicRowKey),
      periodStartMs: null,
      periodEndMs: endMs,
      row,
      signals,
      trend: row?.trend || null,
      behaviorProfile: row?.behaviorProfile || null,
    });
  const evidenceValidation = validateEvidenceContractV1(evidenceContract);
  const anchorEvidenceIds = Array.isArray(evidenceContract?.anchorEventIds)
    ? evidenceContract.anchorEventIds
    : [];
  const recommendationContractV1 = buildRecommendationContractV1({
    topicKey: String(topicRowKey),
    subjectId: String(subjectId),
    q,
    accuracy: Number(row?.accuracy) || 0,
    decisionTier: canonicalDecisionReadinessBundle?.decision?.decisionTier ?? 0,
    readiness: canonicalDecisionReadinessBundle?.readiness?.readiness ?? "insufficient",
    confidenceBand: canonicalDecisionReadinessBundle?.confidence?.confidenceBand ?? "low",
    cannotConcludeYet: canonicalDecisionReadinessBundle?.decision?.cannotConcludeYet ?? false,
    interventionIntensity: decision?.interventionIntensity ?? "focused",
    diagnosticType: decision?.diagnosticType ?? "undetermined",
    rootCause: decision?.rootCause ?? null,
    retentionRisk: decision?.retentionRisk ?? null,
    evidenceStrength: signals.evidenceStrength,
    anchorEvidenceIds,
  });
  const recValidation = validateRecommendationContractV1(recommendationContractV1);
  const recommendationContractV1Checked = recValidation.ok
    ? recommendationContractV1
    : {
        ...recommendationContractV1,
        eligible: false,
        intensity: "RI0",
        family: null,
        forbiddenBecause: [...(recommendationContractV1.forbiddenBecause || []), ...recValidation.errors],
      };

  const recommendationContractV1Normalized = normalizeRecommendationContract(
    recommendationContractV1Checked,
    decision.step
  );

  if (process.env.NODE_ENV !== "production") {
    assertContractMatchesStep(recommendationContractV1Normalized, decision.step);
  }

  const recValidationNormalized = validateRecommendationContractV1(recommendationContractV1Normalized);

  const recommendedNextStepEffective = decision.step;

  const baseRecord = {
    subject: subjectId,
    topicRowKey: String(topicRowKey),
    displayName: String(row?.displayName || bucketKey || topicRowKey),
    bucketKey: bucketKey ? String(bucketKey) : null,
    modeKey: row?.modeKey ?? null,
    questions: q,
    accuracy: Number(row?.accuracy) || 0,
    wrong: Number(row?.wrong) || 0,
    mistakeEventCount: mC,
    gradeKey: normGradeKey(row),
    levelKey: normLevelKey(row),
    currentMastery: decision.currentMastery,
    stability: decision.stability,
    confidence: decision.confidence,
    masteryScore: signals.masteryScore,
    stabilityScore: signals.stabilityScore,
    confidenceScore: signals.confidenceScore,
    recencyScore: signals.recencyScore,
    evidenceStrength: signals.evidenceStrength,
    dataSufficiencyLevel: signals.dataSufficiencyLevel,
    dataSufficiencyLabelHe: signals.dataSufficiencyLabelHe,
    recommendationContextHe: signals.recommendationContextHe,
    patternStabilityHe: signals.patternStabilityHe,
    decisionTrace,
    recommendationDecisionTrace,
    contractsV1: {
      ...(row?.contractsV1 && typeof row.contractsV1 === "object" ? row.contractsV1 : {}),
      evidence: evidenceContract,
      evidenceValidation: {
        ok: !!evidenceValidation.ok,
        errors: Array.isArray(evidenceValidation.errors) ? evidenceValidation.errors : [],
      },
      decision: canonicalDecisionReadinessBundle.decision,
      readiness: canonicalDecisionReadinessBundle.readiness,
      confidence: canonicalDecisionReadinessBundle.confidence,
      intelligence: intelligenceV1SliceFromRow(row),
      recommendation: recommendationContractV1Normalized,
      recommendationValidation: {
        ok: !!recValidationNormalized.ok,
        errors: Array.isArray(recValidationNormalized.errors) ? recValidationNormalized.errors : [],
      },
    },
    // Backward compatibility mirror only (temporary).
    recommendationContractV1: recommendationContractV1Normalized,
    trend: row?.trend ?? null,
    behaviorProfile: row?.behaviorProfile ?? null,
    recommendedNextStep: recommendedNextStepEffective,
    recommendedStepLabelHe:
      RECOMMENDED_STEP_LABEL_HE[recommendedNextStepEffective] ||
      RECOMMENDED_STEP_LABEL_HE.maintain_and_strengthen,
    recommendedStepReasonHe: decision.reasonHe,
    recommendedParentActionHe,
    recommendedStudentActionHe,
    recommendedEvidenceLevelHe:
      signals.evidenceStrength === "strong"
        ? "מידע ברור יחסית"
        : signals.evidenceStrength === "medium"
          ? "מידע חלקי אך שימושי"
          : "מידע מצומצם",
    recommendedWhyNowHe: signals.recommendationContextHe,
    recommendationStabilityNoteHe: signals.patternStabilityHe,
    isEarlySignalOnly: !!signals.isEarlySignalOnly,
    needsPractice: !!row?.needsPractice,
    excellent: !!row?.excellent,
    confidenceBadge: confidenceBadgeFromScore(signals.confidenceScore),
    sufficiencyBadge: sufficiencyBadgeFromLevel(signals.dataSufficiencyLevel),
    diagnosticType: decision.diagnosticType ?? "undetermined",
    riskFlags: decision.riskFlags || null,
    whyThisRecommendationHe,
    parentTopicTone: rowTone || null,
    whatCouldChangeThisHe: decision.whatCouldChangeThisHe || "",
    recommendationStructuredTrace: decision.recommendationStructuredTrace ?? null,
    diagnosticRestraint: decision.diagnosticRestraint ?? null,
    conclusionStrength: decision.conclusionStrength ?? null,
    shouldAvoidStrongConclusion: !!decision.shouldAvoidStrongConclusion,
    alternativeExplanations: Array.isArray(decision.alternativeExplanations) ? decision.alternativeExplanations : [],
    diagnosticCautionHe: decision.diagnosticCautionHe ?? "",
    diagnosticConfidenceBand: decision.diagnosticConfidenceBand ?? "medium",
    rootCause: decision.rootCause ?? null,
    rootCauseLabelHe: decision.rootCauseLabelHe ?? null,
    rootCauseConfidence: Number.isFinite(Number(decision.rootCauseConfidence))
      ? Number(decision.rootCauseConfidence)
      : null,
    rootCauseEvidence: Array.isArray(decision.rootCauseEvidence) ? decision.rootCauseEvidence : [],
    secondaryPossibleCause: decision.secondaryPossibleCause ?? null,
    rootCauseNarrativeHe: decision.rootCauseNarrativeHe ?? null,
    recommendationReasoningHe: decision.recommendationReasoningHe ?? "",
    recommendedInterventionType: decision.recommendedInterventionType ?? null,
    recommendedEvidenceAction: decision.recommendedEvidenceAction ?? null,
    recommendedEvidenceActionHe: decision.recommendedEvidenceActionHe ?? "",
    whatWouldIncreaseConfidenceHe: decision.whatWouldIncreaseConfidenceHe ?? "",
    whyNotAStrongerConclusionHe: decision.whyNotAStrongerConclusionHe ?? "",
    interventionPlan: decision.interventionPlan ?? null,
    interventionPlanHe: decision.interventionPlanHe ?? "",
    interventionDurationBand: decision.interventionDurationBand ?? null,
    interventionIntensity: decision.interventionIntensity ?? null,
    interventionFormat: decision.interventionFormat ?? null,
    interventionGoal: decision.interventionGoal ?? null,
    interventionSuccessSignalHe: decision.interventionSuccessSignalHe ?? "",
    interventionStopSignalHe: decision.interventionStopSignalHe ?? "",
    interventionParentEffort: decision.interventionParentEffort ?? null,
    doNowHe: decision.doNowHe ?? "",
    avoidNowHe: decision.avoidNowHe ?? "",
    recommendedPracticeLoad: decision.recommendedPracticeLoad ?? null,
    recommendedSessionCount: Number.isFinite(Number(decision.recommendedSessionCount))
      ? Number(decision.recommendedSessionCount)
      : null,
    recommendedSessionLengthBand: decision.recommendedSessionLengthBand ?? null,
    escalationThresholdHe: decision.escalationThresholdHe ?? "",
    deescalationThresholdHe: decision.deescalationThresholdHe ?? "",
    practiceReadiness: decision.practiceReadiness ?? null,
    cautionLineHe: decision.cautionLineHe ?? "",
    mistakeIntelligence: decision.mistakeIntelligence ?? null,
    dominantMistakePattern: decision.dominantMistakePattern ?? null,
    dominantMistakePatternLabelHe: decision.dominantMistakePatternLabelHe ?? "",
    mistakePatternConfidence: Number.isFinite(Number(decision.mistakePatternConfidence))
      ? Number(decision.mistakePatternConfidence)
      : null,
    mistakePatternEvidence: Array.isArray(decision.mistakePatternEvidence) ? decision.mistakePatternEvidence : [],
    secondaryMistakePattern: decision.secondaryMistakePattern ?? null,
    mistakePatternNarrativeHe: decision.mistakePatternNarrativeHe ?? "",
    mistakeSpecificity: decision.mistakeSpecificity ?? null,
    mistakeRecurrenceLevel: decision.mistakeRecurrenceLevel ?? null,
    learningMemory: decision.learningMemory ?? null,
    learningStage: decision.learningStage ?? null,
    learningStageLabelHe: decision.learningStageLabelHe ?? "",
    retentionRisk: decision.retentionRisk ?? null,
    stabilizationState: decision.stabilizationState ?? null,
    transferReadiness: decision.transferReadiness ?? null,
    independenceProgress: decision.independenceProgress ?? null,
    memoryNarrativeHe: decision.memoryNarrativeHe ?? "",
    learningMemoryEvidence: Array.isArray(decision.learningMemoryEvidence) ? decision.learningMemoryEvidence : [],
    recommendedPracticeMode: decision.recommendedPracticeMode ?? null,
    recommendedTransferStep: decision.recommendedTransferStep ?? null,
    reviewBeforeAdvanceHe: decision.reviewBeforeAdvanceHe ?? "",
    mistakeFocusedActionHe: decision.mistakeFocusedActionHe ?? "",
    memoryFocusedActionHe: decision.memoryFocusedActionHe ?? "",
    interventionEffectiveness: decision.interventionEffectiveness ?? null,
    responseToIntervention: decision.responseToIntervention ?? null,
    responseToInterventionLabelHe: decision.responseToInterventionLabelHe ?? "",
    effectivenessConfidence: Number.isFinite(Number(decision.effectivenessConfidence))
      ? Number(decision.effectivenessConfidence)
      : null,
    effectivenessEvidence: Array.isArray(decision.effectivenessEvidence) ? decision.effectivenessEvidence : [],
    supportFit: decision.supportFit ?? null,
    supportFitLabelHe: decision.supportFitLabelHe ?? "",
    supportAdjustmentNeed: decision.supportAdjustmentNeed ?? null,
    supportAdjustmentNeedHe: decision.supportAdjustmentNeedHe ?? "",
    interventionEffectNarrativeHe: decision.interventionEffectNarrativeHe ?? "",
    confidenceAging: decision.confidenceAging ?? null,
    freshnessState: decision.freshnessState ?? null,
    freshnessStateLabelHe: decision.freshnessStateLabelHe ?? "",
    conclusionFreshness: decision.conclusionFreshness ?? null,
    conclusionFreshnessLabelHe: decision.conclusionFreshnessLabelHe ?? "",
    confidenceDecayApplied: !!decision.confidenceDecayApplied,
    recalibrationNeed: decision.recalibrationNeed ?? null,
    recalibrationNeedHe: decision.recalibrationNeedHe ?? "",
    nextSupportAdjustment: decision.nextSupportAdjustment ?? null,
    nextSupportAdjustmentHe: decision.nextSupportAdjustmentHe ?? "",
    continueWhatWorksHe: decision.continueWhatWorksHe ?? "",
    changeBecauseHe: decision.changeBecauseHe ?? "",
    recheckBeforeEscalationHe: decision.recheckBeforeEscalationHe ?? "",
    evidenceStillMissingHe: decision.evidenceStillMissingHe ?? "",
    supportSequencing: decision.supportSequencing ?? null,
    supportSequenceState: decision.supportSequenceState ?? null,
    supportSequenceStateLabelHe: decision.supportSequenceStateLabelHe ?? "",
    priorSupportPattern: decision.priorSupportPattern ?? null,
    priorSupportPatternLabelHe: decision.priorSupportPatternLabelHe ?? "",
    strategyRepetitionRisk: decision.strategyRepetitionRisk ?? null,
    strategyRepetitionRiskHe: decision.strategyRepetitionRiskHe ?? "",
    strategyFatigueRisk: decision.strategyFatigueRisk ?? null,
    strategyFatigueRiskHe: decision.strategyFatigueRiskHe ?? "",
    nextBestSequenceStep: decision.nextBestSequenceStep ?? null,
    nextBestSequenceStepHe: decision.nextBestSequenceStepHe ?? "",
    supportSequenceNarrativeHe: decision.supportSequenceNarrativeHe ?? "",
    adviceDrift: decision.adviceDrift ?? null,
    adviceSimilarityLevel: decision.adviceSimilarityLevel ?? null,
    adviceSimilarityLevelHe: decision.adviceSimilarityLevelHe ?? "",
    adviceNovelty: decision.adviceNovelty ?? null,
    adviceNoveltyHe: decision.adviceNoveltyHe ?? "",
    repeatAdviceWarning: !!decision.repeatAdviceWarning,
    repeatAdviceWarningHe: decision.repeatAdviceWarningHe ?? "",
    recommendationRotationNeed: decision.recommendationRotationNeed ?? null,
    recommendationRotationNeedHe: decision.recommendationRotationNeedHe ?? "",
    nextSupportSequenceAction: decision.nextSupportSequenceAction ?? null,
    nextSupportSequenceActionHe: decision.nextSupportSequenceActionHe ?? "",
    whyThisIsDifferentNowHe: decision.whyThisIsDifferentNowHe ?? "",
    whyWeShouldNotRepeatSameSupportHe: decision.whyWeShouldNotRepeatSameSupportHe ?? "",
    whatMustHappenBeforeReleaseHe: decision.whatMustHappenBeforeReleaseHe ?? "",
    whatSignalsSequenceSuccessHe: decision.whatSignalsSequenceSuccessHe ?? "",
    recommendationMemory: decision.recommendationMemory ?? null,
    recommendationMemoryState: decision.recommendationMemoryState ?? null,
    recommendationMemoryStateLabelHe: decision.recommendationMemoryStateLabelHe ?? "",
    priorRecommendationSignature: decision.priorRecommendationSignature ?? null,
    priorRecommendationSignatureLabelHe: decision.priorRecommendationSignatureLabelHe ?? "",
    supportHistoryDepth: decision.supportHistoryDepth ?? null,
    supportHistoryDepthLabelHe: decision.supportHistoryDepthLabelHe ?? "",
    recommendationCarryover: decision.recommendationCarryover ?? null,
    recommendationCarryoverLabelHe: decision.recommendationCarryoverLabelHe ?? "",
    memoryOfPriorSupportConfidence: decision.memoryOfPriorSupportConfidence ?? null,
    recommendationMemoryNarrativeHe: decision.recommendationMemoryNarrativeHe ?? "",
    outcomeTracking: decision.outcomeTracking ?? null,
    expectedOutcomeType: decision.expectedOutcomeType ?? null,
    expectedOutcomeTypeLabelHe: decision.expectedOutcomeTypeLabelHe ?? "",
    observedOutcomeState: decision.observedOutcomeState ?? null,
    observedOutcomeStateLabelHe: decision.observedOutcomeStateLabelHe ?? "",
    expectedVsObservedMatch: decision.expectedVsObservedMatch ?? null,
    expectedVsObservedMatchHe: decision.expectedVsObservedMatchHe ?? "",
    followThroughSignal: decision.followThroughSignal ?? null,
    followThroughSignalHe: decision.followThroughSignalHe ?? "",
    outcomeTrackingConfidence: decision.outcomeTrackingConfidence ?? null,
    outcomeTrackingNarrativeHe: decision.outcomeTrackingNarrativeHe ?? "",
    recommendationContinuationDecision: decision.recommendationContinuationDecision ?? null,
    recommendationContinuationDecisionHe: decision.recommendationContinuationDecisionHe ?? "",
    outcomeBasedNextMove: decision.outcomeBasedNextMove ?? null,
    outcomeBasedNextMoveHe: decision.outcomeBasedNextMoveHe ?? "",
    whyWeThinkThisPathWorkedHe: decision.whyWeThinkThisPathWorkedHe ?? "",
    whyWeThinkThisPathDidNotLandHe: decision.whyWeThinkThisPathDidNotLandHe ?? "",
    whatNeedsFreshEvidenceNowHe: decision.whatNeedsFreshEvidenceNowHe ?? "",
    whatShouldCarryForwardHe: decision.whatShouldCarryForwardHe ?? "",
    decisionGates: decision.decisionGates ?? null,
    gateState: decision.gateState ?? null,
    gateStateLabelHe: decision.gateStateLabelHe ?? "",
    continueGate: decision.continueGate ?? null,
    releaseGate: decision.releaseGate ?? null,
    pivotGate: decision.pivotGate ?? null,
    recheckGate: decision.recheckGate ?? null,
    advanceGate: decision.advanceGate ?? null,
    gateReadiness: decision.gateReadiness ?? null,
    gateReadinessLabelHe: decision.gateReadinessLabelHe ?? "",
    gateNarrativeHe: decision.gateNarrativeHe ?? "",
    evidenceTargets: decision.evidenceTargets ?? null,
    targetEvidenceType: decision.targetEvidenceType ?? null,
    targetEvidenceTypeLabelHe: decision.targetEvidenceTypeLabelHe ?? "",
    targetObservationWindow: decision.targetObservationWindow ?? null,
    targetObservationWindowLabelHe: decision.targetObservationWindowLabelHe ?? "",
    targetSuccessSignalHe: decision.targetSuccessSignalHe ?? "",
    targetFailureSignalHe: decision.targetFailureSignalHe ?? "",
    targetIndependenceSignalHe: decision.targetIndependenceSignalHe ?? "",
    targetStabilitySignalHe: decision.targetStabilitySignalHe ?? "",
    targetFreshnessNeedHe: decision.targetFreshnessNeedHe ?? "",
    evidenceTargetNarrativeHe: decision.evidenceTargetNarrativeHe ?? "",
    nextCycleDecisionFocus: decision.nextCycleDecisionFocus ?? null,
    nextCycleDecisionFocusHe: decision.nextCycleDecisionFocusHe ?? "",
    whatWouldJustifyReleaseHe: decision.whatWouldJustifyReleaseHe ?? "",
    whatWouldJustifyAdvanceHe: decision.whatWouldJustifyAdvanceHe ?? "",
    whatWouldTriggerPivotHe: decision.whatWouldTriggerPivotHe ?? "",
    whatWouldTriggerRecheckHe: decision.whatWouldTriggerRecheckHe ?? "",
    whatEvidenceWeStillNeedHe: decision.whatEvidenceWeStillNeedHe ?? "",
    foundationDependency: decision.foundationDependency ?? null,
    dependencyState: decision.dependencyState ?? null,
    dependencyStateLabelHe: decision.dependencyStateLabelHe ?? "",
    likelyFoundationalBlocker: decision.likelyFoundationalBlocker ?? null,
    likelyFoundationalBlockerLabelHe: decision.likelyFoundationalBlockerLabelHe ?? "",
    dependencyConfidence: decision.dependencyConfidence ?? null,
    dependencyEvidence: Array.isArray(decision.dependencyEvidence) ? decision.dependencyEvidence : [],
    downstreamSymptomLikelihood: decision.downstreamSymptomLikelihood ?? null,
    downstreamSymptomLikelihoodHe: decision.downstreamSymptomLikelihoodHe ?? "",
    localIssueLikelihood: decision.localIssueLikelihood ?? null,
    localIssueLikelihoodHe: decision.localIssueLikelihoodHe ?? "",
    shouldTreatAsFoundationFirst: !!decision.shouldTreatAsFoundationFirst,
    foundationDependencyNarrativeHe: decision.foundationDependencyNarrativeHe ?? "",
    interventionOrdering: decision.interventionOrdering ?? null,
    interventionOrderingHe: decision.interventionOrderingHe ?? "",
    whyThisMayBeSymptomNotCoreHe: decision.whyThisMayBeSymptomNotCoreHe ?? "",
    whyFoundationFirstHe: decision.whyFoundationFirstHe ?? "",
    whyLocalSupportFirstHe: decision.whyLocalSupportFirstHe ?? "",
    whatCanWaitUntilFoundationStabilizesHe: decision.whatCanWaitUntilFoundationStabilizesHe ?? "",
    foundationDecision: decision.foundationDecision ?? null,
    foundationDecisionLabelHe: decision.foundationDecisionLabelHe ?? "",
    nextCycleSupportLevel: decision.nextCycleSupportLevel ?? null,
    nextCycleSupportLevelHe: decision.nextCycleSupportLevelHe ?? "",
    foundationBeforeExpansion: !!decision.foundationBeforeExpansion,
    foundationBeforeExpansionHe: decision.foundationBeforeExpansionHe ?? "",
    engineConfidenceTier: decision.engineConfidenceTier ?? null,
    accuracyBand: decision.accuracyBand ?? null,
    taxonomyMatch: decision.taxonomyMatch ?? null,
    engineDiagnosticDecision: decision.engineDiagnosticDecision ?? null,
    taxonomyMatchId: decision.engineDiagnosticDecision?.taxonomyMatchId ?? decision.taxonomyMatch?.taxonomyId ?? null,
    taxonomyMatchStrength:
      decision.engineDiagnosticDecision?.taxonomyMatchStrength ?? decision.taxonomyMatch?.matchStrength ?? null,
    [K_SKILL_FOCUS]: decision.engineDiagnosticDecision?.[K_SKILL_FOCUS] ?? null,
    patternCandidate: decision.engineDiagnosticDecision?.patternCandidate ?? null,
    interventionActionCandidate: decision.engineDiagnosticDecision?.actionCandidate ?? null,
  };

  const contractAppliedRecord = applyRecommendationContractToRecord(
    baseRecord,
    recommendationContractV1Normalized,
    recValidationNormalized
  );
  const narrativeContract = buildNarrativeContractV1({
    ...contractAppliedRecord,
    topicKey: String(topicRowKey),
    subjectId: String(subjectId),
    contractsV1: contractAppliedRecord?.contractsV1 ?? {},
  });
  const narrativeValidation = validateNarrativeContractV1(narrativeContract);
  const withNarrative = applyNarrativeContractToRecord(
    contractAppliedRecord,
    narrativeContract,
    narrativeValidation
  );
  return glossTopicRecommendationHeFields(withNarrative);
}

/**
 * מוסיף לכל שורת נושא בדוח תוויות המלצה קצרות בעברית (אל UI הדוח הרגיל).
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, Record<string, { count?: number }>>} mistakesBySubject
 * @param {number} periodEndMs
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 * @param {{ rawMistakesBySubject?: Record<string, unknown[]>, startMs?: number }|null} [engineContext]
 */
export function enrichReportMapsWithTopicStepHints(
  maps,
  mistakesBySubject,
  periodEndMs,
  cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG,
  engineContext = null
) {
  const endMs = Number.isFinite(periodEndMs) ? periodEndMs : Date.now();
  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (!topicMap || typeof topicMap !== "object") continue;
    const mistakesByBucket = mistakesBySubject?.[subjectId] || {};
    for (const [topicRowKey, row] of Object.entries(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;
      const rec = buildTopicRecommendationRecord(
        subjectId,
        topicRowKey,
        row,
        mistakesByBucket,
        cfg,
        endMs,
        null,
        engineContext
      );
      row.diagnosticRecommendedStepLabelHe = rec.recommendedStepLabelHe;
      row.diagnosticRecommendedEvidenceHe = rec.recommendedEvidenceLevelHe;
      row.diagnosticWhyNowHe = rec.recommendedWhyNowHe;
      row.diagnosticStabilityNoteHe = rec.recommendationStabilityNoteHe;
      row.diagnosticIsEarlySignalOnly = rec.isEarlySignalOnly;
      row.diagnosticRecommendedNextStep = rec.recommendedNextStep;
      row.recommendationDecisionTrace = rec.recommendationDecisionTrace || [];
      row.topicEngineRowSignals = {
        riskFlags: rec.riskFlags || null,
        confidenceBadge: rec.confidenceBadge ?? null,
        sufficiencyBadge: rec.sufficiencyBadge ?? null,
        diagnosticType: rec.diagnosticType ?? null,
        whyThisRecommendationHe: rec.whyThisRecommendationHe || null,
        whatCouldChangeThisHe: rec.whatCouldChangeThisHe || null,
        recommendationStructuredTrace: rec.recommendationStructuredTrace ?? null,
        diagnosticRestraint: rec.diagnosticRestraint ?? null,
        conclusionStrength: rec.conclusionStrength ?? null,
        shouldAvoidStrongConclusion: rec.shouldAvoidStrongConclusion ?? false,
        alternativeExplanations: rec.alternativeExplanations ?? [],
        diagnosticCautionHe: rec.diagnosticCautionHe ?? null,
        diagnosticConfidenceBand: rec.diagnosticConfidenceBand ?? null,
        rootCause: rec.rootCause ?? null,
        rootCauseLabelHe: rec.rootCauseLabelHe ?? null,
        rootCauseConfidence: rec.rootCauseConfidence ?? null,
        rootCauseEvidence: rec.rootCauseEvidence ?? null,
        secondaryPossibleCause: rec.secondaryPossibleCause ?? null,
        rootCauseNarrativeHe: rec.rootCauseNarrativeHe ?? null,
        recommendationReasoningHe: rec.recommendationReasoningHe ?? null,
        recommendedInterventionType: rec.recommendedInterventionType ?? null,
        recommendedEvidenceAction: rec.recommendedEvidenceAction ?? null,
        recommendedEvidenceActionHe: rec.recommendedEvidenceActionHe ?? null,
        whatWouldIncreaseConfidenceHe: rec.whatWouldIncreaseConfidenceHe ?? null,
        whyNotAStrongerConclusionHe: rec.whyNotAStrongerConclusionHe ?? null,
        interventionPlan: rec.interventionPlan ?? null,
        interventionPlanHe: rec.interventionPlanHe ?? null,
        interventionDurationBand: rec.interventionDurationBand ?? null,
        interventionIntensity: rec.interventionIntensity ?? null,
        interventionFormat: rec.interventionFormat ?? null,
        interventionGoal: rec.interventionGoal ?? null,
        interventionSuccessSignalHe: rec.interventionSuccessSignalHe ?? null,
        interventionStopSignalHe: rec.interventionStopSignalHe ?? null,
        interventionParentEffort: rec.interventionParentEffort ?? null,
        doNowHe: rec.doNowHe ?? null,
        avoidNowHe: rec.avoidNowHe ?? null,
        recommendedPracticeLoad: rec.recommendedPracticeLoad ?? null,
        recommendedSessionCount: rec.recommendedSessionCount ?? null,
        recommendedSessionLengthBand: rec.recommendedSessionLengthBand ?? null,
        escalationThresholdHe: rec.escalationThresholdHe ?? null,
        deescalationThresholdHe: rec.deescalationThresholdHe ?? null,
        practiceReadiness: rec.practiceReadiness ?? null,
        cautionLineHe: rec.cautionLineHe ?? null,
        mistakeIntelligence: rec.mistakeIntelligence ?? null,
        dominantMistakePattern: rec.dominantMistakePattern ?? null,
        dominantMistakePatternLabelHe: rec.dominantMistakePatternLabelHe ?? null,
        mistakePatternConfidence: rec.mistakePatternConfidence ?? null,
        mistakePatternEvidence: rec.mistakePatternEvidence ?? null,
        secondaryMistakePattern: rec.secondaryMistakePattern ?? null,
        mistakePatternNarrativeHe: rec.mistakePatternNarrativeHe ?? null,
        mistakeSpecificity: rec.mistakeSpecificity ?? null,
        mistakeRecurrenceLevel: rec.mistakeRecurrenceLevel ?? null,
        learningMemory: rec.learningMemory ?? null,
        learningStage: rec.learningStage ?? null,
        learningStageLabelHe: rec.learningStageLabelHe ?? null,
        retentionRisk: rec.retentionRisk ?? null,
        stabilizationState: rec.stabilizationState ?? null,
        transferReadiness: rec.transferReadiness ?? null,
        independenceProgress: rec.independenceProgress ?? null,
        memoryNarrativeHe: rec.memoryNarrativeHe ?? null,
        learningMemoryEvidence: rec.learningMemoryEvidence ?? null,
        recommendedPracticeMode: rec.recommendedPracticeMode ?? null,
        recommendedTransferStep: rec.recommendedTransferStep ?? null,
        reviewBeforeAdvanceHe: rec.reviewBeforeAdvanceHe ?? null,
        mistakeFocusedActionHe: rec.mistakeFocusedActionHe ?? null,
        memoryFocusedActionHe: rec.memoryFocusedActionHe ?? null,
        interventionEffectiveness: rec.interventionEffectiveness ?? null,
        responseToIntervention: rec.responseToIntervention ?? null,
        responseToInterventionLabelHe: rec.responseToInterventionLabelHe ?? null,
        effectivenessConfidence: rec.effectivenessConfidence ?? null,
        effectivenessEvidence: rec.effectivenessEvidence ?? null,
        supportFit: rec.supportFit ?? null,
        supportFitLabelHe: rec.supportFitLabelHe ?? null,
        supportAdjustmentNeed: rec.supportAdjustmentNeed ?? null,
        supportAdjustmentNeedHe: rec.supportAdjustmentNeedHe ?? null,
        interventionEffectNarrativeHe: rec.interventionEffectNarrativeHe ?? null,
        confidenceAging: rec.confidenceAging ?? null,
        freshnessState: rec.freshnessState ?? null,
        freshnessStateLabelHe: rec.freshnessStateLabelHe ?? null,
        conclusionFreshness: rec.conclusionFreshness ?? null,
        conclusionFreshnessLabelHe: rec.conclusionFreshnessLabelHe ?? null,
        confidenceDecayApplied: rec.confidenceDecayApplied ?? false,
        recalibrationNeed: rec.recalibrationNeed ?? null,
        recalibrationNeedHe: rec.recalibrationNeedHe ?? null,
        nextSupportAdjustment: rec.nextSupportAdjustment ?? null,
        nextSupportAdjustmentHe: rec.nextSupportAdjustmentHe ?? null,
        continueWhatWorksHe: rec.continueWhatWorksHe ?? null,
        changeBecauseHe: rec.changeBecauseHe ?? null,
        recheckBeforeEscalationHe: rec.recheckBeforeEscalationHe ?? null,
        evidenceStillMissingHe: rec.evidenceStillMissingHe ?? null,
        supportSequencing: rec.supportSequencing ?? null,
        supportSequenceState: rec.supportSequenceState ?? null,
        supportSequenceStateLabelHe: rec.supportSequenceStateLabelHe ?? null,
        priorSupportPattern: rec.priorSupportPattern ?? null,
        priorSupportPatternLabelHe: rec.priorSupportPatternLabelHe ?? null,
        strategyRepetitionRisk: rec.strategyRepetitionRisk ?? null,
        strategyRepetitionRiskHe: rec.strategyRepetitionRiskHe ?? null,
        strategyFatigueRisk: rec.strategyFatigueRisk ?? null,
        strategyFatigueRiskHe: rec.strategyFatigueRiskHe ?? null,
        nextBestSequenceStep: rec.nextBestSequenceStep ?? null,
        nextBestSequenceStepHe: rec.nextBestSequenceStepHe ?? null,
        supportSequenceNarrativeHe: rec.supportSequenceNarrativeHe ?? null,
        adviceDrift: rec.adviceDrift ?? null,
        adviceSimilarityLevel: rec.adviceSimilarityLevel ?? null,
        adviceSimilarityLevelHe: rec.adviceSimilarityLevelHe ?? null,
        adviceNovelty: rec.adviceNovelty ?? null,
        adviceNoveltyHe: rec.adviceNoveltyHe ?? null,
        repeatAdviceWarning: rec.repeatAdviceWarning ?? false,
        repeatAdviceWarningHe: rec.repeatAdviceWarningHe ?? null,
        recommendationRotationNeed: rec.recommendationRotationNeed ?? null,
        recommendationRotationNeedHe: rec.recommendationRotationNeedHe ?? null,
        nextSupportSequenceAction: rec.nextSupportSequenceAction ?? null,
        nextSupportSequenceActionHe: rec.nextSupportSequenceActionHe ?? null,
        whyThisIsDifferentNowHe: rec.whyThisIsDifferentNowHe ?? null,
        whyWeShouldNotRepeatSameSupportHe: rec.whyWeShouldNotRepeatSameSupportHe ?? null,
        whatMustHappenBeforeReleaseHe: rec.whatMustHappenBeforeReleaseHe ?? null,
        whatSignalsSequenceSuccessHe: rec.whatSignalsSequenceSuccessHe ?? null,
        recommendationMemory: rec.recommendationMemory ?? null,
        recommendationMemoryState: rec.recommendationMemoryState ?? null,
        recommendationMemoryStateLabelHe: rec.recommendationMemoryStateLabelHe ?? null,
        priorRecommendationSignature: rec.priorRecommendationSignature ?? null,
        priorRecommendationSignatureLabelHe: rec.priorRecommendationSignatureLabelHe ?? null,
        supportHistoryDepth: rec.supportHistoryDepth ?? null,
        supportHistoryDepthLabelHe: rec.supportHistoryDepthLabelHe ?? null,
        recommendationCarryover: rec.recommendationCarryover ?? null,
        recommendationCarryoverLabelHe: rec.recommendationCarryoverLabelHe ?? null,
        memoryOfPriorSupportConfidence: rec.memoryOfPriorSupportConfidence ?? null,
        recommendationMemoryNarrativeHe: rec.recommendationMemoryNarrativeHe ?? null,
        outcomeTracking: rec.outcomeTracking ?? null,
        expectedOutcomeType: rec.expectedOutcomeType ?? null,
        expectedOutcomeTypeLabelHe: rec.expectedOutcomeTypeLabelHe ?? null,
        observedOutcomeState: rec.observedOutcomeState ?? null,
        observedOutcomeStateLabelHe: rec.observedOutcomeStateLabelHe ?? null,
        expectedVsObservedMatch: rec.expectedVsObservedMatch ?? null,
        expectedVsObservedMatchHe: rec.expectedVsObservedMatchHe ?? null,
        followThroughSignal: rec.followThroughSignal ?? null,
        followThroughSignalHe: rec.followThroughSignalHe ?? null,
        outcomeTrackingConfidence: rec.outcomeTrackingConfidence ?? null,
        outcomeTrackingNarrativeHe: rec.outcomeTrackingNarrativeHe ?? null,
        recommendationContinuationDecision: rec.recommendationContinuationDecision ?? null,
        recommendationContinuationDecisionHe: rec.recommendationContinuationDecisionHe ?? null,
        outcomeBasedNextMove: rec.outcomeBasedNextMove ?? null,
        outcomeBasedNextMoveHe: rec.outcomeBasedNextMoveHe ?? null,
        whyWeThinkThisPathWorkedHe: rec.whyWeThinkThisPathWorkedHe ?? null,
        whyWeThinkThisPathDidNotLandHe: rec.whyWeThinkThisPathDidNotLandHe ?? null,
        whatNeedsFreshEvidenceNowHe: rec.whatNeedsFreshEvidenceNowHe ?? null,
        whatShouldCarryForwardHe: rec.whatShouldCarryForwardHe ?? null,
        decisionGates: rec.decisionGates ?? null,
        gateState: rec.gateState ?? null,
        gateStateLabelHe: rec.gateStateLabelHe ?? null,
        continueGate: rec.continueGate ?? null,
        releaseGate: rec.releaseGate ?? null,
        pivotGate: rec.pivotGate ?? null,
        recheckGate: rec.recheckGate ?? null,
        advanceGate: rec.advanceGate ?? null,
        gateReadiness: rec.gateReadiness ?? null,
        gateReadinessLabelHe: rec.gateReadinessLabelHe ?? null,
        gateNarrativeHe: rec.gateNarrativeHe ?? null,
        evidenceTargets: rec.evidenceTargets ?? null,
        targetEvidenceType: rec.targetEvidenceType ?? null,
        targetEvidenceTypeLabelHe: rec.targetEvidenceTypeLabelHe ?? null,
        targetObservationWindow: rec.targetObservationWindow ?? null,
        targetObservationWindowLabelHe: rec.targetObservationWindowLabelHe ?? null,
        targetSuccessSignalHe: rec.targetSuccessSignalHe ?? null,
        targetFailureSignalHe: rec.targetFailureSignalHe ?? null,
        targetIndependenceSignalHe: rec.targetIndependenceSignalHe ?? null,
        targetStabilitySignalHe: rec.targetStabilitySignalHe ?? null,
        targetFreshnessNeedHe: rec.targetFreshnessNeedHe ?? null,
        evidenceTargetNarrativeHe: rec.evidenceTargetNarrativeHe ?? null,
        nextCycleDecisionFocus: rec.nextCycleDecisionFocus ?? null,
        nextCycleDecisionFocusHe: rec.nextCycleDecisionFocusHe ?? null,
        whatWouldJustifyReleaseHe: rec.whatWouldJustifyReleaseHe ?? null,
        whatWouldJustifyAdvanceHe: rec.whatWouldJustifyAdvanceHe ?? null,
        whatWouldTriggerPivotHe: rec.whatWouldTriggerPivotHe ?? null,
        whatWouldTriggerRecheckHe: rec.whatWouldTriggerRecheckHe ?? null,
        whatEvidenceWeStillNeedHe: rec.whatEvidenceWeStillNeedHe ?? null,
        foundationDependency: rec.foundationDependency ?? null,
        dependencyState: rec.dependencyState ?? null,
        dependencyStateLabelHe: rec.dependencyStateLabelHe ?? null,
        likelyFoundationalBlocker: rec.likelyFoundationalBlocker ?? null,
        likelyFoundationalBlockerLabelHe: rec.likelyFoundationalBlockerLabelHe ?? null,
        dependencyConfidence: rec.dependencyConfidence ?? null,
        dependencyEvidence: Array.isArray(rec.dependencyEvidence) ? rec.dependencyEvidence : [],
        downstreamSymptomLikelihood: rec.downstreamSymptomLikelihood ?? null,
        downstreamSymptomLikelihoodHe: rec.downstreamSymptomLikelihoodHe ?? null,
        localIssueLikelihood: rec.localIssueLikelihood ?? null,
        localIssueLikelihoodHe: rec.localIssueLikelihoodHe ?? null,
        shouldTreatAsFoundationFirst: rec.shouldTreatAsFoundationFirst ?? false,
        foundationDependencyNarrativeHe: rec.foundationDependencyNarrativeHe ?? null,
        interventionOrdering: rec.interventionOrdering ?? null,
        interventionOrderingHe: rec.interventionOrderingHe ?? null,
        whyThisMayBeSymptomNotCoreHe: rec.whyThisMayBeSymptomNotCoreHe ?? null,
        whyFoundationFirstHe: rec.whyFoundationFirstHe ?? null,
        whyLocalSupportFirstHe: rec.whyLocalSupportFirstHe ?? null,
        whatCanWaitUntilFoundationStabilizesHe: rec.whatCanWaitUntilFoundationStabilizesHe ?? null,
        foundationDecision: rec.foundationDecision ?? null,
        foundationDecisionLabelHe: rec.foundationDecisionLabelHe ?? null,
        nextCycleSupportLevel: rec.nextCycleSupportLevel ?? null,
        nextCycleSupportLevelHe: rec.nextCycleSupportLevelHe ?? null,
        foundationBeforeExpansion: rec.foundationBeforeExpansion ?? false,
        foundationBeforeExpansionHe: rec.foundationBeforeExpansionHe ?? null,
        engineConfidenceTier: rec.engineConfidenceTier ?? null,
        accuracyBand: rec.accuracyBand ?? null,
        engineDiagnosticDecision: rec.engineDiagnosticDecision ?? null,
        taxonomyMatchId: rec.taxonomyMatchId ?? null,
        taxonomyMatchStrength: rec.taxonomyMatchStrength ?? null,
        taxonomyMatch: rec.engineDiagnosticDecision?.taxonomyMatch ?? !!rec.taxonomyMatchId,
        [K_SKILL_FOCUS]: rec[K_SKILL_FOCUS] ?? null,
        patternCandidate: rec.patternCandidate ?? null,
        interventionActionCandidate: rec.interventionActionCandidate ?? null,
      };
    }
  }
}

/**
 * @param {typeof DEFAULT_TOPIC_NEXT_STEP_CONFIG} [cfg]
 */
export function buildTopicRecommendationsForSubject(
  subjectId,
  topicMap,
  analysis,
  cfg = DEFAULT_TOPIC_NEXT_STEP_CONFIG,
  periodEndMs = null,
  toneContext = null
) {
  const aKey = MISTAKE_ANALYSIS_KEY[subjectId];
  const mistakesByBucket = (analysis && analysis[aKey]) || {};

  const rows = [];
  if (!topicMap || typeof topicMap !== "object") return rows;

  for (const [topicRowKey, row] of Object.entries(topicMap)) {
    if (!row || typeof row !== "object") continue;
    const q = Number(row.questions) || 0;
    if (q <= 0) continue;
    rows.push(
      buildTopicRecommendationRecord(
        subjectId,
        topicRowKey,
        row,
        mistakesByBucket,
        cfg,
        periodEndMs,
        toneContext
      )
    );
  }

  const urgency = (s) => {
    const o = {
      drop_one_grade_topic_only: 0,
      drop_one_level_topic_only: 1,
      remediate_same_level: 2,
      maintain_and_strengthen: 3,
      advance_level: 4,
      advance_grade_topic_only: 5,
    };
    return o[s] ?? 9;
  };

  rows.sort((a, b) => {
    const u = urgency(a.recommendedNextStep) - urgency(b.recommendedNextStep);
    if (u !== 0) return u;
    return b.questions - a.questions;
  });

  return rows.slice(0, cfg.maxTopicRecommendationsPerSubject);
}
