/**
 * Unified printable worksheet question model — Wave A foundation.
 * @module lib/worksheets/worksheet-question-types
 */

/** @typedef {"math" | "geometry" | "hebrew" | "english"} WorksheetSubjectId */

/** @typedef {"mcq" | "open" | "fraction" | "passage_mcq" | "diagram_mcq" | "translation" | "vertical_math" | "word_problem"} WorksheetQuestionType */

/** @typedef {"printable" | "blocked_audio" | "blocked_image" | "blocked_diagram_pending"} WorksheetPrintability */

/**
 * @typedef {Object} WorksheetLtrSpan
 * @property {number} start
 * @property {number} end
 * @property {string} spanText
 */

/**
 * @typedef {Object} PrintableWorksheetQuestion
 * @property {number} displayIndex
 * @property {WorksheetSubjectId} subject
 * @property {WorksheetQuestionType} questionType
 * @property {string} stemHe
 * @property {string} [passageHe]
 * @property {string[]} [optionsHe]
 * @property {import("./worksheet-question-types.js").WorksheetDiagramSpec | null} [diagramSpec]
 * @property {number} [writingSpaceLines]
 * @property {WorksheetLtrSpan[]} [ltrSpans]
 * @property {WorksheetPrintability} printability
 * @property {string} [mathExpressionLtr]
 * @property {string} [verticalLayoutLtr]
 * @property {string} [wordProblemBodyHe]
 * @property {boolean} [hasNikud]
 * @property {boolean} [longPassage]
 * @property {boolean} [englishSentenceMode]
 * @property {boolean} [englishPhonicsMode]
 * @property {string} [phonicsStimulus]
 * @property {string} [phonicsItemType]
 * @property {"upper" | "lower" | "word"} [phonicsStimulusCase]
 * @property {"upper" | "lower"} [phonicsOptionCase]
 * @property {boolean[]} [optionsLatin]
 * @property {boolean} [geometryAnswerLine]
 */

/**
 * @typedef {Object} WorksheetDiagramSpec
 * @property {string} kind
 * @property {string} [mode]
 * @property {number} [side]
 * @property {number} [length]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [base]
 * @property {number} [base1]
 * @property {number} [base2]
 * @property {number} [radius]
 * @property {number} [angle]
 * @property {number} [angle1]
 * @property {number} [angle2]
 * @property {number} [angle3]
 * @property {number} [a]
 * @property {number} [b]
 * @property {number} [c]
 * @property {number} [side1]
 * @property {number} [side2]
 * @property {number} [side3]
 * @property {string} [template]
 * @property {string} [tile]
 * @property {number} [tileSide]
 * @property {number} [floorL]
 * @property {number} [floorW]
 * @property {string} [solidShape]
 * @property {boolean} [hideAngle3]
 * @property {boolean} [hideSide]
 * @property {boolean} [hideHeight]
 * @property {boolean} [hideDiagonal]
 * @property {boolean} [hideAngle]
 * @property {string} [which]
 * @property {number} [dx]
 * @property {number} [dy]
 * @property {string} [shape]
 * @property {number|Record<string, string | number>|unknown} [axes]
 * @property {number} [diagonal]
 * @property {Record<string, string | number> | unknown} [labels]
 */

/**
 * @typedef {Object} WorksheetPayloadMeta
 * @property {string} titleHe
 * @property {string} subjectHe
 * @property {string} gradeHe
 * @property {string} topicHe
 * @property {string} levelHe
 * @property {boolean} inkSave
 * @property {WorksheetSubjectId} subjectId
 * @property {string} [gradeKey]
 * @property {string} [topicKey]
 * @property {string} [levelKey]
 * @property {string} [mathPracticeFormat]
 */

/**
 * @typedef {Object} WorksheetPayload
 * @property {"worksheet"} payloadKind
 * @property {WorksheetPayloadMeta} meta
 * @property {PrintableWorksheetQuestion[]} questions
 */

/**
 * @typedef {Object} AnswerKeyEntry
 * @property {number} displayIndex
 * @property {string} correctAnswerHe
 * @property {string} [explanationHe]
 * @property {string} [stemHe]
 * @property {WorksheetQuestionType} [questionType]
 * @property {string} [mathExpressionLtr]
 */

/**
 * @typedef {Object} AnswerKeyPayload
 * @property {"answer_key"} payloadKind
 * @property {WorksheetPayloadMeta} meta
 * @property {AnswerKeyEntry[]} answers
 * @property {{ generation: Record<string, unknown>, content: { questionCount: number, questionKeys: string[] } }} [worksheetFingerprint]
 */

export const WORKSHEET_SUBJECT_IDS = /** @type {const} */ ([
  "math",
  "geometry",
  "hebrew",
  "english",
]);

export const WORKSHEET_QUESTION_TYPES = /** @type {const} */ ([
  "mcq",
  "open",
  "fraction",
  "passage_mcq",
  "diagram_mcq",
  "translation",
  "vertical_math",
  "word_problem",
]);

export const WORKSHEET_PRINTABILITY = /** @type {const} */ ({
  printable: "printable",
  blocked_audio: "blocked_audio",
  blocked_image: "blocked_image",
  blocked_diagram_pending: "blocked_diagram_pending",
});

export const WORKSHEET_PAYLOAD_KIND = "worksheet";
export const ANSWER_KEY_PAYLOAD_KIND = "answer_key";

/** Fields that must never appear on WorksheetPayload or its HTML serialization. */
export const WORKSHEET_FORBIDDEN_ANSWER_FIELDS = [
  "correct",
  "correctAnswer",
  "correctIndex",
  "correct_answer",
  "typingAcceptedAnswers",
  "explanation",
  "explanationHe",
  "theoryLines",
  "answers", // raw bank field - use optionsHe on worksheet only
];
