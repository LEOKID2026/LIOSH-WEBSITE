/**
 * MCQ distractor-based classifier — uses explicit distractorFamily/misconceptionTag on selected cell.
 */

import { EVIDENCE_TYPES } from "../answer-evidence-contract.js";
import { mcqCellValue } from "../../../utils/mcq-option-cell.js";
import { GENERIC_PROXIMITY } from "../question-engine-metadata.js";
import { normalizeToCanonicalTag } from "../taxonomy-tag-normalizer.js";

/** @param {unknown} v */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {unknown} selectedCell
 * @param {unknown} selectedValue
 * @param {unknown} correctValue
 */
export function classifyMcqDistractorAnswer(selectedCell, selectedValue, correctValue) {
  const cell =
    selectedCell && typeof selectedCell === "object" && !Array.isArray(selectedCell)
      ? selectedCell
      : null;
  const raw = pickStr(cell?.distractorFamily) || pickStr(cell?.misconceptionTag);
  const df = normalizeToCanonicalTag(raw);
  if (!df || df === "unknown" || df === GENERIC_PROXIMITY || df === "generic_proximity") {
    return null;
  }

  const user = mcqCellValue(selectedValue ?? cell);
  const correct = mcqCellValue(correctValue);
  if (user != null && correct != null && String(user) === String(correct)) return null;

  return {
    tag: df,
    evidenceType: EVIDENCE_TYPES.DISTRACTOR_EVIDENCE,
    details: {
      distractorFamily: df,
      selectedValue: user,
      correctValue: correct,
      selectedIndex: cell?.index ?? null,
    },
    confidence: 0.88,
  };
}

/**
 * Resolve selected option cell from question + index/value.
 * @param {Record<string, unknown>|null|undefined} question
 * @param {unknown} selectedValue
 * @param {number|null|undefined} selectedIndex
 */
export function resolveSelectedMcqCell(question, selectedValue, selectedIndex) {
  if (!question || typeof question !== "object") return null;
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? question.params
      : {};
  const choices =
    (Array.isArray(params.mcqOptionCells) && params.mcqOptionCells) ||
    (Array.isArray(question.answers) && question.answers) ||
    (Array.isArray(question.options) && question.options) ||
    (Array.isArray(question.choices) && question.choices) ||
    null;
  if (!choices?.length) return null;
  if (selectedIndex != null && choices[selectedIndex] != null) return choices[selectedIndex];
  for (const cell of choices) {
    if (mcqCellValue(cell) === mcqCellValue(selectedValue)) return cell;
  }
  return null;
}
