/**
 * Topic-level owner-copy resolver — bridge from row/LPD/EDC to owner templates (Phase B+C+D).
 */

import { sanitizeParentPatternLabel } from "./parent-pattern-label.js";
import { resolveParentFacingPatternLabelHe } from "./parent-facing-error-pattern-he.js";
import {
  EDC_CONTRACT_KEY,
  readEngineDecisionCode,
} from "./engine-decision-codes.js";
import { normalizeParentVisibleMetrics } from "./normalize-parent-practice-metrics.js";
import {
  renderOwnerTopicCopyTemplateHe,
  topicExplainTemplateId,
  narrativeOwnerTemplateId,
} from "../parent-report-language/parent-report-owner-topic-copy-templates-he.js";

/** @param {Record<string, unknown>|null|undefined} row */
function getLpdFromRowLocal(row) {
  const lpd = row?.learningPatternDecision;
  return lpd && typeof lpd === "object" ? lpd : null;
}

/** @typedef {import("../parent-report-language/parent-report-owner-topic-copy-templates-he.js").TopicOwnerCopySlots} TopicOwnerCopySlots */

const OWNER_TOPIC_BASE_TEMPLATE_IDS = new Set([
  "difficulty_observed",
  "positive_observed",
  "initial_topic_data",
  "practice_focus",
  "mixed",
]);

/** @param {unknown} v */
function str(v) {
  return v != null ? String(v).trim() : "";
}

/**
 * @param {Record<string, unknown>|null|undefined} lpd
 * @returns {string|null}
 */
export function resolveTopicOwnerBaseTemplateId(lpd) {
  const tid = str(lpd?.templateId);
  if (OWNER_TOPIC_BASE_TEMPLATE_IDS.has(tid)) return tid;
  if (
    tid.startsWith("difficulty_") ||
    tid === "no_clear_pattern_difficulty_fallback" ||
    tid === "difficulty_observed_fallback"
  ) {
    return "difficulty_observed";
  }
  if (tid === "q3_4_factual") return "practice_focus";
  if (tid.startsWith("positive_")) return "positive_observed";
  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {Record<string, unknown>|null|undefined} lpd
 * @returns {string|null}
 */
function resolveDetectedPattern(contract, lpd) {
  const fromContract = str(contract?.detectedPattern);
  if (fromContract) {
    const mapped = resolveParentFacingPatternLabelHe(fromContract);
    if (mapped) return mapped;
  }
  const patterns = Array.isArray(lpd?.repeatedMistakePatterns) ? lpd.repeatedMistakePatterns : [];
  const label = sanitizeParentPatternLabel(String(patterns[0]?.label || ""));
  if (label) return label;
  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {TopicOwnerCopySlots|null}
 */
export function buildTopicOwnerCopySlots(row) {
  const lpd = getLpdFromRowLocal(row);
  const metrics = normalizeParentVisibleMetrics(row, row?.mapRow || null);
  const q = metrics.questions;
  if (q <= 0 || !lpd || lpd.topicStatus === "not_practiced") return null;

  const baseTemplateId = resolveTopicOwnerBaseTemplateId(lpd);
  if (!baseTemplateId) return null;

  const contract =
    lpd?.[EDC_CONTRACT_KEY] ||
    row?.[EDC_CONTRACT_KEY] ||
    null;

  const topicName =
    str(row?.label || row?.displayName || row?.narrativeTitleHe || lpd?.recommendedFocus) || "הנושא";

  return {
    topicName,
    subjectName: str(row?.subjectLabelHe || row?.subjectName),
    questions: metrics.questions,
    correct: metrics.correct,
    wrong: metrics.wrong,
    accuracy: metrics.accuracy,
    detectedPattern: resolveDetectedPattern(contract, lpd),
    affectedSubskill: contract?.affectedSubskill ? str(contract.affectedSubskill) : null,
    misconceptionLabel: contract?.misconceptionLabel ? str(contract.misconceptionLabel) : null,
    recommendedAction: contract?.recommendedAction ? str(contract.recommendedAction) : null,
    evidenceStrength: str(contract?.evidenceStrength || lpd?.evidenceStrength),
    decisionCode: readEngineDecisionCode(contract),
    baseTemplateId,
    narrativeEnvelope: str(row?.contractsV1?.narrative?.wordingEnvelope || "").toUpperCase() || null,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string} templateId
 * @returns {string|null}
 */
export function resolveTopicOwnerCopyHe(row, templateId) {
  const slots = buildTopicOwnerCopySlots(row);
  if (!slots) return null;
  return renderOwnerTopicCopyTemplateHe(templateId, slots);
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {{ identified: string, data: string, pattern: string, meaning: string, action: string }|null}
 */
export function resolveTopicExplainOwnerSectionsHe(row) {
  const slots = buildTopicOwnerCopySlots(row);
  if (!slots?.baseTemplateId) return null;
  const base = slots.baseTemplateId;

  /** @param {keyof import("../parent-report-language/parent-report-owner-topic-copy-templates-he.js").TOPIC_EXPLAIN_SECTION_TEMPLATE_SUFFIX} section */
  const sectionText = (section) =>
    renderOwnerTopicCopyTemplateHe(topicExplainTemplateId(base, section), slots) || "";

  return {
    identified: sectionText("identified"),
    data: sectionText("data"),
    pattern: sectionText("pattern"),
    meaning: sectionText("meaning"),
    action: sectionText("action"),
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {"stepLabel"|"finding"|"interventionPlan"|"doNow"|"caution"} field
 * @returns {string|null}
 */
export function resolveTopicRecommendationOwnerCopyHe(row, field) {
  const slots = buildTopicOwnerCopySlots(row);
  if (!slots?.baseTemplateId) return null;
  const base = slots.baseTemplateId;

  /** @type {Record<string, string>} */
  const suffixByField = {
    stepLabel: "RECOMMENDATION_STEP_LABEL",
    finding: "RECOMMENDATION_FINDING",
    interventionPlan: "RECOMMENDATION_INTERVENTION_PLAN",
    doNow: "RECOMMENDATION_DO_NOW",
    caution: "RECOMMENDATION_CAUTION",
  };
  const suffix = suffixByField[field];
  if (!suffix) return null;
  const templateId = `${base}:${suffix}`;
  return renderOwnerTopicCopyTemplateHe(templateId, slots);
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {"snapshot"|"cautionLineHe"} section
 * @returns {string|null}
 */
export function resolveNarrativeOwnerCopyHe(row, section) {
  const slots = buildTopicOwnerCopySlots(row);
  if (!slots) return null;
  const envelope =
    str(row?.contractsV1?.narrative?.wordingEnvelope).toUpperCase() ||
    slots.narrativeEnvelope ||
    "";
  if (!envelope || !["WE0", "WE1", "WE2"].includes(envelope)) return null;
  const templateId = narrativeOwnerTemplateId(envelope, section);
  if (!templateId) return null;
  return renderOwnerTopicCopyTemplateHe(templateId, slots);
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string|null}
 */
export function resolveTopicPrimaryFindingOwnerCopyHe(row) {
  const slots = buildTopicOwnerCopySlots(row);
  if (!slots?.baseTemplateId) return null;
  return renderOwnerTopicCopyTemplateHe(slots.baseTemplateId, slots);
}
