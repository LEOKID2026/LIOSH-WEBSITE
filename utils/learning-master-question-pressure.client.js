/**
 * Dynamic question stem sizing for learning masters — no scroll; font scales by content length.
 */

export const LEARNING_MASTER_QUESTION_SLOT_CLASS =
  "relative w-full flex-1 min-h-0 max-[420px]:min-h-[28%] flex flex-col items-center justify-center px-1 md:px-2";

export const LEARNING_MASTER_ANSWER_SURFACE_CLASS =
  "w-full shrink-0 mt-1 md:mt-2 flex flex-col items-center";

/** Extra compression for MCQ cards — only on very narrow screens when fallback triggers. */
export const LEARNING_MASTER_ANSWER_CARD_NARROW_CLASS =
  "max-[420px]:px-3 max-[420px]:py-3.5 max-[420px]:min-h-[3.75rem] max-[420px]:text-[17px]";

/**
 * @param {{
 *   MB: { questionLead: string, questionBody: string },
 *   questionParts?: Array<string | null | undefined>,
 *   answers?: Array<unknown>,
 *   hasFloatButtons?: boolean,
 * }} input
 */
export function buildLearningMasterQuestionPressureLayout({
  MB,
  questionParts = [],
  answers = [],
  hasFloatButtons = false,
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

  const questionStemToneClass = MB.questionBody.includes("text-white")
    ? "text-white"
    : "text-slate-900";

  const questionBottomSpacingClass =
    questionPressureBucket === "veryLong"
      ? "mb-1"
      : questionPressureBucket === "long"
        ? "mb-1.5"
        : "mb-2";

  /** Float buttons are absolute — no layout inset or reserved row. */
  const questionStemInsetClass = "";

  const questionLeadClassByPressure = [
    "text-center break-words overflow-wrap-anywhere max-w-full px-2",
    questionStemToneClass,
    questionBottomSpacingClass,
    questionPressureBucket === "veryLong"
      ? "text-base md:text-lg font-semibold"
      : questionPressureBucket === "long"
        ? "text-lg md:text-xl font-semibold"
        : questionPressureBucket === "medium"
          ? "text-xl md:text-2xl font-semibold"
          : MB.questionLead.replace(/\s*mb-\S+/g, "").trim() || "text-2xl font-semibold",
  ].join(" ");

  const questionBodyClassByPressure = [
    "text-center font-bold max-w-full px-2 break-words overflow-wrap-anywhere",
    questionStemToneClass,
    questionBottomSpacingClass,
    questionPressureBucket === "veryLong"
      ? "text-lg md:text-xl"
      : questionPressureBucket === "long"
        ? "text-xl md:text-2xl"
        : questionPressureBucket === "medium"
          ? "text-2xl md:text-3xl"
          : MB.questionBody.replace(/\s*mb-\S+/g, "").trim() || "text-4xl",
  ].join(" ");

  const verticalPreClassByPressure =
    questionPressureBucket === "veryLong"
      ? `text-lg md:text-xl text-center ${questionStemToneClass} font-bold font-mono whitespace-pre`
      : questionPressureBucket === "long"
        ? `text-xl md:text-2xl text-center ${questionStemToneClass} font-bold font-mono whitespace-pre`
        : questionPressureBucket === "medium"
          ? `text-2xl md:text-3xl text-center ${questionStemToneClass} font-bold font-mono whitespace-pre`
          : `text-2xl md:text-3xl text-center ${questionStemToneClass} font-bold font-mono whitespace-pre`;

  const questionLineHeightByPressure =
    questionPressureBucket === "veryLong"
      ? 1.22
      : questionPressureBucket === "long"
        ? 1.28
        : questionPressureBucket === "medium"
          ? 1.34
          : 1.4;

  const answerCardTextClass =
    answerPressureBucket === "veryLong"
      ? "text-[17px] md:text-[20px] leading-snug px-3 py-3.5 min-h-[3.5rem] md:min-h-[5rem] max-[420px]:min-h-[3.75rem] font-bold break-words overflow-wrap-anywhere"
      : answerPressureBucket === "long"
        ? "text-[17px] md:text-[21px] leading-snug px-3.5 py-4 min-h-[3.5rem] md:min-h-[5.25rem] max-[420px]:min-h-[3.75rem] font-bold break-words overflow-wrap-anywhere"
        : answerPressureBucket === "medium"
          ? "text-[18px] md:text-[21px] leading-snug px-4 py-4 min-h-[3.5rem] md:min-h-[5.25rem] font-bold break-words overflow-wrap-anywhere"
          : "text-[18px] md:text-[22px] leading-snug px-5 py-5 min-h-[3.75rem] md:min-h-[5.5rem] font-bold break-words overflow-wrap-anywhere";

  const useNarrowMobileAnswerFallback =
    answerPressureBucket === "veryLong" ||
    (answerPressureBucket === "long" && questionPressureBucket !== "short");

  return {
    questionPressureBucket,
    answerPressureBucket,
    questionSlotClassForStem: LEARNING_MASTER_QUESTION_SLOT_CLASS,
    questionLeadClassByPressure,
    questionBodyClassByPressure,
    verticalPreClassByPressure,
    questionLineHeightByPressure,
    questionBottomSpacingClass,
    questionStemInsetClass,
    questionStemToneClass,
    answerCardTextClass,
    useNarrowMobileAnswerFallback,
  };
}

