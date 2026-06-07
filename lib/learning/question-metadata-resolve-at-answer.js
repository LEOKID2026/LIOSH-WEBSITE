/**
 * Q2-E.1 — Resolve canonical metadata from answer payloads / question snapshots.
 * Internal only; does not override activity-classification diagnostic eligibility.
 */

import { normalizeQuestionMetadata } from "./question-metadata-normalizer.js";
import { isFallbackOnlySkillId } from "./question-metadata-fallback.js";

const TOPIC_ROLLUP_TOKEN = "__topic__";

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {unknown} v
 * @returns {string[]|null}
 */
function pickStrArray(v) {
  if (!Array.isArray(v)) return null;
  const out = v.map((x) => pickStr(x)).filter(Boolean);
  return out.length ? out : null;
}

/**
 * @typedef {object} ResolvedCanonicalMeta
 * @property {string|null} skillId
 * @property {string|null} subSkill
 * @property {string|null} questionType
 * @property {string|null} problemClass
 * @property {string|null} difficultyDepth
 * @property {string|null} metadataConfidence
 * @property {string[]|null} possibleErrorPatterns
 */

/**
 * @typedef {object} SubSkillRollupEntry
 * @property {string} subject
 * @property {string} topic
 * @property {string|null} skillId
 * @property {string|null} subSkill
 * @property {string|null} questionType
 * @property {string|null} metadataConfidence
 * @property {string[]|null} possibleErrorPatterns
 * @property {"subSkill"|"topic"} groupingLevel
 * @property {number} diagnosticAnswers
 * @property {number} diagnosticWrong
 */

/**
 * Trim normalized metadata to E.1 consumed fields.
 *
 * @param {Record<string, unknown>} normalized
 * @returns {ResolvedCanonicalMeta|null}
 */
function toResolvedCanonicalMeta(normalized) {
  if (!normalized || typeof normalized !== "object") return null;
  const skillId = pickStr(normalized.skillId) || null;
  const subSkill = pickStr(normalized.subSkill) || null;
  const metadataConfidence = pickStr(normalized.metadataConfidence) || null;
  const questionType = pickStr(normalized.questionType) || null;
  const problemClass = pickStr(normalized.problemClass) || null;
  const difficultyDepth = pickStr(normalized.difficultyDepth) || null;
  const possibleErrorPatterns = pickStrArray(normalized.possibleErrorPatterns);

  if (
    !skillId &&
    !subSkill &&
    !questionType &&
    !problemClass &&
    !difficultyDepth &&
    !metadataConfidence &&
    !possibleErrorPatterns
  ) {
    return null;
  }

  return {
    skillId,
    subSkill,
    questionType,
    problemClass,
    difficultyDepth,
    metadataConfidence,
    possibleErrorPatterns,
  };
}

/**
 * Resolve canonical metadata for a classified-diagnostic answer snapshot.
 * Returns null when not diagnostic-eligible — metadata cannot create evidence.
 *
 * @param {Record<string, unknown>|null|undefined} source
 * @param {{
 *   subject?: string,
 *   topic?: string,
 *   isDiagnosticEligible?: boolean,
 * }} [context]
 * @returns {ResolvedCanonicalMeta|null}
 */
export function resolveCanonicalMetadataFromAnswerSnapshot(source, context = {}) {
  if (context.isDiagnosticEligible !== true) return null;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const params =
    source.params && typeof source.params === "object" && !Array.isArray(source.params)
      ? source.params
      : {};

  const record = {
    ...source,
    subject: pickStr(context.subject) || pickStr(source.subject) || null,
    topic: pickStr(context.topic) || pickStr(source.topic) || null,
    params,
    questionEngine:
      source.questionEngine &&
      typeof source.questionEngine === "object" &&
      !Array.isArray(source.questionEngine)
        ? source.questionEngine
        : null,
  };

  const normalized = normalizeQuestionMetadata(record);

  if (params.canonicalMetadata && typeof params.canonicalMetadata === "object") {
    const cm = /** @type {Record<string, unknown>} */ (params.canonicalMetadata);
    return toResolvedCanonicalMeta({
      ...normalized,
      skillId: pickStr(cm.skillId) || pickStr(normalized.skillId),
      subSkill: pickStr(cm.subSkill) || pickStr(normalized.subSkill),
      questionType: pickStr(cm.questionType) || pickStr(normalized.questionType),
      problemClass: pickStr(cm.problemClass) || pickStr(normalized.problemClass),
      difficultyDepth: pickStr(cm.difficultyDepth) || pickStr(normalized.difficultyDepth),
      metadataConfidence: pickStr(cm.metadataConfidence) || pickStr(normalized.metadataConfidence),
      possibleErrorPatterns:
        pickStrArray(cm.possibleErrorPatterns) || pickStrArray(normalized.possibleErrorPatterns),
    });
  }

  return toResolvedCanonicalMeta(normalized);
}

/**
 * Whether subSkill-level grouping is safe for this metadata view.
 *
 * @param {ResolvedCanonicalMeta|null|undefined} meta
 * @returns {boolean}
 */
export function shouldUseSubSkillGrouping(meta) {
  if (!meta) return false;
  const subSkill = pickStr(meta.subSkill);
  if (!subSkill) return false;
  if (pickStr(meta.metadataConfidence) === "low") return false;
  if (isFallbackOnlySkillId(meta.skillId)) return false;
  return true;
}

/**
 * Internal grouping key: subject::topic::subSkill or subject::topic::__topic__ rollup.
 *
 * @param {ResolvedCanonicalMeta|null|undefined} meta
 * @param {string} subject
 * @param {string} topic
 * @returns {string}
 */
export function buildSubSkillGroupKey(meta, subject, topic) {
  const subj = pickStr(subject) || "unknown";
  const top = pickStr(topic) || "general";
  if (shouldUseSubSkillGrouping(meta)) {
    return `${subj}::${top}::${pickStr(meta.subSkill)}`;
  }
  return `${subj}::${top}::${TOPIC_ROLLUP_TOKEN}`;
}

/**
 * @param {Record<string, SubSkillRollupEntry>} rollup
 * @param {ResolvedCanonicalMeta} meta
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 */
export function bumpDiagnosticSubSkillRollup(rollup, meta, subject, topic, isCorrect) {
  const key = buildSubSkillGroupKey(meta, subject, topic);
  const groupingLevel = shouldUseSubSkillGrouping(meta) ? "subSkill" : "topic";

  if (!rollup[key]) {
    rollup[key] = {
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      skillId: meta.skillId,
      subSkill: groupingLevel === "subSkill" ? meta.subSkill : null,
      questionType: meta.questionType,
      metadataConfidence: meta.metadataConfidence,
      possibleErrorPatterns: meta.possibleErrorPatterns,
      groupingLevel,
      diagnosticAnswers: 0,
      diagnosticWrong: 0,
    };
  }

  const entry = rollup[key];
  entry.diagnosticAnswers += 1;
  if (!isCorrect) entry.diagnosticWrong += 1;
}

export { TOPIC_ROLLUP_TOKEN };
