/**
 * Global topic-row evidence classification (all subjects / grades).
 * Distinguishes topic-level conclusion sufficiency vs missing subskill detail.
 */

import { formatParentReportGradeLabel } from "./math-report-generator.js";
import { splitTopicRowKey } from "./parent-report-row-diagnostics.js";
import {
  PARENT_EVIDENCE_VOLUME,
} from "./parent-report-language/parent-evidence-matrix.js";

export const TOPIC_EVIDENCE_THRESHOLDS = Object.freeze({
  /** Below this: topic-level conclusions are withheld. */
  minQuestionsTopicConclusion: PARENT_EVIDENCE_VOLUME.INSIGHT_MIN,
  /** Moderate topic-level band. */
  minQuestionsModerate: PARENT_EVIDENCE_VOLUME.STRONG_MIN,
  /** High-volume band — never "collect more data" for volume alone. */
  minQuestionsHighVolume: PARENT_EVIDENCE_VOLUME.HIGH_VOLUME_MIN,
  thinMaxQuestions: PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX,
});

export const SUBSKILL_DETAIL_LIMITATION_HE =
  "יש מספיק מידע על מצב הנושא, אבל אין מספיק פירוט כדי לזהות את תת המיומנות המדויקת.";

/**
 * @param {number} questionCount
 * @param {typeof TOPIC_EVIDENCE_THRESHOLDS} [thresholds]
 * @returns {"thin"|"low"|"moderate"|"strong"}
 */
export function classifyTopicEvidenceBand(questionCount, thresholds = TOPIC_EVIDENCE_THRESHOLDS) {
  const n = Number.isFinite(Number(questionCount)) ? Math.max(0, Math.round(Number(questionCount))) : 0;
  if (n >= thresholds.minQuestionsHighVolume) return "strong";
  if (n >= thresholds.minQuestionsModerate) return "moderate";
  if (n >= thresholds.minQuestionsTopicConclusion) return "low";
  if (n >= PARENT_EVIDENCE_VOLUME.PRELIMINARY_MIN) return "low";
  return "thin";
}

/**
 * @param {number} questionCount
 */
export function hasTopicLevelEvidence(questionCount) {
  const n = Number.isFinite(Number(questionCount)) ? Math.max(0, Math.round(Number(questionCount))) : 0;
  return n >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion;
}

/**
 * Volume-aware row sufficiency - never "low" for high-volume rows unless q is tiny.
 * @param {number} questionCount
 * @param {string} rowSignalLevel — strong|medium|low from diagnostics
 * @param {string} [evidenceStrength] — strong|medium|low
 */
export function resolveRowDataSufficiencyLevel(questionCount, rowSignalLevel, evidenceStrength = "medium") {
  const q = Math.max(0, Math.round(Number(questionCount) || 0));
  const sig = String(rowSignalLevel || "medium").toLowerCase();
  const ev = String(evidenceStrength || "medium").toLowerCase();
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsHighVolume) return "strong";
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate && ev !== "low") return "strong";
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion) {
    if (sig === "low" && q < TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate) return "medium";
    return sig === "low" ? "medium" : sig === "strong" ? "strong" : "medium";
  }
  if (q < 4) return "low";
  return sig === "strong" ? "medium" : sig;
}

/**
 * @param {{
 *   questionCount: number;
 *   dataSufficiencyLevel?: string;
 *   gateReadiness?: string;
 *   evidenceStrength?: string;
 * }} ctx
 */
export function shouldThinEvidenceDowngradeRecommendation(ctx) {
  const q = Math.max(0, Math.round(Number(ctx?.questionCount) || 0));
  if (q < TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion) return true;
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsHighVolume) return false;
  const suff = String(ctx?.dataSufficiencyLevel || "").toLowerCase();
  const gate = String(ctx?.gateReadiness || "").toLowerCase();
  const ev = String(ctx?.evidenceStrength || "").toLowerCase();
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate && ev !== "low") return false;
  if (suff === "low" && q < TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate) return true;
  if (gate === "insufficient" && q < TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion) return true;
  return false;
}

/**
 * Parent-facing confidence band from volume + accuracy (topic-level, not subskill).
 * @param {number} questionCount
 * @param {number} accuracyPct
 * @param {string} [engineBand] — high|medium|low
 */
export function resolveParentTopicConfidenceBand(questionCount, accuracyPct, engineBand = "low") {
  const q = Math.max(0, Math.round(Number(questionCount) || 0));
  const acc = Math.max(0, Math.min(100, Math.round(Number(accuracyPct) || 0)));
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsHighVolume) {
    if (acc >= 78 || acc <= 42) return "high";
    return "medium";
  }
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate) {
    if (acc >= 82 || acc <= 38) return "medium";
    return String(engineBand || "medium").toLowerCase() === "high" ? "high" : "medium";
  }
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion) {
    return String(engineBand || "low").toLowerCase() === "high" ? "medium" : "low";
  }
  return "low";
}

/**
 * @param {number} questionCount
 * @param {string} [engineReadiness]
 */
export function resolveParentTopicReadiness(questionCount, engineReadiness = "insufficient") {
  const q = Math.max(0, Math.round(Number(questionCount) || 0));
  const er = String(engineReadiness || "").toLowerCase();
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsHighVolume) return "ready";
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsModerate) return er === "ready" ? "ready" : "forming";
  if (q >= TOPIC_EVIDENCE_THRESHOLDS.minQuestionsTopicConclusion) return er === "ready" ? "ready" : "forming";
  return "insufficient";
}

/**
 * @param {boolean} hasSubskillMetadata
 */
export function buildSkillDetailLimitationUncertaintyHe(hasSubskillMetadata) {
  if (hasSubskillMetadata) return null;
  return SUBSKILL_DETAIL_LIMITATION_HE;
}

/** @deprecated Use buildSkillDetailLimitationUncertaintyHe */
export const buildSubskillLimitationUncertaintyHe = buildSkillDetailLimitationUncertaintyHe;

/**
 * Whether real row/engine data already exposes subskill or repeated-mistake detail.
 * @param {object|null|undefined} unit — diagnosticEngineV2 unit
 * @param {object|null|undefined} mapRow — collapsed topic map row
 */
export function resolveHasSubskillMetadataFromRowSources(unit, mapRow) {
  const patternHe = String(unit?.taxonomy?.patternHe || "").trim();
  const subskillHe = String(unit?.taxonomy?.subskillHe || "").trim();
  if (patternHe || subskillHe) return true;

  const lineHe = String(unit?.diagnosis?.lineHe || "").trim();
  if (unit?.diagnosis?.allowed && lineHe.length >= 8) return true;

  const iv = unit?.intelligenceV1;
  if (iv && typeof iv === "object") {
    const p = iv.patterns && typeof iv.patterns === "object" ? iv.patterns : {};
    const taxonomyId = p.taxonomyId != null && String(p.taxonomyId).trim() !== "" ? String(p.taxonomyId).trim() : null;
    const recurrence = !!p.recurrenceFull;
    const noPatternClaims = !!p.noPatternClaims;
    const weaknessLevel = String(iv.weakness?.level || "none");
    if (recurrence && taxonomyId && !noPatternClaims && weaknessLevel !== "none") return true;
  }

  const bp = mapRow?.behaviorProfile;
  if (bp && typeof bp === "object") {
    const dt = String(bp.dominantType || "").trim().toLowerCase();
    if (dt && dt !== "unknown" && dt !== "insufficient_evidence" && dt !== "none") return true;
  }

  const mistakeBuckets = mapRow?.mistakeBuckets;
  if (Array.isArray(mistakeBuckets) && mistakeBuckets.length > 0) return true;

  const patternFamilies = mapRow?.patternFamilies;
  if (Array.isArray(patternFamilies) && patternFamilies.length > 0) return true;

  if (mapRow?.contractsV1?.evidence?.skillBreakdownAvailable === true) return true;

  return false;
}

/**
 * Dedupe key for executive strength/weakness lists — grade-scoped rows must not collapse.
 * @param {{ topicRowKey?: string; labelHe?: string; subjectId?: string; contentGradeKey?: string|null }} row
 */
export function executiveRowDedupeKey(row) {
  const trk = String(row?.topicRowKey || "").trim();
  if (trk) return `${String(row?.subjectId || "")}|${trk}`;
  const g = String(row?.contentGradeKey || "").trim();
  const lab = String(row?.labelHe || "").trim();
  return `${String(row?.subjectId || "")}|${lab}|${g}`;
}

/**
 * @param {{
 *   displayName: string;
 *   contentGradeKey?: string|null;
 *   registeredGradeKey?: string|null;
 *   gradeRelation?: string|null;
 *   topicRowKey?: string|null;
 * }} args
 */
export function parentFacingTopicRowLabelHe(args) {
  const name = String(args?.displayName || "").trim() || "נושא";
  let gk =
    args?.contentGradeKey != null && String(args.contentGradeKey).trim()
      ? String(args.contentGradeKey).trim()
      : null;
  if (!gk && args?.topicRowKey) {
    const p = splitTopicRowKey(String(args.topicRowKey));
    gk = p?.gradeKey != null && String(p.gradeKey).trim() ? String(p.gradeKey).trim() : null;
  }
  const gradeLabel = gk ? formatParentReportGradeLabel(gk) : "";
  if (!gradeLabel || gradeLabel === "לא זמין") return name;
  const rel = String(args?.gradeRelation || "").trim();
  if (rel === "higher") return `${name} (תרגול ב${gradeLabel} - מעל הכיתה הרשומה)`;
  if (rel === "lower") return `${name} (תרגול ב${gradeLabel} - בסיס/כיתה נמוכה)`;
  if (rel === "same") return `${name} (כיתה ${gradeLabel.replace(/^כיתה\s+/u, "")})`;
  return `${name} (תרגול ב${gradeLabel})`;
}

export default {
  TOPIC_EVIDENCE_THRESHOLDS,
  SUBSKILL_DETAIL_LIMITATION_HE,
  classifyTopicEvidenceBand,
  hasTopicLevelEvidence,
  resolveRowDataSufficiencyLevel,
  shouldThinEvidenceDowngradeRecommendation,
  resolveParentTopicConfidenceBand,
  resolveParentTopicReadiness,
  buildSubskillLimitationUncertaintyHe,
  resolveHasSubskillMetadataFromRowSources,
  executiveRowDedupeKey,
  parentFacingTopicRowLabelHe,
};
