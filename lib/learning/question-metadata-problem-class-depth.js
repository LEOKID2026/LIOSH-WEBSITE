/**
 * Q2-E.6 — Internal problemClass / difficultyDepth grouping (parent context, flag-gated).
 */

import { buildSubSkillGroupKey } from "./question-metadata-resolve-at-answer.js";
import { resolveMetadataConfidenceCap } from "./question-metadata-confidence-caps.js";

const KNOWN_PROBLEM_CLASSES = new Set(["conceptual", "procedural", "mixed"]);
const KNOWN_DIFFICULTY_DEPTHS = new Set([
  "recall",
  "simple_application",
  "multi_step",
  "inference",
]);

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeProblemClass(raw) {
  const s = pickStr(raw).toLowerCase();
  if (!s || s === "unknown") return null;
  if (KNOWN_PROBLEM_CLASSES.has(s)) return s;
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function problemClassBucket(raw) {
  return normalizeProblemClass(raw) || "unclassified";
}

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeDifficultyDepth(raw) {
  const s = pickStr(raw).toLowerCase();
  if (!s || s === "unknown") return null;
  if (KNOWN_DIFFICULTY_DEPTHS.has(s)) return s;
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function difficultyDepthBucket(raw) {
  return normalizeDifficultyDepth(raw) || "unclassified";
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} [groupKey]
 * @returns {object}
 */
function capFieldsForPedagogyRow(row, groupKey) {
  const problemClass = pickStr(row.problemClass) || "unclassified";
  const difficultyDepth = pickStr(row.difficultyDepth) || "unclassified";
  return resolveMetadataConfidenceCap({
    metadataConfidence: pickStr(row.metadataConfidence) || null,
    skillId: pickStr(row.skillId) || null,
    subSkill: pickStr(row.subSkill) || null,
    possibleErrorPatterns: row.possibleErrorPatterns,
    groupingLevel: pickStr(row.groupingLevel) || "subSkill",
    groupKey: groupKey || pickStr(row.groupKey),
    questionType: pickStr(row.questionType) || null,
    problemClass,
    difficultyDepth,
  });
}

/**
 * @param {import("./question-metadata-resolve-at-answer.js").ResolvedCanonicalMeta} meta
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 * @param {Record<string, object>} globalRollup
 */
export function bumpDiagnosticProblemClassRollup(meta, subject, topic, isCorrect, globalRollup) {
  const problemClass = problemClassBucket(meta.problemClass);
  const key = `${pickStr(subject) || "unknown"}::${pickStr(topic) || "general"}::${problemClass}`;

  if (!globalRollup[key]) {
    globalRollup[key] = {
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      problemClass,
      skillId: meta.skillId,
      questionType: meta.questionType,
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
 * @param {Record<string, object>} globalRollup
 */
export function bumpDiagnosticDifficultyDepthRollup(meta, subject, topic, isCorrect, globalRollup) {
  const difficultyDepth = difficultyDepthBucket(meta.difficultyDepth);
  const key = `${pickStr(subject) || "unknown"}::${pickStr(topic) || "general"}::${difficultyDepth}`;

  if (!globalRollup[key]) {
    globalRollup[key] = {
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      difficultyDepth,
      skillId: meta.skillId,
      questionType: meta.questionType,
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
export function bumpDiagnosticProblemClassGroupRollup(meta, subject, topic, isCorrect, groupRollup) {
  const groupKey = buildSubSkillGroupKey(meta, subject, topic);
  const problemClass = problemClassBucket(meta.problemClass);
  const key = `${groupKey}::${problemClass}`;

  if (!groupRollup[key]) {
    groupRollup[key] = {
      groupKey,
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      problemClass,
      skillId: meta.skillId,
      subSkill: meta.subSkill,
      questionType: meta.questionType,
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
 * @param {import("./question-metadata-resolve-at-answer.js").ResolvedCanonicalMeta} meta
 * @param {string} subject
 * @param {string} topic
 * @param {boolean} isCorrect
 * @param {Record<string, object>} groupRollup
 */
export function bumpDiagnosticDifficultyDepthGroupRollup(
  meta,
  subject,
  topic,
  isCorrect,
  groupRollup
) {
  const groupKey = buildSubSkillGroupKey(meta, subject, topic);
  const difficultyDepth = difficultyDepthBucket(meta.difficultyDepth);
  const key = `${groupKey}::${difficultyDepth}`;

  if (!groupRollup[key]) {
    groupRollup[key] = {
      groupKey,
      subject: pickStr(subject) || "unknown",
      topic: pickStr(topic) || "general",
      difficultyDepth,
      skillId: meta.skillId,
      subSkill: meta.subSkill,
      questionType: meta.questionType,
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
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, object>}
 */
export function computeInternalProblemClasses(payload) {
  const rollup = payload._diagnosticProblemClassRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, object>} */
  const out = {};
  for (const [key, entry] of Object.entries(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    if (safeNum(row.diagnosticAnswers) <= 0) continue;
    const problemClass = pickStr(row.problemClass) || "unclassified";
    const cap = capFieldsForPedagogyRow(row);
    out[key] = {
      problemClass,
      subject: row.subject,
      topic: row.topic,
      questionType: row.questionType ?? null,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      skillId: row.skillId ?? null,
      metadataConfidence: row.metadataConfidence ?? null,
      isUnclassified: problemClass === "unclassified",
      ...cap,
    };
  }
  return out;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, object>}
 */
export function computeInternalDifficultyDepths(payload) {
  const rollup = payload._diagnosticDifficultyDepthRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, object>} */
  const out = {};
  for (const [key, entry] of Object.entries(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    if (safeNum(row.diagnosticAnswers) <= 0) continue;
    const difficultyDepth = pickStr(row.difficultyDepth) || "unclassified";
    const cap = capFieldsForPedagogyRow(row);
    out[key] = {
      difficultyDepth,
      subject: row.subject,
      topic: row.topic,
      questionType: row.questionType ?? null,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      skillId: row.skillId ?? null,
      metadataConfidence: row.metadataConfidence ?? null,
      isUnclassified: difficultyDepth === "unclassified",
      ...cap,
    };
  }
  return out;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, Record<string, object>>}
 */
export function computeProblemClassBreakdownByGroup(payload) {
  const rollup = payload._diagnosticProblemClassByGroupRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, Record<string, object>>} */
  const byGroup = {};

  for (const entry of Object.values(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    const groupKey = pickStr(row.groupKey);
    const problemClass = pickStr(row.problemClass) || "unclassified";
    if (!groupKey || safeNum(row.diagnosticAnswers) <= 0) continue;

    if (!byGroup[groupKey]) byGroup[groupKey] = {};
    const cap = capFieldsForPedagogyRow(row, groupKey);
    byGroup[groupKey][problemClass] = {
      problemClass,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      isUnclassified: problemClass === "unclassified",
      ...cap,
    };
  }

  return byGroup;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, Record<string, object>>}
 */
export function computeDifficultyDepthBreakdownByGroup(payload) {
  const rollup = payload._diagnosticDifficultyDepthByGroupRollup;
  if (!rollup || typeof rollup !== "object") return {};

  /** @type {Record<string, Record<string, object>>} */
  const byGroup = {};

  for (const entry of Object.values(rollup)) {
    if (!entry || typeof entry !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (entry);
    const groupKey = pickStr(row.groupKey);
    const difficultyDepth = pickStr(row.difficultyDepth) || "unclassified";
    if (!groupKey || safeNum(row.diagnosticAnswers) <= 0) continue;

    if (!byGroup[groupKey]) byGroup[groupKey] = {};
    const cap = capFieldsForPedagogyRow(row, groupKey);
    byGroup[groupKey][difficultyDepth] = {
      difficultyDepth,
      diagnosticAnswers: row.diagnosticAnswers,
      diagnosticWrong: row.diagnosticWrong,
      isUnclassified: difficultyDepth === "unclassified",
      ...cap,
    };
  }

  return byGroup;
}

/**
 * @param {Record<string, object>} bySubSkill
 * @param {Record<string, Record<string, object>>} problemClassByGroup
 * @param {Record<string, Record<string, object>>} difficultyDepthByGroup
 * @returns {Record<string, object>}
 */
export function attachPedagogyBreakdownsToBySubSkill(
  bySubSkill,
  problemClassByGroup,
  difficultyDepthByGroup
) {
  /** @type {Record<string, object>} */
  const out = {};
  for (const [groupKey, entry] of Object.entries(bySubSkill || {})) {
    const problemClassBreakdown = problemClassByGroup[groupKey];
    const difficultyDepthBreakdown = difficultyDepthByGroup[groupKey];
    out[groupKey] = {
      ...entry,
      ...(problemClassBreakdown && Object.keys(problemClassBreakdown).length > 0
        ? { problemClassBreakdown }
        : {}),
      ...(difficultyDepthBreakdown && Object.keys(difficultyDepthBreakdown).length > 0
        ? { difficultyDepthBreakdown }
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
