/**
 * Visual contract copied from the approved Hebrew master inline layout.
 * Used by verbal-only learning subjects (English, Science, History, Moledet/Geography).
 * Does NOT modify Hebrew output — Hebrew keeps its local inline values.
 */

import { LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS } from "./learning-master-mobile.client.js";
import {
  measureVisibleQuestionTextLength,
  VERBAL_PASSAGE_COLOR,
} from "./learning-question-font.js";

export const HEBREW_APPROVED_SINGLE_VERBAL_QUESTION_COLOR = VERBAL_PASSAGE_COLOR;

/** Layout-only — no slate, no legacy body font-size/color. */
export const HEBREW_APPROVED_SINGLE_VERBAL_QUESTION_CLASSNAME =
  "text-center break-words overflow-wrap-anywhere max-w-full px-2 w-full";

/**
 * Mobile font size for a single verbal question (visible text length).
 * @param {number} charCount
 */
export function getHebrewApprovedSingleVerbalQuestionMobileFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 55) return 24;
  if (n <= 100) return 22;
  return 20;
}

/**
 * Desktop font size for a single verbal question (visible text length).
 * @param {number} charCount
 */
export function getHebrewApprovedSingleVerbalQuestionDesktopFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 55) return 34;
  if (n <= 100) return 30;
  return 26;
}

/**
 * Inline style for one verbal question block (no reading passage split).
 * @param {{ text?: string, isMobileViewport?: boolean }} [opts]
 */
export function getHebrewApprovedSingleVerbalQuestionStyle({
  text,
  isMobileViewport = false,
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    color: HEBREW_APPROVED_SINGLE_VERBAL_QUESTION_COLOR,
    fontWeight: 750,
    lineHeight: charCount > 100 ? 1.3 : 1.4,
    maxWidth: "92%",
    width: "100%",
    marginInline: "auto",
  };
  style.fontSize = isMobileViewport
    ? `${getHebrewApprovedSingleVerbalQuestionMobileFontSizePx(charCount)}px`
    : `${getHebrewApprovedSingleVerbalQuestionDesktopFontSizePx(charCount)}px`;
  return style;
}

export const HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS =
  "w-full flex-1 min-h-0 mt-2 flex flex-col items-center justify-end";

export const HEBREW_APPROVED_VERBAL_ANSWER_CARD_NARROW_CLASS =
  "max-[420px]:px-3 max-[420px]:py-2.5 max-[420px]:min-h-[4.25rem] max-[420px]:text-sm";

export const HEBREW_APPROVED_VERBAL_VERTICAL_PRE_CLASS =
  "text-2xl md:text-3xl text-center text-white font-bold font-mono whitespace-pre";

/**
 * @param {{
 *   MB: { questionLead: string, questionBody: string },
 *   questionParts?: Array<string | null | undefined>,
 *   answers?: Array<unknown>,
 * }} input
 */
export function buildHebrewApprovedVerbalMasterLayout({
  MB,
  questionParts = [],
  answers = [],
}) {
  const questionTextForPressure = questionParts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  const answerTextsForPressure = Array.isArray(answers)
    ? answers.map((a) => String(a ?? "").trim())
    : [];

  const questionWordCount = questionTextForPressure
    ? questionTextForPressure.split(/\s+/).filter(Boolean).length
    : 0;
  const questionCharCount = questionTextForPressure.length;
  const longestAnswerChars = answerTextsForPressure.length
    ? Math.max(...answerTextsForPressure.map((a) => a.length))
    : 0;
  const totalAnswerChars = answerTextsForPressure.reduce((sum, a) => sum + a.length, 0);

  const questionPressureScore = questionCharCount + questionWordCount * 2;
  const answerPressureScore = longestAnswerChars * 2 + totalAnswerChars;

  const questionPressureBucket =
    questionPressureScore >= 170
      ? "veryLong"
      : questionPressureScore >= 120
        ? "long"
        : questionPressureScore >= 70
          ? "medium"
          : "short";

  const answerPressureBucket =
    answerPressureScore >= 260
      ? "veryLong"
      : answerPressureScore >= 190
        ? "long"
        : answerPressureScore >= 120
          ? "medium"
          : "short";

  const questionSlotClassByPressure =
    questionPressureBucket === "veryLong"
      ? "w-full shrink-0 min-h-[170px] max-[420px]:min-h-[100px] md:min-h-[210px] flex flex-col items-center justify-center px-1"
      : questionPressureBucket === "long"
        ? "w-full shrink-0 min-h-[190px] max-[420px]:min-h-[110px] md:min-h-[230px] flex flex-col items-center justify-center px-1.5"
        : questionPressureBucket === "medium"
          ? "w-full shrink-0 min-h-[210px] max-[420px]:min-h-[120px] md:min-h-[245px] flex flex-col items-center justify-center px-2"
          : "w-full shrink-0 min-h-[230px] max-[420px]:min-h-[130px] md:min-h-[260px] flex flex-col items-center justify-center px-2";

  const questionSlotClassForStem = `${questionSlotClassByPressure} max-md:mb-1.5`.trim();

  const questionLineHeightByPressure =
    questionPressureBucket === "veryLong"
      ? 1.22
      : questionPressureBucket === "long"
        ? 1.28
        : questionPressureBucket === "medium"
          ? 1.34
          : 1.4;

  const questionBottomSpacingClass =
    questionPressureBucket === "veryLong"
      ? "mb-2"
      : questionPressureBucket === "long"
        ? "mb-2.5"
        : "mb-4";

  const questionLeadClassName = `${MB.questionLead} ${questionBottomSpacingClass} break-words overflow-wrap-anywhere max-w-full px-2`.trim();

  const questionBodyClassName = `${HEBREW_APPROVED_SINGLE_VERBAL_QUESTION_CLASSNAME} ${questionBottomSpacingClass}`.trim();

  const questionSingleVerbalClassName = questionBodyClassName;

  const answerCardTextClass =
    answerPressureBucket === "veryLong"
      ? "text-base leading-snug px-3 py-3 min-h-[4.75rem]"
      : answerPressureBucket === "long"
        ? "text-base leading-snug px-3.5 py-3.5 min-h-[5rem]"
        : answerPressureBucket === "medium"
          ? "text-lg leading-snug px-4 py-4 min-h-[5.25rem]"
          : "text-xl leading-snug px-5 py-5 min-h-[5.5rem]";

  const useNarrowMobileAnswerFallback =
    answerPressureBucket === "veryLong" ||
    (answerPressureBucket === "long" && questionPressureBucket !== "short");

  return {
    questionPressureBucket,
    answerPressureBucket,
    questionSlotClassForStem,
    questionLineHeightByPressure,
    questionBottomSpacingClass,
    questionLeadClassName,
    questionBodyClassName,
    questionSingleVerbalClassName,
    answerCardTextClass,
    answerCardNarrowClass: HEBREW_APPROVED_VERBAL_ANSWER_CARD_NARROW_CLASS,
    useNarrowMobileAnswerFallback,
    verticalPreClassName: HEBREW_APPROVED_VERBAL_VERTICAL_PRE_CLASS,
  };
}

/**
 * MCQ grid — matches approved Hebrew (scale only when mobile viewport).
 * @param {{ useNarrowMobileAnswerFallback?: boolean, isMobileViewport?: boolean }} [opts]
 */
export function buildHebrewApprovedVerbalMcqGridClassName({
  useNarrowMobileAnswerFallback = false,
  isMobileViewport = false,
} = {}) {
  return [
    "grid gap-3 w-full mb-3 max-[420px]:gap-2 max-[420px]:mb-2",
    useNarrowMobileAnswerFallback
      ? "grid-cols-2 max-[420px]:grid-cols-1"
      : "grid-cols-2",
    isMobileViewport ? LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
}
