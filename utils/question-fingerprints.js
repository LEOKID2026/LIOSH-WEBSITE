import { buildQuestionFingerprint, buildNearDuplicateStemKey } from "./question-quality.js";
import { mathQuestionFingerprint } from "./math-learning-intel.js";
import { geometryQuestionFingerprint, geometryConceptLineageKey } from "./geometry-learning-intel.js";
import { englishQuestionFingerprint } from "./english-learning-intel.js";
import {
  hebrewQuestionFingerprint,
  hebrewNearDuplicateKey,
} from "./hebrew-learning-intel.js";

/**
 * @param {unknown} q
 * @param {string} subject
 * @param {{ grade?: string, level?: string, topic?: string }} [ctx]
 */
export function getQuestionFingerprintForSubject(q, subject, ctx = {}) {
  const subj = String(subject || "").toLowerCase();
  switch (subj) {
    case "math":
      return mathQuestionFingerprint(q) || buildQuestionFingerprint(q, { ...ctx, subject: subj });
    case "geometry":
      return geometryQuestionFingerprint(q) || buildQuestionFingerprint(q, { ...ctx, subject: subj });
    case "english":
      return englishQuestionFingerprint(q) || buildQuestionFingerprint(q, { ...ctx, subject: subj });
    case "hebrew":
      return hebrewQuestionFingerprint(q) || buildQuestionFingerprint(q, { ...ctx, subject: subj });
    case "science":
      if (q?.id || q?._scienceBankId) return `science|id:${q.id || q._scienceBankId}`;
      return buildQuestionFingerprint(q, { ...ctx, subject: subj });
    case "moledet":
    case "moledet_geography":
      if (q?.id) return `moledet|id:${q.id}`;
      return buildQuestionFingerprint(q, { ...ctx, subject: "moledet" });
    default:
      return buildQuestionFingerprint(q, { ...ctx, subject: subj });
  }
}

/**
 * @param {unknown} q
 * @param {string} subject
 */
export function getNearDuplicateKeyForSubject(q, subject) {
  const subj = String(subject || "").toLowerCase();
  if (subj === "hebrew") return hebrewNearDuplicateKey(q);
  if (subj === "geometry") return geometryConceptLineageKey(q);
  return buildNearDuplicateStemKey(q);
}
