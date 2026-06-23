/**
 * Diagnostic Evidence Contract — normalize answer/attempt rows for quality layer.
 * Phase Q1: parent context policy only; derived at aggregation time (no DB schema).
 */

import { EVIDENCE_CATEGORIES } from "./activity-classification.js";

/** Source types allowed in parent/guardian report context. */
export const PARENT_CONTEXT_ALLOWED_SOURCES = Object.freeze(
  new Set(["free_practice", "assigned_parent", "assigned_individual"])
);

/** @type {Record<string, number>} */
export const DIAGNOSTIC_WEIGHT_BY_CATEGORY = Object.freeze({
  [EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT]: 1,
  [EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED]: 0.7,
  [EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE]: 0.5,
  [EVIDENCE_CATEGORIES.LEARNING_GUIDED]: 0,
  [EVIDENCE_CATEGORIES.LEARNING_REVIEW]: 0,
  [EVIDENCE_CATEGORIES.LEARNING_BOOK]: 0,
  [EVIDENCE_CATEGORIES.LEARNING_CONTEXT]: 0,
  [EVIDENCE_CATEGORIES.UNCLASSIFIED]: 0,
});

/**
 * @param {string|null|undefined} evidenceCategory
 * @returns {number}
 */
export function diagnosticWeightForCategory(evidenceCategory) {
  const key = String(evidenceCategory || "").trim();
  return DIAGNOSTIC_WEIGHT_BY_CATEGORY[key] ?? 0;
}

/**
 * @param {string|null|undefined} sourceType
 * @param {"parent"|"private_teacher"|"school"} [context]
 * @returns {boolean}
 */
export function isSourceAllowedInContext(sourceType, context = "parent") {
  const src = String(sourceType || "").trim();
  if (!src) return false;
  if (context === "parent") return PARENT_CONTEXT_ALLOWED_SOURCES.has(src);
  return false;
}

/**
 * @param {{
 *   evidenceId: string,
 *   studentId?: string,
 *   subject?: string,
 *   topic?: string,
 *   grade?: string|null,
 *   questionMode?: string,
 *   sourceType: string,
 *   isCorrect?: boolean,
 *   answerTimeMs?: number|null,
 *   evidenceCategory?: string,
 *   isDiagnosticEligible?: boolean,
 *   answeredAt?: string|null,
 *   contextFlags?: object,
 * }} row
 * @param {"parent"|"private_teacher"|"school"} [context]
 * @returns {object|null}
 */
export function normalizeEvidenceRow(row, context = "parent") {
  if (!row?.evidenceId) return null;
  const sourceType = String(row.sourceType || "").trim();
  if (!isSourceAllowedInContext(sourceType, context)) return null;

  const category = String(row.evidenceCategory || "").trim();
  const eligible = row.isDiagnosticEligible === true && diagnosticWeightForCategory(category) > 0;

  return {
    evidenceId: String(row.evidenceId),
    studentId: row.studentId ? String(row.studentId) : null,
    subject: String(row.subject || "").trim() || null,
    topic: String(row.topic || "").trim() || null,
    grade: row.grade != null ? String(row.grade) : null,
    questionMode: String(row.questionMode || "").trim() || null,
    sourceType,
    isCorrect: row.isCorrect === true,
    answerTimeMs: Number.isFinite(Number(row.answerTimeMs)) ? Number(row.answerTimeMs) : null,
    diagnosticWeight: diagnosticWeightForCategory(category),
    evidenceCategory: category || null,
    isDiagnosticEligible: eligible,
    answeredAt: row.answeredAt ? String(row.answeredAt) : null,
    contextFlags: row.contextFlags && typeof row.contextFlags === "object" ? row.contextFlags : {},
  };
}
