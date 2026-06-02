import { normalizeParentFacingHe } from "./parent-report-language/index.js";
import { resolveGradeAwareParentRecommendationHe } from "./parent-report-language/grade-aware-recommendation-resolver.js";
import { shouldOmitRawDiagnosticRecommendationFallback } from "./report-diagnostic-safety-guards.js";

function canonicalState(unit) {
  return unit?.canonicalState || null;
}

function actionState(unit) {
  return canonicalState(unit)?.actionState || "withhold";
}

function isStrengthAction(unit) {
  const a = actionState(unit);
  return a === "maintain" || a === "expand_cautiously";
}

function positiveAuthorityLevel(unit) {
  return canonicalState(unit)?.evidence?.positiveAuthorityLevel || "none";
}

const STRONG_POSITIVE_BLOCKED_FAMILIES = [
  "reduced_complexity",
  "monitoring_only",
  "collect_signal",
  "remedial",
  "diagnose_only",
  "probe_only",
];

/**
 * Classify recommendation state from canonical state only.
 */
export function classifyParentRecommendationState(unit) {
  if (isStrengthAction(unit)) {
    const level = positiveAuthorityLevel(unit);
    const RANK = { excellent: 3, very_good: 2, good: 1, none: 0 };
    return {
      classId: "strong_positive_actionable",
      blockedFamilies: STRONG_POSITIVE_BLOCKED_FAMILIES,
      state: {
        actionState: actionState(unit),
        authorityRank: RANK[level] || 0,
        readiness: canonicalState(unit)?.assessment?.readiness || "insufficient",
        family: canonicalState(unit)?.recommendation?.family || "withhold",
      },
    };
  }
  return {
    classId: "regular_flow",
    blockedFamilies: [],
    state: {
      actionState: actionState(unit),
      authorityRank: 0,
      readiness: canonicalState(unit)?.assessment?.readiness || "insufficient",
      family: canonicalState(unit)?.recommendation?.family || "withhold",
    },
  };
}

function topicName(unit) {
  return String(unit?.displayName || "הנושא").trim() || "הנושא";
}

function bestEffortText(s) {
  const t = String(s || "").trim();
  return t ? normalizeParentFacingHe(t) : "";
}

function unitTaxonomyId(unit) {
  return (
    unit?.diagnosis?.taxonomyId ||
    unit?.intervention?.taxonomyId ||
    unit?.taxonomy?.id ||
    null
  );
}

function omitRawFallbackForUnit(unit, opts = {}) {
  if (opts && typeof opts === "object" && opts.omitRawDiagnosticFallback) return true;
  const taxonomyId = unitTaxonomyId(unit);
  return shouldOmitRawDiagnosticRecommendationFallback(unit?.subjectId, taxonomyId);
}

/**
 * @param {unknown} unit
 * @param {string|null|undefined} [gradeKey] from topic map row for this unit's topicRowKey
 * @param {{ omitRawDiagnosticFallback?: boolean }} [opts]
 */
export function resolveUnitParentActionHe(unit, gradeKey, opts = {}) {
  const noRaw = omitRawFallbackForUnit(unit, opts);
  const cs = canonicalState(unit);
  const name = topicName(unit);

  if (cs?.recommendation?.allowed) {
    const family = cs.recommendation.family;
    if (family === "expand_cautiously") {
      return normalizeParentFacingHe(
        `ב${name} מומלץ להישאר בינתיים באותה רמה, ורק אם ההצלחה נמשכת גם בהמשך — להוסיף קושי קטן ומדוד.`
      );
    }
    if (family === "maintain") {
      return normalizeParentFacingHe(
        `ב${name} מומלץ להמשיך באותה רמה, ורק אם זה ממשיך להצליח באופן יציב — להוסיף מעט קושי.`
      );
    }
  }

  const action = actionState(unit);
  if (action === "withhold" || action === "probe_only") return null;

  const gradeAware = resolveGradeAwareParentRecommendationHe({
    subjectId: unit?.subjectId,
    gradeKey: gradeKey ?? null,
    taxonomyId: unitTaxonomyId(unit),
    bucketKey: unit?.bucketKey,
    slot: "action",
  });
  if (gradeAware) return gradeAware;

  if (noRaw) return null;

  const fallback = bestEffortText(
    unit?.intervention?.immediateActionHe || unit?.probe?.specificationHe || ""
  );
  return fallback || null;
}

/**
 * @param {unknown} unit
 * @param {string|null|undefined} [gradeKey] from topic map row for this unit's topicRowKey
 * @param {{ omitRawDiagnosticFallback?: boolean }} [opts]
 */
export function resolveUnitNextGoalHe(unit, gradeKey, opts = {}) {
  const noRaw = omitRawFallbackForUnit(unit, opts);
  const cs = canonicalState(unit);
  if (isStrengthAction(unit) && cs?.recommendation?.allowed) {
    const name = topicName(unit);
    return normalizeParentFacingHe(
      `לשבוע הקרוב ב${name}: להמשיך באותה רמה, ואם ההצלחה נשמרת — לנסות צעד אחד מעט מאתגר יותר.`
    );
  }

  const gradeAware = resolveGradeAwareParentRecommendationHe({
    subjectId: unit?.subjectId,
    gradeKey: gradeKey ?? null,
    taxonomyId: unitTaxonomyId(unit),
    bucketKey: unit?.bucketKey,
    slot: "nextGoal",
  });
  if (gradeAware) return gradeAware;

  if (noRaw) return null;

  const fallback = bestEffortText(
    unit?.probe?.objectiveHe || unit?.intervention?.shortPracticeHe || ""
  );
  return fallback || null;
}

/**
 * @param {unknown} unit
 * @param {string|null|undefined} [gradeKey] from topic map row or topicRowKey parse
 * @param {{ omitRawDiagnosticFallback?: boolean }} [opts]
 */
export function resolveUnitHomeMethodHe(unit, gradeKey, opts = {}) {
  const noRaw = omitRawFallbackForUnit(unit, opts);
  const cs = canonicalState(unit);
  if (isStrengthAction(unit) && cs?.recommendation?.allowed) {
    const name = topicName(unit);
    return normalizeParentFacingHe(
      `ב${name} עדיף תרגול קצר וקבוע באותה רמה, בלי לקפוץ מהר קדימה.`
    );
  }
  const nextG = resolveGradeAwareParentRecommendationHe({
    subjectId: unit?.subjectId,
    gradeKey: gradeKey ?? null,
    taxonomyId: unitTaxonomyId(unit),
    bucketKey: unit?.bucketKey,
    slot: "nextGoal",
  });
  if (nextG) return nextG;
  const act = resolveGradeAwareParentRecommendationHe({
    subjectId: unit?.subjectId,
    gradeKey: gradeKey ?? null,
    taxonomyId: unitTaxonomyId(unit),
    bucketKey: unit?.bucketKey,
    slot: "action",
  });
  if (act) return act;
  if (noRaw) return null;
  const fallback = bestEffortText(unit?.intervention?.shortPracticeHe || "");
  return fallback || null;
}

export function isStrongPositiveUnitForParentGuidance(unit) {
  return isStrengthAction(unit);
}
