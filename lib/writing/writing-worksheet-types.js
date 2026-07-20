/**
 * Writing worksheet schema — Request/Payload unions and shared constants.
 * @module lib/writing/writing-worksheet-types
 */

/** @typedef {"writing_worksheet"} WritingPayloadKind */

export const WRITING_PAYLOAD_KIND = /** @type {WritingPayloadKind} */ ("writing_worksheet");

export const WORKSHEET_TYPE_WRITING = "writing";
export const WORKSHEET_TYPE_QUESTIONS = "questions";
export const WORKSHEET_TYPE_COLORING = "coloring";

/** @typedef {"hebrew_letters" | "english_letters" | "numbers" | "prewriting" | "hebrew_words" | "english_words" | "personal_text" | "mixed"} WritingCategory */

/** @type {WritingCategory[]} */
export const WRITING_CATEGORIES = [
  "hebrew_letters",
  "english_letters",
  "numbers",
  "prewriting",
  "hebrew_words",
  "english_words",
  "personal_text",
  "mixed",
];

/** UI-facing categories (mixed is internal-only for ready pages). */
/** @type {WritingCategory[]} */
export const WRITING_UI_CATEGORIES = WRITING_CATEGORIES.filter((c) => c !== "mixed");

/** @typedef {"print" | "script" | "print_and_script"} ScriptStyle */

/** @typedef {"trace" | "copy" | "trace_and_copy" | "independent"} TracingMode */

/** @typedef {"faint_model" | "outline" | "stroke_path" | "full_trace"} TraceRenderMode */

/** @typedef {"none" | "basic_vowels" | "word_nikud"} NikudMode */

/**
 * @typedef {"single_letter_hero" | "trace_row" | "word_row" | "english_four_line" | "number_cell" | "whole_tens" | "single_digit_trace" | "prewriting_path" | "reference_sheet"} LineTemplate
 */

/** @typedef {"sm" | "md" | "lg" | "xl"} FontSizeToken */

/** @typedef {"dashed" | "dotted" | "light"} StrokeStyleToken */

/** @typedef {"portrait" | "landscape"} PageOrientation */

/** @typedef {"comfortable" | "compact"} PageDensity */

/** @typedef {"upper" | "lower" | "pairs"} LetterCaseMode */

/** @typedef {"digit" | "number" | "quantity_match" | "sequence" | "before_after"} NumberMode */

/** @typedef {"first_name" | "full_name" | "word" | "word_list" | "short_phrase" | "greeting"} CustomTextKind */

/** @typedef {"he" | "en" | "mixed"} WritingLanguage */

/** @typedef {"rtl" | "ltr" | "mixed"} PageDirection */

/**
 * @typedef {"trace" | "copy" | "independent_write" | "missing_character" | "missing_word" | "letter_image_match" | "upper_lower_match" | "quantity_match" | "number_sequence" | "before_after"} TaskType
 */

/** @type {TaskType[]} */
export const TASK_TYPES = [
  "trace",
  "copy",
  "independent_write",
  "missing_character",
  "missing_word",
  "letter_image_match",
  "upper_lower_match",
  "quantity_match",
  "number_sequence",
  "before_after",
];

/** Task types that require an answer key. */
export const ANSWER_TASK_TYPES = new Set(
  /** @type {TaskType[]} */ ([
    "missing_character",
    "missing_word",
    "letter_image_match",
    "upper_lower_match",
    "quantity_match",
    "number_sequence",
    "before_after",
  ])
);

/** @typedef {"title" | "instruction" | "practice" | "image" | "answer_area"} BlockType */

/** @typedef {"glyph" | "word" | "number" | "path" | "image" | "blank"} ItemType */

/**
 * @typedef {Object} WritingRequestBase
 * @property {"writing"} worksheetType
 * @property {WritingCategory} writingCategory
 * @property {ScriptStyle} scriptStyle
 * @property {TracingMode} tracingMode
 * @property {TraceRenderMode} traceRenderMode
 * @property {NikudMode} nikudMode
 * @property {LineTemplate} lineTemplate
 * @property {number} lineCount
 * @property {number} itemsPerLine
 * @property {number} repeatsPerLine
 * @property {FontSizeToken} fontSize
 * @property {StrokeStyleToken} strokeStyle
 * @property {boolean} includeExample
 * @property {boolean} includeCopyRows
 * @property {boolean} includeIndependentRows
 * @property {boolean} includeImage
 * @property {boolean} includeNameField
 * @property {boolean} includeDateField
 * @property {PageOrientation} pageOrientation
 * @property {PageDensity} pageDensity
 * @property {boolean} showStartPoint
 * @property {boolean} showDirectionArrows
 * @property {boolean} showStrokeNumbers
 * @property {boolean} inkSave
 * @property {number} [seed]
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "hebrew_letters",
 *   characters: string[],
 *   characterRange?: { from: string, to: string },
 * }} HebrewLettersWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "english_letters",
 *   characters: string[],
 *   letterCase: LetterCaseMode,
 * }} EnglishLettersWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "numbers",
 *   numberRange: { min: number, max: number },
 *   numberMode: NumberMode,
 * }} NumbersWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "prewriting",
 *   prewritingPathId: string,
 * }} PrewritingWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "hebrew_words",
 *   wordPackId: string | "custom",
 *   words?: string[],
 * }} HebrewWordsWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "english_words",
 *   wordPackId: string | "custom",
 *   words?: string[],
 * }} EnglishWordsWritingRequest
 */

/**
 * @typedef {WritingRequestBase & {
 *   writingCategory: "personal_text",
 *   customText: string,
 *   customTextKind: CustomTextKind,
 * }} PersonalTextWritingRequest
 */

/**
 * @typedef {HebrewLettersWritingRequest | EnglishLettersWritingRequest | NumbersWritingRequest | PrewritingWritingRequest | HebrewWordsWritingRequest | EnglishWordsWritingRequest | PersonalTextWritingRequest} WritingWorksheetRequest
 */

/**
 * @typedef {Object} WritingImageRef
 * @property {string} assetId
 * @property {string} [altHe]
 * @property {string} [colorInstructionHe]
 */

/**
 * @typedef {Object} WritingRow
 * @property {string} rowId
 * @property {import("./writing-worksheet-types.js").WritingItem[]} items
 */

/**
 * @typedef {Object} TitleBlock
 * @property {"title"} blockType
 * @property {PageDirection} direction
 * @property {string} textHe
 */

/**
 * @typedef {Object} InstructionBlock
 * @property {"instruction"} blockType
 * @property {PageDirection} direction
 * @property {string} textHe
 */

/**
 * @typedef {Object} PracticeBlock
 * @property {"practice"} blockType
 * @property {PageDirection} direction
 * @property {WritingRow[]} rows
 */

/**
 * @typedef {Object} ImageBlock
 * @property {"image"} blockType
 * @property {PageDirection} direction
 * @property {WritingImageRef} image
 */

/**
 * @typedef {Object} AnswerAreaBlock
 * @property {"answer_area"} blockType
 * @property {PageDirection} direction
 * @property {WritingRow[]} rows
 */

/**
 * @typedef {TitleBlock | InstructionBlock | PracticeBlock | ImageBlock | AnswerAreaBlock} WritingBlock
 */

/**
 * @typedef {Object} GlyphItem
 * @property {"glyph"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {TaskType} taskType
 * @property {TraceRenderMode} traceRenderMode
 * @property {string} character
 * @property {ScriptStyle} scriptStyle
 * @property {string} [svgAssetId]
 * @property {string} [strokeOrderAssetId]
 */

/**
 * @typedef {Object} WordItem
 * @property {"word"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {TaskType} taskType
 * @property {TraceRenderMode} traceRenderMode
 * @property {string} text
 * @property {ScriptStyle} scriptStyle
 * @property {boolean} hasNikud
 * @property {string} [svgAssetId]
 * @property {WritingImageRef} [image]
 */

/**
 * @typedef {Object} NumberItem
 * @property {"number"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {TaskType} taskType
 * @property {TraceRenderMode} traceRenderMode
 * @property {number} value
 * @property {WritingImageRef} [image]
 */

/**
 * @typedef {Object} PathItem
 * @property {"path"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {TaskType} taskType
 * @property {string} pathAssetId
 */

/**
 * @typedef {Object} ImageItem
 * @property {"image"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {WritingImageRef} image
 */

/**
 * @typedef {Object} BlankItem
 * @property {"blank"} itemType
 * @property {string} itemId
 * @property {PageDirection} direction
 * @property {LineTemplate} lineTemplate
 */

/**
 * @typedef {GlyphItem | WordItem | NumberItem | PathItem | ImageItem | BlankItem} WritingItem
 */

/**
 * @typedef {Object} WritingAnswer
 * @property {string} itemRef
 * @property {string} correctAnswer
 * @property {string} [explanationHe]
 */

/**
 * @typedef {Object} WritingPage
 * @property {string} pageId
 * @property {PageOrientation} orientation
 * @property {WritingBlock[]} blocks
 */

/**
 * @typedef {Object} WritingMeta
 * @property {string} titleHe
 * @property {string} categoryHe
 * @property {WritingCategory} writingCategory
 * @property {WritingLanguage} language
 * @property {PageDirection} pageDirection
 * @property {LineTemplate} lineTemplate
 * @property {number} lineCount
 * @property {boolean} inkSave
 * @property {boolean} includeNameField
 * @property {boolean} includeDateField
 * @property {PageDensity} pageDensity
 * @property {number} [seed]
 */

/**
 * @typedef {Object} WritingWorksheetPayload
 * @property {WritingPayloadKind} payloadKind
 * @property {string | null} slug
 * @property {string | null} catalogNumber
 * @property {WritingCategory} writingCategory
 * @property {WritingLanguage} language
 * @property {PageDirection} pageDirection
 * @property {ScriptStyle} scriptStyle
 * @property {TracingMode} tracingMode
 * @property {WritingMeta} meta
 * @property {WritingPage[]} pages
 * @property {boolean} requiresAnswerKey
 * @property {WritingAnswer[] | null} answers
 * @property {number | null} savedAt
 */

/**
 * @typedef {Object} ReadyWritingCatalogEntry
 * @property {string} slug
 * @property {string} catalogNumber
 * @property {WritingCategory} writingCategory
 * @property {string} titleHe
 * @property {boolean} [publicAccess]
 * @property {boolean} [locked]
 * @property {number} [seed]
 * @property {boolean} [inkSave]
 * @property {Partial<WritingWorksheetRequest>} [requestDefaults]
 */

export const WRITING_REQUEST_DEFAULTS = {
  scriptStyle: /** @type {ScriptStyle} */ ("print"),
  tracingMode: /** @type {TracingMode} */ ("trace_and_copy"),
  traceRenderMode: /** @type {TraceRenderMode} */ ("full_trace"),
  nikudMode: /** @type {NikudMode} */ ("none"),
  lineTemplate: /** @type {LineTemplate} */ ("trace_row"),
  lineCount: 6,
  itemsPerLine: 4,
  repeatsPerLine: 1,
  fontSize: /** @type {FontSizeToken} */ ("md"),
  strokeStyle: /** @type {StrokeStyleToken} */ ("dashed"),
  includeExample: true,
  includeCopyRows: true,
  includeIndependentRows: false,
  includeImage: false,
  includeNameField: true,
  includeDateField: true,
  pageOrientation: /** @type {PageOrientation} */ ("portrait"),
  pageDensity: /** @type {PageDensity} */ ("comfortable"),
  showStartPoint: false,
  showDirectionArrows: false,
  showStrokeNumbers: false,
  inkSave: false,
};

export const WRITING_LIMITS = {
  lineCountMin: 3,
  lineCountMax: 12,
  itemsPerLineMin: 1,
  itemsPerLineMax: 6,
  referenceSheetItemsPerLineMax: 9,
  repeatsPerLineMin: 1,
  repeatsPerLineMax: 8,
  customWordsMax: 10,
  customTextNameMax: 30,
  customTextWordMax: 15,
  customTextPhraseMax: 60,
  requestBodyMaxBytes: 4096,
  publicDemoMaxPages: 1,
  publicDemoMaxLines: 6,
  publicDemoMaxCharsPerLine: 4,
  publicDemoQuantityMatchMax: 3,
};
