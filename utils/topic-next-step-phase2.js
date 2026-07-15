/**
 * Phase 2 — סיכונים, נגזרות מגמה, וחסימות המלצה (ללא UI).
 * נקרא מ topic-next-step-engine.js בלבד.
 */

import { applyIntelligenceDecisionGuards } from "./intelligence-layer-v1/intelligence-decision-guards.js";
import { getIntelligencePriority } from "./intelligence-layer-v1/signal-priority.js";
import {
  INTERVENTION_TYPE_LABEL_HE,
  NEXT_SUPPORT_ADJUSTMENT_LABEL_HE,
  NEXT_SUPPORT_SEQUENCE_ACTION_LABEL_HE,
  OUTCOME_BASED_NEXT_MOVE_LABEL_HE,
  RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE,
  NEXT_CYCLE_DECISION_FOCUS_LABEL_HE,
  diagnosticTypeLabelHe,
} from "./parent-report-ui-explain-he.js";
import {
  meaningExplainSentenceHe,
  preliminarySignalHe,
} from "./parent-report-language/parent-report-hebrew-copy-spec.js";
import { isScienceSubjectId } from "../lib/learning/display-level.js";
import { resolveRowDisplayLevelKey } from "../lib/learning/parent-report-display-level.js";

const VAGUE_FOUNDATION_PHRASE = /חלקים פשוטים יותר|יסוד שעליו הוא נשען/i;

const AGGRESSIVE = new Set([
  "advance_level",
  "advance_grade_topic_only",
  "drop_one_level_topic_only",
  "drop_one_grade_topic_only",
]);

export function isAggressiveStep(step) {
  return AGGRESSIVE.has(step);
}

export function isAdvanceOnlyStep(step) {
  return step === "advance_level" || step === "advance_grade_topic_only";
}

const STEP_LABEL_FALLBACK_HE = "המשך תמיכה מדודה באותו נושא";
const INTERVENTION_LABEL_FALLBACK_HE = "תמיכה מדודה ובדיקה חוזרת לפני שינוי נוסף";

export function interventionTypeLabelHe(intervention) {
  const key = String(intervention || "").trim();
  return INTERVENTION_TYPE_LABEL_HE[key] || INTERVENTION_LABEL_FALLBACK_HE;
}

/**
 * @param {Record<string, unknown>|null|undefined} trend
 * @param {Record<string, unknown>} row
 */
export function buildTrendDerivedSignals(trend, row) {
  const t = trend && typeof trend === "object" ? trend : null;
  const ad = String(t?.accuracyDirection || "unknown");
  const id = String(t?.independenceDirection || "unknown");
  const fd = String(t?.fluencyDirection || "unknown");
  const tc = Number(t?.confidence);
  const trendConfOk = Number.isFinite(tc) && tc >= 0.38;

  const positiveAccuracy = ad === "up";
  const negativeAccuracy = ad === "down";
  const unclearTrend = ad === "unknown" || !trendConfOk;

  const fragileProgressPattern = ad === "up" && id === "down";
  const independenceDeteriorating = id === "down";
  const fluencySupportWithoutAccuracyDrop = fd === "up" && ad !== "down";

  const curAcc = t?.windows?.currentPeriod?.accuracy;
  const recentAcc = t?.windows?.recentShortWindow?.accuracy;
  const recentDifficultyIncrease =
    Number.isFinite(Number(curAcc)) &&
    Number.isFinite(Number(recentAcc)) &&
    Number(recentAcc) < Number(curAcc) - 10;

  const negativeTrendAfterRecentDifficultyIncrease = negativeAccuracy && !!recentDifficultyIncrease;

  const prevAcc = t?.windows?.previousComparablePeriod?.accuracy;
  const periodRegression =
    Number.isFinite(Number(prevAcc)) &&
    Number.isFinite(Number(curAcc)) &&
    Number(curAcc) < Number(prevAcc) - 12;

  const progressSupportsAdvance =
    (ad === "up" || ad === "flat") && !fragileProgressPattern && !independenceDeteriorating && trendConfOk;

  return {
    accuracyDirection: ad,
    independenceDirection: id,
    fluencyDirection: fd,
    trendConfidence01: Number.isFinite(tc) ? tc : null,
    trendConfOk,
    positiveAccuracy,
    negativeAccuracy,
    unclearTrend,
    fragileProgressPattern,
    independenceDeteriorating,
    fluencySupportWithoutAccuracyDrop,
    recentDifficultyIncrease,
    negativeTrendAfterRecentDifficultyIncrease,
    periodRegression,
    progressSupportsAdvance,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>|null|undefined} trend
 * @param {Record<string, unknown>|null|undefined} behaviorProfile
 * @param {ReturnType<typeof buildTrendDerivedSignals>} trendDer
 */
function resolvePhase2BehaviorType(row, behaviorProfile) {
  const prof = String(behaviorProfile?.dominantType || "").trim();
  const ex =
    row?.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object"
      ? row.topicEngineRowSignals
      : null;
  const exDiag = ex?.diagnosticType != null ? String(ex.diagnosticType).trim() : "";
  if (prof && prof !== "undetermined") return prof;
  if (exDiag && exDiag !== "undetermined") return exDiag;
  if (prof) return prof;
  return exDiag || "undetermined";
}

function mergeExplicitTopicEngineRiskFlags(row, base) {
  const ex =
    row?.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object"
      ? row.topicEngineRowSignals
      : null;
  const rf = ex?.riskFlags && typeof ex.riskFlags === "object" ? ex.riskFlags : null;
  if (!rf) return base;
  const out = { ...base };
  if (rf.hintDependenceRisk === true) out.hintDependenceRisk = true;
  if (rf.falsePromotionRisk === true) out.falsePromotionRisk = true;
  if (rf.falseRemediationRisk === true) out.falseRemediationRisk = true;
  if (rf.speedOnlyRisk === true) out.speedOnlyRisk = true;
  if (rf.recentTransitionRisk === true) out.recentTransitionRisk = true;
  return out;
}

export function buildPhase2RiskFlags(row, trend, behaviorProfile, trendDer) {
  const suff = row?.dataSufficiencyLevel;
  const ev = row?.evidenceStrength;
  const behaviorType = resolvePhase2BehaviorType(row, behaviorProfile);
  const hintRate = behaviorProfile?.signals?.hintRate;
  const hintKnown = Number(behaviorProfile?.signals?.hintKnownCount) || 0;
  const modeKey = String(row?.modeKey || "").trim();
  const q = Number(row?.questions) || 0;
  const acc = Math.round(Number(row?.accuracy) || 0);
  const wrongRatio = q > 0 ? Math.max(0, Number(row?.wrong) || 0) / q : 0;

  let insufficientEvidenceRisk =
    suff !== "strong" || ev === "low" || row?.isEarlySignalOnly === true || q < 12;

  let hintDependenceRisk =
    behaviorType === "instruction_friction" ||
    (hintRate != null && hintRate >= 0.32 && hintKnown >= 3);

  let speedOnlyRisk =
    behaviorType === "speed_pressure" ||
    ((modeKey === "speed" || modeKey === "marathon") && acc >= 55 && wrongRatio < 0.32);

  let falsePromotionRisk =
    insufficientEvidenceRisk ||
    hintDependenceRisk ||
    trendDer.fragileProgressPattern ||
    (behaviorType === "fragile_success" && !trendDer.progressSupportsAdvance) ||
    (trendDer.independenceDeteriorating && trendDer.positiveAccuracy);

  const strongKnowledgeGapEvidence =
    behaviorType === "knowledge_gap" &&
    (ev === "strong" || ev === "medium") &&
    q >= 10 &&
    wrongRatio >= 0.28;

  let falseRemediationRisk =
    speedOnlyRisk ||
    (behaviorType === "careless_pattern" && acc >= 58) ||
    (trendDer.positiveAccuracy && behaviorType !== "knowledge_gap") ||
    (trendDer.fluencySupportWithoutAccuracyDrop && behaviorType === "speed_pressure");

  let recentTransitionRisk =
    (String(row?.levelKey) === "hard" &&
      trendDer.negativeAccuracy &&
      trendDer.recentDifficultyIncrease) ||
    (trendDer.periodRegression && trendDer.negativeAccuracy);

  ({
    hintDependenceRisk,
    falsePromotionRisk,
    falseRemediationRisk,
    speedOnlyRisk,
    recentTransitionRisk,
  } = mergeExplicitTopicEngineRiskFlags(row, {
    hintDependenceRisk,
    falsePromotionRisk,
    falseRemediationRisk,
    speedOnlyRisk,
    recentTransitionRisk,
  }));

  return {
    falsePromotionRisk,
    falseRemediationRisk,
    speedOnlyRisk,
    hintDependenceRisk,
    insufficientEvidenceRisk,
    recentTransitionRisk,
    behaviorType,
    strongKnowledgeGapEvidence,
    trendDerSnapshot: {
      fragileProgressPattern: trendDer.fragileProgressPattern,
      progressSupportsAdvance: trendDer.progressSupportsAdvance,
      unclearTrend: trendDer.unclearTrend,
      negativeTrendAfterRecentDifficultyIncrease: trendDer.negativeTrendAfterRecentDifficultyIncrease,
    },
  };
}

/**
 * @param {string} proposed
 * @param {object} ctx
 * @returns {{ step: string, blockers: Array<{ id: string, detailHe: string }>, traceAdds: unknown[], phase2RuleId: string }}
 */
export function applyPhase2GuardsToStep(proposed, ctx) {
  const {
    row,
    riskFlags,
    trendDer,
    behaviorType,
    sufficiencyStrong,
    strongKnowledgeGapEvidence,
  } = ctx;

  let step = proposed;
  const blockers = [];
  const traceAdds = [];
  let phase2RuleId = "phase2_pass_through";
  const subjectId = row?.subjectId || row?.subject || null;
  const displayLevel = resolveRowDisplayLevelKey(subjectId, row);

  const pushTrace = (id, detailHe, fromStep, toStep) => {
    traceAdds.push({
      source: "recommendation",
      phase: "phase2_blocker",
      ruleId: id,
      data: { fromStep, toStep, detailHe },
    });
  };

  const apply = (id, detailHe, newStep) => {
    if (step === newStep) return;
    const fromStep = step;
    blockers.push({ id, detailHe });
    pushTrace(id, detailHe, fromStep, newStep);
    step = newStep;
    phase2RuleId = id;
  };

  const isDrop = step === "drop_one_level_topic_only" || step === "drop_one_grade_topic_only";
  const isAdvance = step === "advance_level" || step === "advance_grade_topic_only";

  if (isScienceSubjectId(subjectId) && isAdvance) {
    apply(
      "science_regular_only_block_advance",
      "במדעים נשארים בתרגול רגיל בלבד.",
      "maintain_and_strengthen"
    );
  }

  if (displayLevel === "advanced" && isDrop) {
    apply(
      "advanced_failure_not_fundamental",
      "האתגר במתקדם היה גבוה כרגע. מומלץ לחזור לתרגול רגיל.",
      "suggest_return_to_regular"
    );
  }

  if (hintDependenceRiskActive(riskFlags) && isAdvance) {
    apply(
      "hint_dependence_block_advance",
      "הילד עדיין נעזר ברמזים גבוהה - לא מקדמים רמה/כיתה אוטומטית.",
      "maintain_and_strengthen"
    );
  }

  if (behaviorType === "fragile_success" && isAdvance) {
    if (!trendDer.progressSupportsAdvance || hintDependenceRiskActive(riskFlags) || !sufficiencyStrong) {
      apply(
        "fragile_success_block_advance",
        "ההצלחה עדיין לא תמיד נשמרת לבד - לא מתקדמים מהר לפני שרואים יותר עצמאות וחזרה עקבית של ההצלחה.",
        "maintain_and_strengthen"
      );
    }
  }

  if (behaviorType === "stable_mastery" && isAggressiveStep(step)) {
    if (riskFlags.insufficientEvidenceRisk || riskFlags.falsePromotionRisk || trendDer.unclearTrend) {
      apply(
        "stable_mastery_guard_advance",
        "הילד מצליח בנושא הזה לאורך זמן - מקדמים רק כשיש מספיק תרגול והסיכון לקידום שווא נמוך.",
        "maintain_and_strengthen"
      );
    }
  }

  if (riskFlags.falsePromotionRisk && isAggressiveStep(step)) {
    apply("false_promotion_guard", "יש חשש שהתקדמות תהיה מוקדמת מדי - לא מקדמים עכשיו.", "maintain_and_strengthen");
  }

  if (trendDer.unclearTrend && isAggressiveStep(step)) {
    const qN = Number(row?.questions) || 0;
    const accN = Math.round(Number(row?.accuracy) || 0);
    const strongPerformanceNoTrend =
      sufficiencyStrong &&
      qN >= 18 &&
      accN >= 88 &&
      row?.excellent === true &&
      !hintDependenceRiskActive(riskFlags) &&
      !riskFlags.falsePromotionRisk &&
      !trendDer.fragileProgressPattern;
    if (!strongPerformanceNoTrend) {
      apply(
        "unclear_trend_cap_aggressive",
        "עדיין לא ברור כיוון הדיוק לאורך זמן - לא עושים שינוי גדול עכשיו.",
        "maintain_and_strengthen"
      );
    }
  }

  if (trendDer.fragileProgressPattern && isAdvance) {
    apply(
      "accuracy_up_independence_down",
      "הדיוק עולה, אבל הילד עדיין צריך יותר עזרה - לא מתקדמים מהר מדי.",
      "maintain_and_strengthen"
    );
  }

  if (riskFlags.speedOnlyRisk && isDropStep(step)) {
    apply("speed_only_block_drop", "קושי שמופיע בעיקר תחת לחץ זמן - לא מורידים רמה/כיתה רק בגלל זה.", "maintain_and_strengthen");
  }

  if (behaviorType === "instruction_friction" && isDropStep(step) && !strongKnowledgeGapEvidence) {
    apply(
      "instruction_friction_soften_drop",
      "ייתכן שהקושי קשור להבנת המשימה או לצורך ברמזים - לא מורידים רמה בלי מספיק תרגול שמראה שזה באמת נחוץ.",
      "remediate_same_level"
    );
  }

  if (behaviorType === "careless_pattern" && isDropStep(step)) {
    apply("careless_pattern_before_drop", "דפוס רשלנות - מעדיפים חיזוק ברמה לפני ירידה.", "remediate_same_level");
  }

  if (behaviorType === "knowledge_gap" && isDropStep(step)) {
    if (trendDer.positiveAccuracy && !trendDer.negativeTrendAfterRecentDifficultyIncrease) {
      apply(
        "knowledge_gap_respect_positive_trend",
        "יש סימן לקושי, אבל הדיוק משתפר - עדיף לחזק באותה רמה לפני שמורידים רמה.",
        "remediate_same_level"
      );
    }
  }

  if (riskFlags.falseRemediationRisk && isDropStep(step)) {
    if (riskFlags.speedOnlyRisk || (trendDer.positiveAccuracy && behaviorType !== "knowledge_gap")) {
      apply("false_remediation_guard", "יש חשש לתרגול כבד מדי - עדיף חיזוק קצר וממוקד.", "remediate_same_level");
    }
  }

  if (trendDer.negativeTrendAfterRecentDifficultyIncrease && step === "drop_one_grade_topic_only") {
    apply(
      "recent_transition_caution",
      "אחרי קושי אחרון נראית ירידה - כדאי לבדוק בזהירות לפני שמורידים כיתה.",
      "remediate_same_level"
    );
  }

  if (trendDer.fluencySupportWithoutAccuracyDrop && riskFlags.speedOnlyRisk && step === "drop_one_level_topic_only") {
    apply(
      "fluency_positive_speed_context",
      "יש שיפור בקצב בלי ירידה בדיוק - לא מורידים רמה רק בגלל מהירות.",
      "maintain_and_strengthen"
    );
  }

  if (riskFlags.insufficientEvidenceRisk && isAggressiveStep(step)) {
    apply("insufficient_evidence_cap_phase2", "אין מספיק מידע לשינוי גדול עכשיו.", "maintain_and_strengthen");
  }

  const qR = Number(row?.questions) || 0;
  const accR = Math.round(Number(row?.accuracy) || 0);
  const wrongRR = qR > 0 ? Math.max(0, Number(row?.wrong) || 0) / qR : 0;
  const modeR = String(row?.modeKey || "").trim();
  const fragileLikeProfile =
    behaviorType === "fragile_success" ||
    behaviorType === "instruction_friction" ||
    (behaviorType === "speed_pressure" && (modeR === "speed" || modeR === "marathon"));
  if (
    step === "maintain_and_strengthen" &&
    fragileLikeProfile &&
    behaviorType !== "stable_mastery" &&
    sufficiencyStrong &&
    qR >= 10 &&
    wrongRR >= 0.15 &&
    accR < 88
  ) {
    apply(
      "risk_profile_prefer_remediate_over_maintain",
      "זוהה דפוס סיכון/שבריריות - מעדיפים חיזוק ממוקד באותה רמה על פני עבודה כללית בלבד.",
      "remediate_same_level"
    );
  }

  const originalStep = step;
  const ivResult = applyIntelligenceDecisionGuards(step, {
    intelligenceV1: ctx?.intelligenceV1 || null,
  });
  if (ivResult.applied) {
    step = ivResult.step;
    traceAdds.push({
      source: "intelligence",
      phase: "phase5_intelligence_guard",
      ruleId: "intelligence_decision_guards",
      data: {
        beforeStep: originalStep,
        afterStep: ivResult.step,
        blockers: ivResult.blockers,
        intelligenceSnapshot: ctx.intelligenceV1 || null,
      },
    });
  }

  return { step, blockers, traceAdds, phase2RuleId };
}

/**
 * Phase 7 — ריסון אבחוני: לא משנים רמה בצורה חדה כשהמידע חלקי או מצומצם.
 * @param {string} step
 * @param {{ restraint?: Record<string, unknown>, rootCause?: Record<string, unknown> }} ctx
 */
export function applyPhase7RestraintGuards(step, ctx) {
  const restraint = ctx?.restraint && typeof ctx.restraint === "object" ? ctx.restraint : {};
  const rootCause = ctx?.rootCause && typeof ctx.rootCause === "object" ? ctx.rootCause : {};
  const shouldAvoid = !!restraint.shouldAvoidStrongConclusion;
  const rc = String(rootCause.rootCause || "");

  let out = step;
  const blockers = [];
  const traceAdds = [];
  let phase7RuleId = "phase7_pass";

  const pushTrace = (id, detailHe, fromStep, toStep) => {
    traceAdds.push({
      source: "recommendation",
      phase: "phase7_restraint",
      ruleId: id,
      data: { fromStep, toStep, detailHe },
    });
  };

  const apply = (id, detailHe, newStep) => {
    if (out === newStep) return;
    const fromStep = out;
    blockers.push({ id, detailHe });
    pushTrace(id, detailHe, fromStep, newStep);
    out = newStep;
    phase7RuleId = id;
  };

  if (shouldAvoid) {
    if (isAdvanceOnlyStep(out)) {
      apply(
        "phase7_restraint_cap_advance",
        "הנתונים עדיין חלקיים או לא אחידים - לא מקדמים כיתה או רמת קושי כרגע.",
        "maintain_and_strengthen"
      );
    }
    if (isDropStep(out)) {
      apply(
        "phase7_restraint_soften_drop",
        "תרגולים נוספים יעזרו להציג תמונה ברורה יותר.",
        "remediate_same_level"
      );
    }
  }

  if (rc === "insufficient_evidence" && isDropStep(out)) {
    apply(
      "phase7_insufficient_evidence_drop",
      "תרגולים נוספים יעזרו להציג תמונה ברורה יותר.",
      "remediate_same_level"
    );
  }

  if (rc === "early_stage_instability" && isDropStep(out) && restraint.conclusionStrength !== "strong") {
    apply(
      "phase7_early_stage_soften_drop",
      "עדיין מוקדם להוריד רמה - קודם מנסים חיזוק קצר.",
      "remediate_same_level"
    );
  }

  return { step: out, blockers, traceAdds, phase7RuleId };
}

/**
 * ריכוך ניסוח הורה כשהמנוע מרסן כיוון ברור.
 * @param {{ reasonHe?: string, parentHe?: string, studentHe?: string }} copy
 */
export function mergePhase7SoftHebrewCopy(copy, restraint, rootCause) {
  const c = copy && typeof copy === "object" ? copy : {};
  const addParent = [];
  const cs = String(restraint?.conclusionStrength || "");
  const level = String(restraint?.diagnosticRestraint?.level || "");
  if (cs === "withheld" || level === "insufficient") {
    addParent.push("עדיין מוקדם לקבוע כיוון ברור - עדיף תרגול קצר ושגרתי באותה רמה.");
  } else if (cs === "tentative" || restraint?.shouldAvoidStrongConclusion) {
    addParent.push("מסכמים בזהירות: צעדים קטנים וברורים, בלי קפיצות.");
  }
  const rc = String(rootCause?.rootCause || "");
  if (rc === "speed_pressure") {
    addParent.push("חלק מהקושי עלול להיות לחץ מהירות - שווה לנסות את אותה רמה במצב רגוע יותר לפני הורדה.");
  }
  if (rc === "instruction_friction") {
    addParent.push("מומלץ לוודא שהמשימה מובנת לפני רמזים נוספים.");
  }
  if (rc === "insufficient_evidence") {
    addParent.push("נמשיך לאסוף נתון לפני החלטה גדולה.");
  }
  if (!addParent.length) return c;
  const glue = " " + addParent.join(" ");
  return {
    ...c,
    parentHe: (c.parentHe || "") + glue,
  };
}

/** @param {string} rootCauseId */
export function pickRecommendedInterventionType(rootCauseId, finalStep) {
  const rc = String(rootCauseId || "mixed_signal");
  if (finalStep === "maintain_and_strengthen" && rc === "mixed_signal") return "monitor_before_escalation";
  const map = {
    speed_pressure: "reduce_time_pressure",
    instruction_friction: "clarify_instruction_pattern",
    careless_execution: "stabilize_accuracy",
    weak_independence: "guided_to_independent_transition",
    knowledge_gap: "target_core_skill_gap",
    insufficient_evidence: "monitor_before_escalation",
    early_stage_instability: "monitor_before_escalation",
    mixed_signal: "monitor_before_escalation",
    retention_fragility: "monitor_before_escalation",
    language_load: "clarify_instruction_pattern",
    transition_gap: "target_core_skill_gap",
  };
  return map[rc] || "monitor_before_escalation";
}

/** פעולת בדיקה מומלצת (מזהה) — לצרכני API */
export function pickRecommendedEvidenceAction(rootCauseId, conclusionStrength) {
  const rc = String(rootCauseId || "");
  const cs = String(conclusionStrength || "");
  if (rc === "insufficient_evidence" || cs === "withheld") return "collect_controlled_practice";
  if (rc === "speed_pressure") return "accuracy_first_same_level";
  if (rc === "instruction_friction") return "clarify_task_reduce_hints";
  if (rc === "weak_independence") return "fade_support_gradually";
  if (rc === "knowledge_gap") return "targeted_review_errors";
  if (rc === "careless_execution") return "pause_check_before_submit";
  return "continue_short_sessions";
}

export function buildPhase7RecommendationFields(p) {
  const {
    displayName,
    finalStep,
    restraint,
    rootCause,
    riskFlags,
    trendDer,
    behaviorType,
    legacyRuleId,
  } = p;
  const rc = String(rootCause?.rootCause || "mixed_signal");
  const intervention = pickRecommendedInterventionType(rc, finalStep);
  const interventionLabelHe = interventionTypeLabelHe(intervention);
  const evidenceAction = pickRecommendedEvidenceAction(rc, restraint?.conclusionStrength);
  const evidenceActionHe =
    evidenceAction === "collect_controlled_practice"
      ? "לצבור עוד תרגול קצר באותה רמת קושי, עם דגש על דיוק ולא על קפיצת רמה."
      : evidenceAction === "accuracy_first_same_level"
        ? "אותה רמת קושי במצב רגוע - דיוק לפני מהירות."
        : evidenceAction === "clarify_task_reduce_hints"
          ? "לקרוא את ניסוח המשימה ביחד ואז לנסות לפני רמז נוסף."
          : evidenceAction === "fade_support_gradually"
            ? "להפחית בהדרגה את ההכוונה אחרי הצלחה קטנה ברורה."
            : evidenceAction === "targeted_review_errors"
              ? "לחזור על טעויות ספציפיות באותה רמה עד לייצוב."
              : evidenceAction === "pause_check_before_submit"
                ? "עצירה קצרה לפני שליחה - בדיקה מול הניסוח."
                : "להמשיך מפגשים קצרים כדי לחדד את התמונה.";

  const nar = String(rootCause?.rootCauseNarrativeHe || "").trim();
  const stepLab = stepLabelHe(finalStep);
  const reasoningParts = [];
  reasoningParts.push(`לגבי ${displayName}: ${nar || "לפי התרגול האחרון, זה הכיוון שעולה כרגע."}`);
  reasoningParts.push(`הצעד שנבחר: ${stepLab}.`);
  reasoningParts.push(`מה מומלץ לעשות עכשיו: ${interventionLabelHe}.`);
  if (legacyRuleId) reasoningParts.push(preliminarySignalHe());
  if (riskFlags?.speedOnlyRisk) reasoningParts.push("הופעל הקשר מהירות.");
  if (trendDer?.fragileProgressPattern) reasoningParts.push("ההצלחה עדיין לא יציבה לגמרי.");
  if (behaviorType && behaviorType !== "undetermined") {
    reasoningParts.push(meaningExplainSentenceHe(null, behaviorType));
  }

  const alt = Array.isArray(restraint?.alternativeExplanations) ? restraint.alternativeExplanations : [];
  const whatWouldIncreaseConfidenceHe =
    alt.length > 0
      ? alt.join(" ")
      : "עוד שאלות בתקופה שנבחרה, כיוון ברור יותר בדיוק, ופחות צורך ברמזים - יעזרו להבין את התמונה טוב יותר.";

  const whyNot =
    String(restraint?.diagnosticCautionHe || "").trim() ||
    (restraint?.conclusionStrength === "strong"
      ? "אין סימן מיוחד שמחייב לעצור בשלב זה."
      : "כרגע שומרים על ניסוח זהיר בגלל היקף התרגול והמגמה.");

  return {
    recommendationReasoningHe: reasoningParts.join(" "),
    recommendedInterventionType: intervention,
    recommendedEvidenceAction: evidenceAction,
    recommendedEvidenceActionHe: evidenceActionHe,
    whatWouldIncreaseConfidenceHe,
    whyNotAStrongerConclusionHe: whyNot,
  };
}

/**
 * Phase 9 — מצב תרגול, העברה, ופעולות ממוקדות טעות/זיכרון.
 * @param {object} p
 * @param {string} [p.dominantMistakePattern]
 * @param {string} [p.learningStage]
 * @param {string} [p.retentionRisk]
 * @param {string} [p.transferReadiness]
 * @param {string} [p.rootCause]
 * @param {Record<string, boolean>|null} [p.riskFlags]
 */
export function buildPhase9RecommendationOverlay(p) {
  const mp = String(p?.dominantMistakePattern || "");
  const ls = String(p?.learningStage || "");
  const tr = String(p?.transferReadiness || "");
  const rr = String(p?.retentionRisk || "");
  const hint = !!p?.riskFlags?.hintDependenceRisk;

  let recommendedPracticeMode = "slow_guided_accuracy";
  if (ls === "insufficient_longitudinal_evidence" || mp === "insufficient_mistake_evidence") {
    recommendedPracticeMode = "observe_only";
  } else if (ls === "regression_signal" || ls === "fragile_retention" || rr === "high") {
    recommendedPracticeMode = "review_and_hold";
  } else if (mp === "concept_confusion" || mp === "procedure_break") {
    recommendedPracticeMode = "error_reduction_loop";
  } else if (mp === "speed_driven_error") {
    recommendedPracticeMode = "slow_guided_accuracy";
  } else if (mp === "support_dependent_success" || mp === "instruction_misread") {
    recommendedPracticeMode = "guided_release";
  } else if (ls === "transfer_emerging" || (ls === "stable_control" && tr === "emerging")) {
    recommendedPracticeMode = "stabilize_then_transfer";
  } else if (ls === "early_acquisition") {
    recommendedPracticeMode = "observe_only";
  }

  let recommendedTransferStep = "hold_same_conditions";
  if (tr === "ready" && ls === "stable_control" && !hint) {
    recommendedTransferStep = "micro_transfer_same_topic";
  } else if (tr === "emerging" && rr === "low" && ls !== "fragile_retention" && ls !== "regression_signal") {
    recommendedTransferStep = "micro_transfer_same_topic";
  } else if (tr === "not_ready" || ls === "regression_signal" || ls === "fragile_retention") {
    recommendedTransferStep = "hold_same_conditions";
  } else {
    recommendedTransferStep = "limited_probe_same_level";
  }

  let reviewBeforeAdvanceHe = "";
  if (rr === "high" || ls === "fragile_retention" || ls === "regression_signal") {
    reviewBeforeAdvanceHe =
      "לחזור על אותה רמה בכמה תרגולים קצרים לפני שינוי רמת קושי או פתיחת נושא חדש.";
  } else if ((mp === "concept_confusion" || mp === "procedure_break") && tr !== "ready") {
    reviewBeforeAdvanceHe = "לסגור מעגל טעויות דומות באותה רמה לפני קפיצה קדימה.";
  } else if (hint && tr !== "ready") {
    reviewBeforeAdvanceHe = "הילד עדיין נעזר ברמזים, לכן כדאי להמשיך בתרגול רגיל לפני מעבר למתקדם.";
  }

  let mistakeFocusedActionHe = "";
  if (mp === "speed_driven_error") {
    mistakeFocusedActionHe = "משימות קצרות בלי שעון - דיוק לפני מהירות.";
  } else if (mp === "instruction_misread") {
    mistakeFocusedActionHe = "קריאה משותפת של המשימה וניסוח במילים פשוטות לפני חישוב.";
  } else if (mp === "support_dependent_success") {
    mistakeFocusedActionHe = "ניסיון עצמאי קצר ואז השוואה יחד - בלי לבטל עזרה פתאום.";
  } else if (mp === "concept_confusion") {
    mistakeFocusedActionHe = "חזרה על טעות טיפוסית עם הסבר מושגי אחד בכל מפגש.";
  } else if (mp === "procedure_break") {
    mistakeFocusedActionHe = "לכתוב סדר פעולות על טיוטה ולעבור צעד אחר צעד.";
  } else if (mp === "insufficient_mistake_evidence") {
    mistakeFocusedActionHe = "לתעד 2–3 מפגשים קצרים באותה רמה לפני שמזקקים סוג טעות.";
  }

  let memoryFocusedActionHe = "";
  if (ls === "early_acquisition") {
    memoryFocusedActionHe = "תרגול קצר וחוזר - בלי ציפייה להעברה מהירה.";
  } else if (ls === "partial_stabilization") {
    memoryFocusedActionHe = "לשמור על אותו אופן תרגול שבוע נוסף ולבחון שיפור קטן.";
  } else if (ls === "stable_control") {
    memoryFocusedActionHe = "לשמור על אותו קצב; לשבח התמדה לפני שמוסיפים משתנה.";
  } else if (ls === "fragile_retention") {
    memoryFocusedActionHe = "לחזק חזרה על אותה רמה - השימור עדיין שביר.";
  } else if (ls === "regression_signal") {
    memoryFocusedActionHe = "לפשט משימה ולקצר מפגש עד שיתייצב דיוק.";
  } else if (ls === "transfer_emerging") {
    memoryFocusedActionHe = "אפשר ניסוי קטן בתוך הנושא עם בדיקה מהירה בסוף.";
  } else if (ls === "insufficient_longitudinal_evidence") {
    memoryFocusedActionHe = "לא לסכם מגמה ארוכה עדיין - לבדוק שוב אחרי עוד קצת תרגול.";
  }

  return {
    recommendedPracticeMode,
    recommendedTransferStep,
    reviewBeforeAdvanceHe,
    mistakeFocusedActionHe,
    memoryFocusedActionHe,
  };
}

/**
 * Phase 10 — כיוון התאמת תמיכה (טקסט + מזהה) לפי תגובה להתערבות ובדיקה מחדש של הנתונים.
 * @param {object} p
 */
export function buildPhase10RecommendationOverlay(p) {
  const rti = String(p?.responseToIntervention || "not_enough_evidence");
  const san = String(p?.supportAdjustmentNeed || "monitor_only");
  const rec = String(p?.recalibrationNeed || "none");
  const cf = String(p?.conclusionFreshness || "medium");
  const fs = String(p?.freshnessState || "unknown");
  const weakEff = rti === "not_enough_evidence";
  const staleish = fs === "stale" || fs === "aging" || cf === "low" || cf === "expired";
  const finalStep = String(p?.finalStep || "");

  let nextSupportAdjustment = "continue_same_plan";
  if (weakEff && (rec === "structured_recheck" || cf === "expired" || fs === "stale")) {
    nextSupportAdjustment = "recheck_before_advancing";
  } else if (weakEff) {
    nextSupportAdjustment = "pause_and_observe";
  } else if (rti === "regression_under_support") {
    nextSupportAdjustment = "switch_strategy";
  } else if (rti === "stalled_response") {
    nextSupportAdjustment = san === "change_strategy" ? "switch_strategy" : "continue_and_tighten_focus";
  } else if (rti === "over_supported_progress") {
    nextSupportAdjustment = "continue_and_reduce_support";
  } else if (rti === "independence_growing") {
    nextSupportAdjustment = "continue_and_reduce_support";
  } else if (rti === "early_positive_response") {
    nextSupportAdjustment = staleish || rec !== "none" ? "recheck_before_advancing" : "continue_same_plan";
  } else if (rti === "mixed_response") {
    nextSupportAdjustment = "continue_and_tighten_focus";
  }

  if (weakEff && (isAdvanceOnlyStep(finalStep) || isAggressiveStep(finalStep))) {
    nextSupportAdjustment = "recheck_before_advancing";
  }

  const nextSupportAdjustmentHe =
    NEXT_SUPPORT_ADJUSTMENT_LABEL_HE[nextSupportAdjustment] ||
    NEXT_SUPPORT_ADJUSTMENT_LABEL_HE.continue_same_plan;

  let continueWhatWorksHe = "";
  let changeBecauseHe = "";
  let recheckBeforeEscalationHe = "";
  let evidenceStillMissingHe = "";

  if (weakEff) {
    evidenceStillMissingHe =
      "עדיין אין מספיק בסיס לדעת אם התמיכה מחזיקה את ההתקדמות - לא לסגור מוקדם מדי.";
  }
  if (rti === "early_positive_response" || rti === "independence_growing") {
    continueWhatWorksHe =
      "להמשיך באותו סוג תרגול קצר וקבוע - זה מה שנראה שעובד כרגע, ולבדוק את הדיוק אחרי כל מפגש.";
  }
  if (rti === "stalled_response" || rti === "regression_under_support") {
    changeBecauseHe =
      "התמונה לא משתפרת מספיק עם אותה נוסחה - לדייק מיקוד או לשנות כיוון, לא לחזור על אותו טקסט בלי שינוי.";
  }
  if (rti === "over_supported_progress") {
    changeBecauseHe =
      "ההצלחה בעיקר עם הכוונה - עדיין לא נכון להסיק שליטה מלאה בלי תמיכה.";
    continueWhatWorksHe =
      "לשמור על אותה רמת קושי, ולנסות קטע קצר יותר עם פחות הכוונה באמצע - רק אם זה נשאר נוח.";
  }
  if (staleish || rec === "structured_recheck" || rec === "light_review") {
    recheckBeforeEscalationHe =
      "המידע פחות עדכני - לא להסתמך עליו לבד לפני שמעלים קושי או משנים כיוון.";
  }
  if (rti === "mixed_response") {
    changeBecauseHe = "תגובה מעורבת לתמיכה - חלק מתקדם, חלק עדיין תלוי; לדייק מבנה קצר.";
  }

  return {
    nextSupportAdjustment,
    nextSupportAdjustmentHe,
    continueWhatWorksHe,
    changeBecauseHe,
    recheckBeforeEscalationHe,
    evidenceStillMissingHe,
  };
}

/**
 * Phase 11 — פעולת רצף + ניסוח שמבדיל ומונע חזרה ריקה.
 * @param {object} p
 */
export function buildPhase11SequenceOverlay(p) {
  const seq = String(p?.supportSequenceState || "");
  const rti = String(p?.responseToIntervention || "");
  const nextAdj = String(p?.nextSupportAdjustment || "");
  const rot = String(p?.recommendationRotationNeed || "");
  const cf = String(p?.conclusionFreshness || "");
  const sim = String(p?.adviceSimilarityLevel || "");
  const rep = String(p?.strategyRepetitionRisk || "");
  const fat = String(p?.strategyFatigueRisk || "");
  const rec = String(p?.recalibrationNeed || "");
  const fs = String(p?.freshnessState || "");

  let nextSupportSequenceAction = "continue_same_sequence";
  if (seq === "insufficient_sequence_evidence") {
    nextSupportSequenceAction = "observe_without_new_push";
  } else if (seq === "sequence_exhausted" || rot === "meaningful_rotation" || rep === "high") {
    nextSupportSequenceAction = "pause_repeat_and_switch";
  } else if (seq === "sequence_ready_for_release" || rti === "over_supported_progress" || rti === "independence_growing") {
    nextSupportSequenceAction = "begin_release_sequence";
  } else if (seq === "sequence_stalled" || rti === "stalled_response") {
    nextSupportSequenceAction = "continue_with_tighter_target";
  } else if (
    (cf === "expired" || cf === "low" || fs === "stale") &&
    (sim === "mostly_repeated" || rot === "meaningful_rotation" || rec === "structured_recheck")
  ) {
    nextSupportSequenceAction = "short_reset_then_retry";
  } else if (nextAdj === "pause_and_observe" || nextAdj === "recheck_before_advancing") {
    nextSupportSequenceAction = "observe_without_new_push";
  } else if (nextAdj === "switch_strategy") {
    nextSupportSequenceAction = "pause_repeat_and_switch";
  } else if (fat === "high" && rti !== "early_positive_response") {
    nextSupportSequenceAction = "pause_repeat_and_switch";
  }

  const nextSupportSequenceActionHe =
    NEXT_SUPPORT_SEQUENCE_ACTION_LABEL_HE[nextSupportSequenceAction] ||
    NEXT_SUPPORT_SEQUENCE_ACTION_LABEL_HE.continue_same_sequence;

  let whyThisIsDifferentNowHe = "";
  let whyWeShouldNotRepeatSameSupportHe = "";
  let whatMustHappenBeforeReleaseHe = "";
  let whatSignalsSequenceSuccessHe = "";

  if (rot === "meaningful_rotation" || sim === "mostly_repeated") {
    whyWeShouldNotRepeatSameSupportHe =
      "עדיף לא לחזור על אותו סוג תרגול בלי בדיקה מחודשת - אחרת זה נשמע חדש אבל לא באמת משתנה.";
  }
  if (sim === "clearly_new" || rot === "light_variation") {
    whyThisIsDifferentNowHe = "יש שינוי קטן בכיוון או במטרה - לא רק עוד סיבוב על אותו ניסוח.";
  }
  if (seq === "sequence_ready_for_release" && rti !== "independence_growing") {
    whatMustHappenBeforeReleaseHe =
      "לפני הפחתת עזרה מלאה: שני מפגשים קצרים עם הצלחה קטנה בלי הכוונה באמצע, ואז בדיקה קצרה בסוף.";
  }
  if (seq === "continuing_sequence" || seq === "early_sequence") {
    whatSignalsSequenceSuccessHe =
      "סימני הצלחה: דיוק שנשמר באותה רמה ופחות טעויות חוזרות מאותו סוג - גם אם עדיין עם ליווי.";
  }
  if (seq === "sequence_ready_for_release") {
    whatSignalsSequenceSuccessHe =
      "סימן שאפשר להפחית מעט עזרה: העצמאות קצת עולה או שיש הצלחה קצרה בלי עזרה באמצע - עדיין לא לבד לגמרי, אבל בכיוון טוב.";
  }

  return {
    nextSupportSequenceAction,
    nextSupportSequenceActionHe,
    whyThisIsDifferentNowHe,
    whyWeShouldNotRepeatSameSupportHe,
    whatMustHappenBeforeReleaseHe,
    whatSignalsSequenceSuccessHe,
  };
}

/**
 * Phase 12 — החלטת המשך לפי מה נוסה לאחרונה ומעקב תוצאות.
 * @param {object} p
 */
export function buildPhase12ContinuationOverlay(p) {
  const match = String(p?.expectedVsObservedMatch || "");
  const mem = String(p?.recommendationMemoryState || "");
  const carry = String(p?.recommendationCarryover || "");
  const ft = String(p?.followThroughSignal || "");
  const sim = String(p?.adviceSimilarityLevel || "");
  const rot = String(p?.recommendationRotationNeed || "");
  const rti = String(p?.responseToIntervention || "");
  const seqAct = String(p?.nextSupportSequenceAction || "");
  const exp = String(p?.expectedOutcomeType || "");
  const obs = String(p?.observedOutcomeState || "");
  const rep = String(p?.strategyRepetitionRisk || "");
  const fs = String(p?.freshnessState || "");
  const cf = String(p?.conclusionFreshness || "");
  /** QA: כיוון קודם חזק לא מצדיק pivot אגרסיבי כשהמידע הנוכחי לא מספיק עדכני */
  const evidenceStale = fs === "stale" || cf === "expired" || cf === "low";

  let recommendationContinuationDecision = "continue_but_refine";
  if (match === "misaligned" && (rot === "meaningful_rotation" || sim === "mostly_repeated")) {
    recommendationContinuationDecision = "reset_and_rebuild_signal";
  } else if (evidenceStale && match === "misaligned") {
    recommendationContinuationDecision = "do_not_repeat_without_new_evidence";
  } else if (match === "misaligned" && (mem === "usable_memory" || mem === "strong_memory")) {
    recommendationContinuationDecision = "pivot_from_prior_path";
  } else if (
    match === "not_enough_evidence" &&
    (sim === "mostly_repeated" || rep === "high" || rot === "meaningful_rotation")
  ) {
    recommendationContinuationDecision = "do_not_repeat_without_new_evidence";
  } else if ((sim === "mostly_repeated" || rep === "high") && match !== "aligned") {
    recommendationContinuationDecision = "do_not_repeat_without_new_evidence";
  } else if (
    match === "aligned" &&
    !evidenceStale &&
    (mem === "usable_memory" || mem === "strong_memory") &&
    (exp === "release_readiness" || seqAct === "begin_release_sequence") &&
    (rti === "independence_growing" || rti === "over_supported_progress" || obs === "partial_progress")
  ) {
    recommendationContinuationDecision = "begin_controlled_release";
  } else if (match === "aligned" && ft === "likely_followed" && sim !== "mostly_repeated") {
    recommendationContinuationDecision = "continue_with_same_core";
  } else if (match === "partly_aligned" || seqAct === "continue_with_tighter_target") {
    recommendationContinuationDecision = "continue_but_refine";
  }

  if (mem === "no_memory" && recommendationContinuationDecision !== "reset_and_rebuild_signal") {
    recommendationContinuationDecision = "continue_but_refine";
  }
  if (
    (mem === "light_memory" || evidenceStale) &&
    recommendationContinuationDecision === "begin_controlled_release"
  ) {
    recommendationContinuationDecision = "continue_but_refine";
  }

  let outcomeBasedNextMove = "collect_new_evidence_first";
  if (recommendationContinuationDecision === "reset_and_rebuild_signal") {
    outcomeBasedNextMove = "brief_reset_then_compare";
  } else if (recommendationContinuationDecision === "pivot_from_prior_path") {
    outcomeBasedNextMove = "switch_path_type";
  } else if (recommendationContinuationDecision === "begin_controlled_release") {
    outcomeBasedNextMove = "reduce_support_and_check_transfer";
  } else if (recommendationContinuationDecision === "continue_with_same_core") {
    outcomeBasedNextMove = "keep_current_direction";
  } else if (recommendationContinuationDecision === "continue_but_refine") {
    outcomeBasedNextMove = mem === "no_memory" || match === "not_enough_evidence" ? "collect_new_evidence_first" : "tighten_goal_definition";
  } else if (recommendationContinuationDecision === "do_not_repeat_without_new_evidence") {
    outcomeBasedNextMove = "collect_new_evidence_first";
  } else if (match === "misaligned") {
    outcomeBasedNextMove = "switch_path_type";
  }

  let whyWeThinkThisPathWorkedHe = "";
  let whyWeThinkThisPathDidNotLandHe = "";
  let whatNeedsFreshEvidenceNowHe = "";
  let whatShouldCarryForwardHe = "";

  if (match === "aligned" && (ft === "likely_followed" || ft === "possibly_followed")) {
    whyWeThinkThisPathWorkedHe =
      "מה שנעשה בבית מתיישר עם מה שניסינו לשפר - אפשר להמשיך בזהירות, בלי להחליף הכל בבת אחת.";
  }
  if (match === "misaligned" || obs === "contradictory_response") {
    whyWeThinkThisPathDidNotLandHe =
      "המטרה הייתה ברורה, אבל בפועל עדיין אין התאמה מספקת לציפייה - לעצור ולבדוק לפני עוד אותו סיבוב.";
  }
  if (mem === "no_memory" || match === "not_enough_evidence") {
    whatNeedsFreshEvidenceNowHe =
      "בלי לבנות על ניחוש: שני מפגשים קצרים עם רישום קטן בסוף - מה הצליח בלי עזרה באמצע.";
  }
  if (match === "aligned" && carry === "clearly_visible") {
    whatShouldCarryForwardHe = "להשאיר את אותו שלד תרגול קצר, ורק לדייק מטרה או טיימינג - בלי להחליף הכל.";
  }

  const recommendationContinuationDecisionHe =
    RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE[recommendationContinuationDecision] ||
    RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE.continue_but_refine;
  const outcomeBasedNextMoveHe =
    OUTCOME_BASED_NEXT_MOVE_LABEL_HE[outcomeBasedNextMove] ||
    OUTCOME_BASED_NEXT_MOVE_LABEL_HE.collect_new_evidence_first;

  return {
    recommendationContinuationDecision,
    recommendationContinuationDecisionHe,
    outcomeBasedNextMove,
    outcomeBasedNextMoveHe,
    whyWeThinkThisPathWorkedHe,
    whyWeThinkThisPathDidNotLandHe,
    whatNeedsFreshEvidenceNowHe,
    whatShouldCarryForwardHe,
  };
}

/**
 * Phase 13 — מיקוד הסבב הבא + תנאים להחלטה (מה לבדוק עכשיו).
 * @param {object} p
 */
export function buildPhase13NextCycleOverlay(p) {
  const gate = String(p?.gateState || "");
  const rel = String(p?.releaseGate || "");
  const piv = String(p?.pivotGate || "");
  const recg = String(p?.recheckGate || "");
  const adv = String(p?.advanceGate || "");
  const fs = String(p?.freshnessState || "");
  const cf = String(p?.conclusionFreshness || "");
  const rec = String(p?.recalibrationNeed || "");
  const match = String(p?.expectedVsObservedMatch || "");
  const mem = String(p?.recommendationMemoryState || "");
  const rti = String(p?.responseToIntervention || "");
  const ls = String(p?.learningStage || "");
  const td = p?.trendDer && typeof p.trendDer === "object" ? p.trendDer : {};
  const indepUp = String(td.independenceDirection || "") === "up" || String(p?.independenceProgress || "") === "improving";
  const stale = fs === "stale" || cf === "expired" || cf === "low" || rec === "structured_recheck";

  let nextCycleDecisionFocus = "prove_current_direction";
  if (stale || recg === "forming") {
    nextCycleDecisionFocus = "refresh_baseline_before_decision";
  } else if (piv === "forming" || (match === "misaligned" && mem !== "no_memory")) {
    nextCycleDecisionFocus = "test_if_path_is_working";
  } else if (ls === "fragile_retention" || ls === "regression_signal" || adv === "blocked") {
    nextCycleDecisionFocus = "stabilize_before_advance";
  } else if (rel === "forming" && indepUp) {
    nextCycleDecisionFocus = "prepare_for_controlled_release";
  } else if (rel === "forming" || rel === "pending" || rti === "over_supported_progress") {
    nextCycleDecisionFocus = "check_independence_before_release";
  } else if (adv === "forming") {
    nextCycleDecisionFocus = "stabilize_before_advance";
  }

  const nextCycleDecisionFocusHe =
    NEXT_CYCLE_DECISION_FOCUS_LABEL_HE[nextCycleDecisionFocus] ||
    NEXT_CYCLE_DECISION_FOCUS_LABEL_HE.prove_current_direction;

  const whatWouldJustifyReleaseHe =
    "לפני שמפחיתים עזרה: שני מפגשים קצרים עם הצלחה בסוף בלי הכוונה באמצע - עדיין לא עצמאות מלאה.";
  const whatWouldJustifyAdvanceHe =
    "לפני קפיצת רמה: הצלחה שחוזרת באותה רמת קושי, סיכון שימור לא גבוה, ונתון עדכני.";
  const whatWouldTriggerPivotHe =
    "אם גם בסבב הבא אותו דפוס בלי שיפור - לעבור לכיוון מעט שונה, לא עוד אותה חזרה.";
  const whatWouldTriggerRecheckHe =
    "כשהמידע חלקי או ישן - כדאי לעשות בדיקה קצרה לפני שמחליטים לשנות כיוון.";
  const whatEvidenceWeStillNeedHe = String(p?.targetSuccessSignalHe || "").trim()
    ? `${String(p?.targetSuccessSignalHe || "").trim()} · ${String(p?.targetObservationWindowLabelHe || "").trim()}.`
    : "מפגש קצר עם רישום קטן בסוף - מה הצליח בפועל.";

  return {
    nextCycleDecisionFocus,
    nextCycleDecisionFocusHe,
    whatWouldJustifyReleaseHe,
    whatWouldJustifyAdvanceHe,
    whatWouldTriggerPivotHe,
    whatWouldTriggerRecheckHe,
    whatEvidenceWeStillNeedHe,
  };
}

export { buildFoundationOrderingPhase14, buildPhase14RecommendationOverlay } from "./parent-report-foundation-ordering.js";

/**
 * Phase 8 - כיול עומס תרגול ריאלי לבית (לא "להרבה להתאמן").
 * @param {object} p
 * @param {string} p.rootCause
 * @param {string} p.conclusionStrength
 * @param {boolean} [p.shouldAvoidStrongConclusion]
 * @param {string} [p.diagnosticRestraintLevel]
 * @param {number} p.q
 * @param {number} p.accuracy
 * @param {string} [p.evidenceStrength]
 * @param {string} [p.dataSufficiencyLevel]
 * @param {string} p.interventionIntensity
 * @param {string} [p.retentionRisk]
 * @param {string} [p.learningStage]
 */
export function buildPracticeCalibration(p) {
  const rc = String(p?.rootCause || "");
  const cs = String(p?.conclusionStrength || "");
  const shouldAvoid = !!p?.shouldAvoidStrongConclusion;
  const level = String(p?.diagnosticRestraintLevel || "");
  const q = Number(p?.q) || 0;
  const acc = Math.round(Number(p?.accuracy) || 0);
  const ev = String(p?.evidenceStrength || "");
  const suff = String(p?.dataSufficiencyLevel || "");
  const inten = String(p?.interventionIntensity || "focused");

  let recommendedPracticeLoad = "light";
  if (inten === "targeted" && ev === "strong" && suff === "strong" && rc === "knowledge_gap") {
    recommendedPracticeLoad = "moderate";
  } else if (inten === "light" || cs === "withheld" || cs === "tentative" || shouldAvoid) {
    recommendedPracticeLoad = "minimal";
  } else if (inten === "focused") {
    recommendedPracticeLoad = "light";
  }

  let recommendedSessionCount = 2;
  if (recommendedPracticeLoad === "minimal") recommendedSessionCount = 2;
  else if (recommendedPracticeLoad === "light") recommendedSessionCount = 3;
  else recommendedSessionCount = 3;

  let recommendedSessionLengthBand = "short";
  if (recommendedPracticeLoad === "minimal") recommendedSessionLengthBand = "very_short";
  else if (recommendedPracticeLoad === "moderate") recommendedSessionLengthBand = "moderate";

  let practiceReadiness = "building";
  if (q >= 18 && ev === "strong" && suff === "strong") practiceReadiness = "ready";
  else if (q < 8 || ev === "low" || cs === "withheld") practiceReadiness = "low";

  const escalationThresholdHe =
    rc === "insufficient_evidence" || practiceReadiness === "low"
      ? "להחמיר מיקוד רק אחרי שבוע עם 2–3 מפגשים קצרים שבהם הדיוק נשמר."
      : rc === "speed_pressure"
        ? "להוסיף מעט לחץ זמן רק אחרי שני מפגשים רצופים עם דיוק שנשמר באותה רמה."
        : "להוסיף עומס רק אם שני מפגשים רצופים מראים שיפור בדיוק או בפחות טעויות חוזרות.";

  const deescalationThresholdHe =
    "התנגדות חזקה או ירידה בדיוק - לחזור למפגש קצר יותר ולפשט את המשימה לשבוע.";

  if (acc >= 88 && q >= 20 && !shouldAvoid) {
    recommendedPracticeLoad = "minimal";
    recommendedSessionCount = 2;
    recommendedSessionLengthBand = "very_short";
    practiceReadiness = "ready";
  }

  if (level === "mixed" || level === "insufficient") {
    recommendedPracticeLoad = "minimal";
    recommendedSessionCount = 2;
  }

  const rr = String(p?.retentionRisk || "");
  const lsMem = String(p?.learningStage || "");
  if (rr === "high" || lsMem === "fragile_retention" || lsMem === "regression_signal") {
    recommendedPracticeLoad = "minimal";
    recommendedSessionCount = Math.min(recommendedSessionCount, 2);
    recommendedSessionLengthBand = "very_short";
    if (practiceReadiness === "ready") practiceReadiness = "building";
  }

  return {
    recommendedPracticeLoad,
    recommendedSessionCount,
    recommendedSessionLengthBand,
    escalationThresholdHe,
    deescalationThresholdHe,
    practiceReadiness,
  };
}

function hintDependenceRiskActive(rf) {
  return !!rf?.hintDependenceRisk;
}

function isDropStep(s) {
  return s === "drop_one_level_topic_only" || s === "drop_one_grade_topic_only";
}

/**
 * @param {string} sufficiencyLevel
 */
export function sufficiencyBadgeFromLevel(sufficiencyLevel) {
  const s = String(sufficiencyLevel || "");
  if (s === "strong") return "high";
  if (s === "medium") return "medium";
  return "low";
}

/**
 * @param {number} confidenceScore 0–100
 */
export function confidenceBadgeFromScore(confidenceScore) {
  const n = Number(confidenceScore);
  if (!Number.isFinite(n)) return "medium";
  if (n >= 72) return "high";
  if (n >= 42) return "medium";
  return "low";
}

export function buildRecommendationStructuredTrace(p) {
  const { inputs, derivedFlags, blockers, appliedRules, chosenRule, postCapAdjustments, intelligenceV1 } = p;
  const out = {
    version: 2,
    inputs: inputs || {},
    derivedFlags: derivedFlags || {},
    blockers: blockers || [],
    appliedRules: appliedRules || [],
    chosenRule: chosenRule || {},
    postCapAdjustments: postCapAdjustments || [],
  };
  if (intelligenceV1 && typeof intelligenceV1 === "object") {
    out.intelligenceV1 = {
      weaknessLevel: String(intelligenceV1.weaknessLevel || "none"),
      confidenceBand: String(intelligenceV1.confidenceBand || "low"),
      recurrence: !!intelligenceV1.recurrence,
    };
    out.intelligencePriority = getIntelligencePriority(out.intelligenceV1);
  }
  return out;
}

export function buildWhyThisRecommendationHe(p) {
  const {
    displayName,
    finalStep,
    riskFlags,
    trendDer,
    behaviorType,
    legacyRuleId,
    acc,
    q,
    wrongRatio,
    behaviorSignals,
    dominantMistakePatternLabelHe,
    mistakePatternNarrativeHe,
    dependencyState,
    likelyFoundationalBlocker,
    likelyFoundationalBlockerLabelHe,
    whyFoundationFirstHe,
  } = p;
  const parts = [];
  parts.push(`המלצה לגבי ${displayName}: ${stepLabelHe(finalStep)}.`);

  const accPct = typeof acc === "number" && !isNaN(acc) ? Math.round(acc) : null;
  const qNum = typeof q === "number" && !isNaN(q) ? Math.round(q) : null;
  const wrPct = typeof wrongRatio === "number" && !isNaN(wrongRatio) ? Math.round(wrongRatio * 100) : null;
  const firstTryMiss = typeof behaviorSignals?.firstTryMissRateOnWrong === "number"
    ? behaviorSignals.firstTryMissRateOnWrong : null;
  const changedRate = typeof behaviorSignals?.changedAnswerRateOnWrong === "number"
    ? behaviorSignals.changedAnswerRateOnWrong : null;
  const avgRetry = typeof behaviorSignals?.avgRetryOnWrong === "number"
    ? behaviorSignals.avgRetryOnWrong : null;
  const patternLab = String(dominantMistakePatternLabelHe || "").trim();
  const patternNar = String(mistakePatternNarrativeHe || "").trim();
  const dep = String(dependencyState || "");
  const blocker = String(likelyFoundationalBlocker || "unknown");
  const blockerLabel = String(likelyFoundationalBlockerLabelHe || "").trim();
  const whyFoundation = String(whyFoundationFirstHe || "").trim();

  if (behaviorType === "fragile_success") {
    if (firstTryMiss !== null && firstTryMiss >= 0.4) {
      parts.push(
        `הילד מגיע לתשובה נכונה אבל לרוב רק אחרי ניסיון נוסף - ` +
        `בניסיון הראשון יש פספוס ב-${Math.round(firstTryMiss * 100)}% מהשאלות הבעייתיות.` +
        ` כדאי לחזק את הביטחון בפתרון הראשוני, לא רק את תוצאת הסוף.`
      );
    } else if (changedRate !== null && changedRate >= 0.3) {
      parts.push(
        `הילד מחליף תשובה לעיתים קרובות (${Math.round(changedRate * 100)}% מהמקרים הבעייתיים) - ` +
        `כנראה שהידע עדיין לא בטוח מספיק. כדאי לתרגל החלטה בוטחת ולא רק נכונה.`
      );
    } else if (avgRetry !== null && avgRetry >= 1.15) {
      parts.push(
        `הילד צריך יותר מניסיון אחד בחלק ניכר מהשאלות הקשות ` +
        `(ממוצע ${avgRetry.toFixed(1)} ניסיונות לשאלה שגויה) - ` +
        `כדאי לחזק את דרך הפתרון ולא רק את התוצאה הסופית.`
      );
    } else {
      const statStr = accPct !== null && qNum !== null ? ` (דיוק ${accPct}% מתוך ${qNum} שאלות)` : "";
      parts.push(
        `הדיוק הכללי נראה סביר${statStr}, אבל התשובה הסופית לא תמיד משקפת שליטה יציבה - ` +
        `יש אותות של היסוס בתגובות.`
      );
    }
  } else if (behaviorType === "knowledge_gap") {
    const statParts = [];
    if (accPct !== null) statParts.push(`דיוק ${accPct}%`);
    if (qNum !== null) statParts.push(`${qNum} שאלות`);
    if (wrPct !== null) statParts.push(`${wrPct}% טעויות`);
    const statsStr = statParts.length ? ` (${statParts.join(", ")})` : "";
    parts.push(`${meaningExplainSentenceHe("knowledge_gap", "knowledge_gap")}${statsStr}`);
    if (patternNar) {
      parts.push(patternNar.replace(/\s+/g, " ").trim());
    } else if (patternLab) {
      parts.push(`דפוס: ${patternLab.replace(/^דפוס:\s*/, "").replace(/^דפוס הטעות הבולט:\s*/, "")}.`);
    } else {
      parts.push(
        "יש טעויות בנושא - כדאי לבדוק שוב אחרי עוד תרגול קצר לפני מסקנה מדויקת יותר.",
      );
    }
    if (whyFoundation && blocker !== "unknown" && blockerLabel && !VAGUE_FOUNDATION_PHRASE.test(blockerLabel)) {
      parts.push(whyFoundation);
    } else if (dep === "likely_foundational_block" || dep === "mixed_dependency_signal") {
      parts.push(
        "הנתונים מרמזים שהבעיה אולי קשורה לבסיס של הנושא, אבל כרגע אין מספיק מידע כדי לזהות איזה חלק בסיסי צריך לחזק.",
      );
    }
  } else if (behaviorType === "stable_mastery") {
    const statStr = accPct !== null && qNum !== null ? ` (דיוק ${accPct}% מתוך ${qNum} שאלות)` : "";
    parts.push(`הנושא נראה בשליטה טובה ויציבה${statStr}.`);
  } else if (behaviorType === "undetermined" || behaviorType === "insufficient_evidence") {
    const qStr = qNum !== null ? ` (יש ${qNum} שאלות בלבד)` : "";
    parts.push(
      `עדיין אין מספיק נתונים כדי לזהות דפוס ברור בנושא הזה${qStr}. ` +
      `ניתן להציג תמונה מדויקת יותר כשיהיו עוד שאלות מתועדות.`
    );
  } else {
    const statStr = accPct !== null && qNum !== null ? ` (${accPct}% דיוק מתוך ${qNum} שאלות)` : "";
    parts.push(`${meaningExplainSentenceHe(null, behaviorType)}${statStr}`);
  }

  if (legacyRuleId) parts.push(preliminarySignalHe());
  const rf = [];
  if (riskFlags.falsePromotionRisk) rf.push("חשש מקידום מוקדם");
  if (riskFlags.falseRemediationRisk) rf.push("חשש מטיפול יתר");
  if (riskFlags.speedOnlyRisk) rf.push("נטייה למהירות");
  if (riskFlags.hintDependenceRisk) rf.push("הילד עדיין נעזר ברמזים");
  if (riskFlags.insufficientEvidenceRisk) rf.push("מידע חלקי בלבד");
  if (riskFlags.recentTransitionRisk) rf.push("שינוי עדין לאחרונה");
  if (rf.length) parts.push(`נקודות לתשומת לב: ${rf.join(", ")}.`);
  if (trendDer.unclearTrend) parts.push("עדיין לא ברור כיוון הדיוק לאורך זמן - נשארים זהירים.");
  if (trendDer.fragileProgressPattern) parts.push("הדיוק עולה, אבל הילד עדיין צריך יותר עזרה - לא מתקדמים מהר מדי.");
  if (trendDer.progressSupportsAdvance) parts.push("אם ההצלחה והעצמאות חוזרות יחד, אפשר לשקול התקדמות זהירה.");
  return parts.join(" ");
}

export function buildWhatCouldChangeThisHe(p) {
  const { q, behaviorType } = p;
  const parts = [];
  parts.push(`לאסוף יותר מ ${Math.max(12, Number(q) || 0)} שאלות בתקופה שנבחרה,`);
  parts.push("עוד פרטים על טעויות, כמו זמן תגובה וניסיונות חוזרים, כדי לחדד את התמונה,");
  parts.push("וכיוון דיוק ברור בין התקופה הנוכחית לקודמת - יכולים לשנות את הצעד.");
  if (behaviorType === "undetermined") parts.push("הדפוס עדיין לא מספיק ברור - נתונים נוספים יעזרו להבין אותו טוב יותר.");
  return parts.join(" ");
}

function stepLabelHe(step) {
  const m = {
    advance_level: "העלאת רמת קושי בנושא",
    advance_grade_topic_only: "העלאת כיתה בנושא",
    maintain_and_strengthen: "ביסוס באותה רמה",
    remediate_same_level: "חיזוק באותה רמה",
    drop_one_level_topic_only: "ירידת רמת קושי בנושא",
    drop_one_grade_topic_only: "ירידת כיתה בנושא",
  };
  return m[String(step || "").trim()] || STEP_LABEL_FALLBACK_HE;
}
