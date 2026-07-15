/**
 * Hebrew printable question enrichment — passages, nikud, open writing.
 * @module lib/worksheets/worksheet-hebrew-display.server
 */

import {
  textAlreadyHasNiqqud,
  isChildHebrewNiqqudGradeKey,
} from "../../utils/hebrew-dicta-nakdan.js";
import { HEBREW_PRINT_BLOCKED_ITEM_TYPES } from "./worksheet-hebrew-allowlist.js";
import { WORKSHEET_PRINTABILITY } from "./worksheet-question-types.js";

const PASSAGE_READ_RE =
  /^(?:כיתה\s+[א-ו׳'״\d]+\s*[–-]\s*)?(?:קראו?(?:\s+את\s+הטקסט)?)\s*:\s*['"“”«»]([^'"“”«»]+)['"“”«»]\s*(.+)$/u;

const LONG_PASSAGE_CHARS = 120;

/** Final-form letters must not appear mid-word (e.g. הכיןה → הכינה). */
const FINAL_TO_MEDIAL = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ",
};

/**
 * @param {string} text
 * @returns {string}
 */
export function fixHebrewFinalLettersMidWord(text) {
  const raw = String(text || "");
  if (!raw) return raw;
  return raw.replace(/[ךםןףץ](?=[\u05D0-\u05EA])/g, (ch) => FINAL_TO_MEDIAL[ch] || ch);
}

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
  const split = splitHebrewPassageFromStem(fixHebrewFinalLettersMidWord(base.stemHe));
  const passageHeRaw = base.passageHe || split.passageHe || undefined;
  const passageHe = passageHeRaw ? fixHebrewFinalLettersMidWord(passageHeRaw) : undefined;
  const stemHe = fixHebrewFinalLettersMidWord(
    split.passageHe ? split.stemHe || base.stemHe : base.stemHe
  );
  const optionsHe = base.optionsHe?.length
    ? base.optionsHe.map((o) => fixHebrewFinalLettersMidWord(o))
    : base.optionsHe;
  const passageLen = passageHe ? passageHe.length : 0;
  const longPassage = Boolean(split.isLong || passageLen >= LONG_PASSAGE_CHARS);
  const hasNikud =
    isChildHebrewNiqqudGradeKey(gradeKey) &&
    (hebrewTextHasNikud(stemHe) || (passageHe ? hebrewTextHasNikud(passageHe) : false));

  let questionType = base.questionType;
  if (passageHe && optionsHe?.length) {
    questionType = "passage_mcq";
  } else if (isHebrewWritingOpenQuestion(raw)) {
    questionType = "open";
  } else if (optionsHe?.length) {
    questionType = "mcq";
  }

  const writingSpaceLines =
    questionType === "open"
      ? typeof raw.writingSpaceLines === "number"
        ? raw.writingSpaceLines
        : 6
      : base.writingSpaceLines;

  let printability = base.printability;
  const itemType = String(raw.params?.itemType || raw.itemType || "");
  if (
    raw.requiresAudio === true ||
    raw.params?.requiresAudio === true ||
    itemType === "audio" ||
    HEBREW_PRINT_BLOCKED_ITEM_TYPES.has(itemType)
  ) {
    printability = WORKSHEET_PRINTABILITY.blocked_audio;
  }

  return {
    ...base,
    stemHe,
    passageHe,
    optionsHe,
    questionType,
    writingSpaceLines,
    hasNikud: hasNikud || undefined,
    longPassage: longPassage || undefined,
    printability,
  };
}
