/**
 * Q2-E.4 — Internal questionType grouping (parent context, flag-gated).
 */

import { buildSubSkillGroupKey } from "./question-metadata-resolve-at-answer.js";
import { resolveMetadataConfidenceCap } from "./question-metadata-confidence-caps.js";

const KNOWN_QUESTION_TYPES = new Set([
  "technical",
  "word_problem",
  "reading_comprehension",
  "vocabulary",
  "grammar",
  "translation",
  "diagram",
  "visual",
  "mcq",
  "numeric",
  "open",
  "audio",
]);

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * Normalize canonical questionType for internal grouping.
 * Returns null when type is missing/unknown — callers bucket as unclassified.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeQuestionType(raw) {
  const s = pickStr(raw).toLowerCase();
  if (!s || s === "unknown") return null;
  if (s === "diagram" || s === "visual") return s;
  if (KNOWN_QUESTION_TYPES.has(s)) return s;
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function questionTypeBucket(raw) {
  return normalizeQuestionType(raw) || "unclassified";
}

/**
 * @param {import("./question-metadata-resolve-at-answer.js").ResolvedCanonicalMeta} meta
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 * @param {Record<string, object>} globalRollup
 */
export function bumpDiagnosticQuestionTypeRollup(meta, subject, topic, isCorrect, globalRollup) {
  const type = questionTypeBucket(meta.questionType);
  const key = `${pickStr(subject) || "unknown"}::${pickStr(topic) || "general"}::${type}`;

  if (!globalRollup[key]) {
    globalRollup[key] = {
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      questionType: type,
      skillId: meta.skillId,
      metadataConfidence: meta.metadataConfidence,
      possibleErrorPatterns: meta.possibleErrorPatterns,
      diagnosticAnswers: 0,
      diagnosticWrong: 0,
    };
  }

  const entry = globalRollup[key];
  entry.diagnosticAnswers += 1;
  if (!isCorrect) entry.diagnosticWrong += 1;
}

/**
 * @param {import("./question-metadata-resolve-at-answer.js").ResolvedCanonicalMeta} meta
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 * @param {Record<string, object>} groupRollup
 */
export function bumpDiagnosticQuestionTypeGroupRollup(meta, subject, topic, isCorrect, groupRollup) {
  const groupKey = buildSubSkillGroupKey(meta, subject, topic);
  const type = questionTypeBucket(meta.questionType);
  const key = `${groupKey}::${type}`;

  if (!groupRollup[key]) {
    groupRollup[key] = {
      groupKey,
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      questionType: type,
      skillId: meta.skillId,
      subSkill: meta.subSkill,
      metadataConfidence: meta.metadataConfidence,
      possibleErrorPatterns: meta.possibleErrorPatterns,
      groupingLevel: groupKey.endsWith("::__topic__") ? "topic" : "subSkill",
      diagnosticAnswers: 0,
      diagnosticWrong: 0,
    };
  }

  const entry = groupRollup[key];
  entry.diagnosticAnswers += 1;
  if (!isCorrect) entry.diagnosticWrong += 1;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} [groupKey]
 * @returns {object}
 */
function capFieldsForQuestionTypeRow(row, groupKey) {
  const type = pickStr(row.questionType) || "unclassified";
  return resolveMetadataConfidenceCap({
    metadataConfidence: pickStr(row.metadataConfidence) || null,
    skillId: pickStr(row.skillId) || null,
    subSkill: pickStr(row.subSkill) || null,
    possibleErrorPatterns: row.possibleErrorPatterns,
    groupingLevel: pickStr(row.groupingLevel) || "subSkill",
    groupKey: groupKey || pickStr(row.groupKey),
    questionType: type,
  });
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, object>}
 */
export function computeInternalQuestionTypes(payload) {
  const rollup = payload._diagnosticQuestionTypeRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, object>} */
  const out = {};
  for (const [key, entry] of Object.entries(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    if (safeNum(row.diagnosticAnswers) <= 0) continue;
    const cap = capFieldsForQuestionTypeRow(row);
    out[key] = {
      questionType: row.questionType,
      subject: row.subject,
      topic: row.topic,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      skillId: row.skillId ?? null,
      metadataConfidence: row.metadataConfidence ?? null,
      isUnclassified: row.questionType === "unclassified",
      ...cap,
    };
  }
  return out;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, Record<string, object>>}
 */
export function computeQuestionTypeBreakdownByGroup(payload) {
  const rollup = payload._diagnosticQuestionTypeByGroupRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, Record<string, object>>} */
  const byGroup = {};

  for (const entry of Object.values(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    const groupKey = pickStr(row.groupKey);
    const type = pickStr(row.questionType) || "unclassified";
    if (!groupKey || safeNum(row.diagnosticAnswers) <= 0) continue;

    if (!byGroup[groupKey]) byGroup[groupKey] = {};
    const cap = capFieldsForQuestionTypeRow(row, groupKey);
    byGroup[groupKey][type] = {
      questionType: type,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      isUnclassified: type === "unclassified",
      ...cap,
    };
  }

  return byGroup;
}

/**
 * @param {Record<string, object>} bySubSkill
 * @param {Record<string, Record<string, object>>} breakdownByGroup
 * @returns {Record<string, object>}
 */
export function attachQuestionTypeBreakdownToBySubSkill(bySubSkill, breakdownByGroup) {
  /** @type {Record<string, object>} */
  const out = {};
  for (const [groupKey, entry] of Object.entries(bySubSkill || {})) {
    const breakdown = breakdownByGroup[groupKey];
    out[groupKey] = {
      ...entry,
      ...(breakdown && Object.keys(breakdown).length > 0
        ? { questionTypeBreakdown: breakdown }
        : {}),
    };
  }
  return out;
}

/**
 * @param {unknown} v
 */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
