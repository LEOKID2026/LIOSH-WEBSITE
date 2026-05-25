/**
 * Topic-scoped evidence helpers + legacy entry (delegates to intent-answer-composers).
 */

import { foldUtteranceForHeMatch, normalizeFreeformParentUtteranceHe } from "./utterance-normalize-he.js";
import { tryComposeIntentAnswer } from "./intent-answer-composers.js";
import { rewriteEngineTaxonomySnippetForParentHe } from "../diagnostic-labels-he.js";
import {
  parentFacingDiagnosisSnippetHe,
  parentFacingPatternLabelHe,
} from "../parent-report-language/parent-facing-pattern-label-he.js";

const MISTAKE_QUESTION_RE =
  /טעויות|טעיות|טעות|איפה\s*(?:הוא|היא|הילד|הילדה)?\s*טעה|במה\s*(?:הוא|היא|הילד)?\s*טעה|מה\s*חוזר\s*בטעות|הטעויות\s*הבולטות|איפה\s*הילד\s*טעה|סוג\s*הטעות|דפוס\s*טעות/u;

/**
 * @param {string} utterance
 */
export function isMistakePatternQuestion(utterance) {
  return MISTAKE_QUESTION_RE.test(foldUtteranceForHeMatch(normalizeFreeformParentUtteranceHe(utterance)));
}

/**
 * @param {object|null|undefined} unit
 */
export function extractMistakePatternHeFromUnit(unit) {
  if (!unit || typeof unit !== "object") return "";
  const diagLine = String(unit?.diagnosis?.lineHe || "").trim();
  if (diagLine && unit?.diagnosis?.allowed !== false) {
    return parentFacingDiagnosisSnippetHe(unit, diagLine);
  }
  const mapped = parentFacingPatternLabelHe(unit);
  if (mapped) return mapped;
  const subskill = String(unit?.taxonomy?.subskillHe || "").trim();
  if (subskill) return rewriteEngineTaxonomySnippetForParentHe(subskill);
  return "";
}

/**
 * @param {object} params
 * @deprecated Use tryComposeIntentAnswer — kept for callers/tests.
 */
export function tryComposeTopicEvidenceAnswer(params) {
  return tryComposeIntentAnswer({
    ...params,
    stageAIntent: params?.plannerIntent || params?.stageAIntent,
  });
}

export default {
  isMistakePatternQuestion,
  extractMistakePatternHeFromUnit,
  tryComposeTopicEvidenceAnswer,
};
