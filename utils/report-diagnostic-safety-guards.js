/**
 * Report / diagnostic safety guards — suppress specific labels when grade-aware
 * template or spine backing is missing. No new Hebrew copy.
 */
import { GRADE_AWARE_RECOMMENDATION_TEMPLATES } from "./parent-report-language/grade-aware-recommendation-templates.js";

/** Science taxonomy ids approved in engine but blocked from grade-aware templates (Phase 5-B3). */
export const SCIENCE_TAXONOMY_WITHOUT_GRADE_AWARE_TEMPLATE = Object.freeze([
  "S-05",
  "S-06",
  "S-08",
]);

/**
 * @param {string|null|undefined} subjectId
 * @param {string|null|undefined} taxonomyId
 * @returns {boolean}
 */
export function hasGradeAwareRecommendationTemplateEntry(subjectId, taxonomyId) {
  const sid = String(subjectId || "").trim();
  const tid = String(taxonomyId || "").trim();
  if (!sid || !tid) return false;
  const bank = GRADE_AWARE_RECOMMENDATION_TEMPLATES[sid];
  if (!bank || typeof bank !== "object") return false;
  const entry = bank[tid];
  return entry != null && typeof entry === "object";
}

/**
 * When true, parent report resolvers must not fall back to raw engine probe/intervention Hebrew.
 * Applies only to subjects that use the grade-aware template bank.
 *
 * @param {string|null|undefined} subjectId
 * @param {string|null|undefined} taxonomyId
 * @returns {boolean}
 */
export function shouldOmitRawDiagnosticRecommendationFallback(subjectId, taxonomyId) {
  const sid = String(subjectId || "").trim();
  const tid = String(taxonomyId || "").trim();
  if (!sid || !tid) return false;

  const bank = GRADE_AWARE_RECOMMENDATION_TEMPLATES[sid];
  if (!bank || typeof bank !== "object") return false;

  return !hasGradeAwareRecommendationTemplateEntry(sid, tid);
}

/**
 * @param {string|null|undefined} subjectId
 * @param {string|null|undefined} taxonomyId
 * @returns {boolean}
 */
export function isReportRecommendationGuardActive(subjectId, taxonomyId) {
  return shouldOmitRawDiagnosticRecommendationFallback(subjectId, taxonomyId);
}
