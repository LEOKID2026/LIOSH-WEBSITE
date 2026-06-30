/**
 * Diagnostic Engine V3 — grade relation context (internal only; never hides evidence).
 * Product: no diagnosis blocking by registered grade; below-grade struggle = foundation signal.
 */

import {
  buildGradeEvidenceFields,
  normalizePracticeGradeKey,
} from "../../lib/learning-supabase/practice-grade-resolution.js";

export const GRADE_RELATION_V3 = Object.freeze({
  AT_REGISTERED: "at_registered_grade",
  BELOW: "below_registered_grade",
  ABOVE: "above_registered_grade",
  OUTSIDE_BAND: "outside_regular_grade_band",
});

const GRADE_ORDER = Object.freeze(["g1", "g2", "g3", "g4", "g5", "g6"]);

/**
 * @param {string|null|undefined} key
 */
function gradeIndex(key) {
  const k = normalizePracticeGradeKey(key);
  if (!k) return -1;
  return GRADE_ORDER.indexOf(k);
}

/**
 * @param {string|null|undefined} registeredKey
 * @param {string|null|undefined} contentKey
 * @returns {number|null}
 */
export function computeGradeDeltaNumeric(registeredKey, contentKey) {
  const ri = gradeIndex(registeredKey);
  const ci = gradeIndex(contentKey);
  if (ri < 0 || ci < 0) return null;
  return ci - ri;
}

/**
 * Map legacy same/lower/higher/unknown → V3 relation enum.
 * @param {string|null|undefined} legacyRelation
 * @param {number|null} gradeDelta
 * @param {string|null|undefined} registeredGrade
 * @param {string|null|undefined} contentGrade
 */
export function mapToGradeRelationV3(legacyRelation, gradeDelta, registeredGrade, contentGrade) {
  const reg = normalizePracticeGradeKey(registeredGrade);
  const content = normalizePracticeGradeKey(contentGrade);

  if (!content && !reg) return GRADE_RELATION_V3.OUTSIDE_BAND;
  if (!content || !reg) return GRADE_RELATION_V3.OUTSIDE_BAND;

  const delta =
    gradeDelta != null && Number.isFinite(Number(gradeDelta))
      ? Number(gradeDelta)
      : computeGradeDeltaNumeric(reg, content);

  if (delta == null) return GRADE_RELATION_V3.OUTSIDE_BAND;
  if (Math.abs(delta) > 2) return GRADE_RELATION_V3.OUTSIDE_BAND;
  if (delta === 0) return GRADE_RELATION_V3.AT_REGISTERED;
  if (delta < 0) return GRADE_RELATION_V3.BELOW;
  return GRADE_RELATION_V3.ABOVE;
}

/**
 * @param {object} p
 * @param {string|null|undefined} p.registeredGrade
 * @param {string|null|undefined} p.contentGrade
 * @param {string|null|undefined} [p.legacyGradeRelation]
 * @param {number|null|undefined} [p.legacyGradeDelta]
 * @param {boolean} [p.isCorrect]
 * @param {number|null} [p.accuracyPct] — rollup-level optional
 * @param {number} [p.wrongCount]
 * @param {number} [p.attempts]
 */
export function resolveGradeContextV3(p) {
  const registeredGrade = normalizePracticeGradeKey(p?.registeredGrade) || null;
  const contentGrade = normalizePracticeGradeKey(p?.contentGrade) || null;

  const built = buildGradeEvidenceFields(registeredGrade, contentGrade);
  const gradeDelta =
    p?.legacyGradeDelta != null && Number.isFinite(Number(p.legacyGradeDelta))
      ? Number(p.legacyGradeDelta)
      : built.gradeDelta != null
        ? built.gradeDelta
        : computeGradeDeltaNumeric(registeredGrade, contentGrade);

  const legacyRel = String(p?.legacyGradeRelation || built.gradeRelation || "").trim();
  const relation = mapToGradeRelationV3(legacyRel, gradeDelta, registeredGrade, contentGrade);

  const isCorrect = p?.isCorrect === true;
  const attempts = Math.max(0, Number(p?.attempts) || 0);
  const wrongCount = Math.max(0, Number(p?.wrongCount) || 0);
  const accuracyPct =
    p?.accuracyPct != null && Number.isFinite(Number(p.accuracyPct))
      ? Number(p.accuracyPct)
      : attempts > 0
        ? Math.round(((attempts - wrongCount) / attempts) * 100)
        : null;

  const struggling =
    !isCorrect || (accuracyPct != null && accuracyPct < 70) || wrongCount >= 2;

  const succeeding =
    isCorrect || (accuracyPct != null && accuracyPct >= 80 && attempts >= 3);

  /** Below registered + struggle → foundation diagnostic flag (never suppress). */
  const foundationRisk =
    relation === GRADE_RELATION_V3.BELOW && struggling && (wrongCount >= 1 || !isCorrect);

  /** Above registered + success → enrichment, not registered-grade weakness. */
  const enrichmentSignal =
    relation === GRADE_RELATION_V3.ABOVE &&
    succeeding &&
    (isCorrect || (accuracyPct != null && accuracyPct >= 75));

  /**
   * Caution when interpreting as registered-grade curriculum gap.
   * Above-grade wrongs must not auto-map to registered-grade difficulty.
   */
  let caveatNeeded = false;
  /** @type {string[]} */
  const caveatReasons = [];

  if (relation === GRADE_RELATION_V3.ABOVE && !isCorrect) {
    caveatNeeded = true;
    caveatReasons.push("above_registered_grade_wrong_not_grade_gap");
  }
  if (relation === GRADE_RELATION_V3.ABOVE && struggling && !enrichmentSignal) {
    caveatNeeded = true;
    caveatReasons.push("above_registered_interpret_with_caution");
  }
  if (relation === GRADE_RELATION_V3.OUTSIDE_BAND) {
    caveatNeeded = true;
    caveatReasons.push("grade_band_unclear");
  }
  if (relation === GRADE_RELATION_V3.BELOW && foundationRisk) {
    caveatReasons.push("below_registered_foundation_signal");
  }

  return {
    registeredGrade,
    contentGrade,
    contentGradeBand: contentGrade || null,
    gradeDelta,
    relation,
    legacyGradeRelation: legacyRel || built.gradeRelation || "unknown",
    caveatNeeded,
    caveatReasons,
    foundationRisk: foundationRisk === true,
    enrichmentSignal: enrichmentSignal === true,
    /** Internal only — never flip to parent-facing without separate review. */
    parentFacing: false,
  };
}

/**
 * Aggregate grade context across contracts for a rollup.
 * @param {Array<{ gradeContext?: ReturnType<typeof resolveGradeContextV3> }>} contracts
 * @param {object} rowMeta
 * @param {string|null|undefined} rowMeta.registeredGrade
 * @param {string|null|undefined} rowMeta.contentGrade
 * @param {number} attempts
 * @param {number} correct
 * @param {number} wrong
 */
export function aggregateGradeContextForRollup(contracts, rowMeta, attempts, correct, wrong) {
  const accuracyPct = attempts > 0 ? Math.round((correct / attempts) * 100) : null;

  /** @type {Record<string, number>} */
  const relationCounts = {};
  let foundationHits = 0;
  let enrichmentHits = 0;
  let caveatHits = 0;

  for (const c of contracts || []) {
    const gc = c?.gradeContext;
    if (!gc) continue;
    relationCounts[gc.relation] = (relationCounts[gc.relation] || 0) + 1;
    if (gc.foundationRisk) foundationHits += 1;
    if (gc.enrichmentSignal) enrichmentHits += 1;
    if (gc.caveatNeeded) caveatHits += 1;
  }

  const dominantRelation =
    Object.entries(relationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const base = resolveGradeContextV3({
    registeredGrade: rowMeta?.registeredGrade,
    contentGrade: rowMeta?.contentGrade,
    legacyGradeRelation: rowMeta?.gradeRelation,
    legacyGradeDelta: rowMeta?.gradeDelta,
    attempts,
    wrongCount: wrong,
    accuracyPct,
  });

  return {
    ...base,
    dominantRelation: dominantRelation || base.relation,
    relationMix: relationCounts,
    foundationRisk: base.foundationRisk || foundationHits >= 1,
    enrichmentSignal: base.enrichmentSignal || enrichmentHits >= 1,
    caveatNeeded: base.caveatNeeded || caveatHits >= 1 || dominantRelation === GRADE_RELATION_V3.ABOVE,
    parentFacing: false,
  };
}
