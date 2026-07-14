/**
 * Hebrew printable question enrichment — passages, nikud, open writing.
 * @module lib/worksheets/worksheet-hebrew-display.server
 */

import {
  textAlreadyHasNiqqud,
  isChildHebrewNiqqudGradeKey,
} from "../../utils/hebrew-dicta-nakdan.js";
import { WORKSHEET_PRINTABILITY } from "./worksheet-question-types.js";

const PASSAGE_READ_RE =
  /^(?:כיתה\s+[א-ו׳'״\d]+\s*[—–-]\s*)?קראו?:\s*['"]([^'"]+)['"]\s*(.+)$/u;

const LONG_PASSAGE_CHARS = 120;

/**
 * @param {string} stem
 * @returns {{ passageHe: string|null, stemHe: string, isLong: boolean }}
 */
export function splitHebrewPassageFromStem(stem) {
  const raw = String(stem || "").trim();
  const m = raw.match(PASSAGE_READ_RE);
  if (!m) {
    return { passageHe: null, stemHe: raw, isLong: false };
  }
  const passageHe = m[1].trim();
  const stemHe = m[2].trim();
  return {
    passageHe,
    stemHe: stemHe || raw,
    isLong: passageHe.length >= LONG_PASSAGE_CHARS,
  };
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function hebrewTextHasNikud(text) {
  return textAlreadyHasNiqqud(String(text || ""));
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function isHebrewWritingOpenQuestion(raw) {
  const topic = String(raw.topic || raw.operation || "");
  const answerMode = String(raw.params?.answerMode || raw.answerMode || "");
  if (topic === "writing") return true;
  if (answerMode === "typing") return true;
  return false;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichHebrewPrintableQuestion(raw, base) {
  const gradeKey = String(raw.params?.gradeKey || raw.gradeLevel || "");
  const split = splitHebrewPassageFromStem(base.stemHe);
  const passageHe = base.passageHe || split.passageHe || undefined;
  const stemHe = split.stemHe || base.stemHe;
  const hasNikud =
    isChildHebrewNiqqudGradeKey(gradeKey) &&
    (hebrewTextHasNikud(stemHe) || (passageHe ? hebrewTextHasNikud(passageHe) : false));

  let questionType = base.questionType;
  if (passageHe && base.optionsHe?.length) {
    questionType = split.isLong ? "passage_mcq" : "passage_mcq";
  } else if (isHebrewWritingOpenQuestion(raw)) {
    questionType = "open";
  } else if (base.optionsHe?.length) {
    questionType = "mcq";
  }

  const writingSpaceLines =
    questionType === "open"
      ? typeof raw.writingSpaceLines === "number"
        ? raw.writingSpaceLines
        : 5
      : base.writingSpaceLines;

  let printability = base.printability;
  const itemType = String(raw.params?.itemType || raw.itemType || "");
  if (raw.requiresAudio === true || itemType === "audio") {
    printability = WORKSHEET_PRINTABILITY.blocked_audio;
  }

  return {
    ...base,
    stemHe,
    passageHe,
    questionType,
    writingSpaceLines,
    hasNikud: hasNikud || undefined,
    longPassage: split.isLong || undefined,
    printability,
  };
}
