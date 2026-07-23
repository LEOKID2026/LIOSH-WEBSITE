/**
 * Writing worksheet request validation — parent + public demo.
 * @module lib/writing/writing-validate.server
 */

import {
  WRITING_CATEGORIES,
  WRITING_REQUEST_DEFAULTS,
  WRITING_LIMITS,
  WRITING_UI_CATEGORIES,
} from "./writing-worksheet-types.js";
import {
  ENGLISH_WORD_PACKS,
  expandEnglishCharacters,
  HEBREW_LETTERS,
  HEBREW_WORD_PACKS,
  hebrewLetterRange,
  isEnglishLetter,
  isHebrewLetter,
  isPrewritingPathId,
  PREWRITING_PATHS,
  wordsFromPack,
} from "./writing-constants.js";
import {
  PUBLIC_WRITING_DEMO_ENGLISH_PAIRS,
  PUBLIC_WRITING_DEMO_ENGLISH_WORDS,
  PUBLIC_WRITING_DEMO_HEBREW_LETTERS,
  PUBLIC_WRITING_DEMO_HEBREW_WORDS,
  PUBLIC_WRITING_DEMO_LIMITS,
  PUBLIC_WRITING_DEMO_NUMBERS,
  PUBLIC_WRITING_DEMO_PRESETS,
  PUBLIC_WRITING_DEMO_PREWRITING_PATHS,
  PUBLIC_WRITING_DEMO_TASK_TYPES,
  getPublicWritingDemoPreset,
} from "../../data/writing/public-demo-allowlist.js";

/** Bidi override and embedding controls. */
const BIDI_OVERRIDE_RE = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/u;

/** C0/C1 control chars except tab/newline/carriage return. */
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;

const PHONE_RE =
  /(?:\+?\d[\d\s\-().]{6,}\d)|(?:0\d[\d\s\-]{7,})|(?:\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b)/u;

const ADDRESS_RE =
  /(?:רח(?:וב)?|רח'|שדר(?:ות)?|כיכר|מיקוד|מ\s*?\d{5}|(?:\bstreet\b|\bst\.?\b|\bavenue\b|\bave\.?\b|\broad\b|\brd\.?\b|\bzip\s*\d{5}\b))/iu;

const SCRIPT_STYLES = new Set(["print", "script", "print_and_script"]);
const TRACING_MODES = new Set(["trace", "copy", "trace_and_copy", "independent"]);
const TRACE_RENDER_MODES = new Set(["faint_model", "outline", "stroke_path", "full_trace"]);
const NIKUD_MODES = new Set(["none", "basic_vowels", "word_nikud"]);
const LINE_TEMPLATES = new Set([
  "single_letter_hero",
  "trace_row",
  "word_row",
  "english_four_line",
  "number_cell",
  "whole_tens",
  "single_digit_trace",
  "prewriting_path",
  "reference_sheet",
]);
const FONT_SIZES = new Set(["sm", "md", "lg", "xl"]);
const STROKE_STYLES = new Set(["dashed", "dotted", "light"]);
const PRINT_STRENGTHS = new Set(["light", "normal", "strong"]);
const PAGE_ORIENTATIONS = new Set(["portrait", "landscape"]);
const PAGE_DENSITIES = new Set(["comfortable", "compact"]);
const LETTER_CASES = new Set(["upper", "lower", "pairs"]);
const NUMBER_MODES = new Set(["digit", "number", "quantity_match", "sequence", "before_after"]);
const CUSTOM_TEXT_KINDS = new Set([
  "first_name",
  "full_name",
  "word",
  "word_list",
  "short_phrase",
  "greeting",
]);

const FORBIDDEN_REQUEST_KEYS = new Set([
  "pages",
  "answers",
  "requiresAnswerKey",
  "slug",
  "catalogNumber",
  "svgAssetId",
  "strokeOrderAssetId",
  "pathAssetId",
  "savedAt",
]);

/**
 * @typedef {import("./writing-worksheet-types.js").WritingWorksheetRequest} WritingWorksheetRequest
 */

/**
 * @param {WritingWorksheetRequest} request
 * @returns {WritingWorksheetRequest}
 */
function finalizeWritingRequest(request) {
  return request;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeWritingText(text) {
  return String(text || "")
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/**
 * @param {string} text
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function validateWritingTextSafety(text) {
  const value = String(text || "");
  if (BIDI_OVERRIDE_RE.test(value)) {
    return { ok: false, code: "BIDI_OVERRIDE_BLOCKED" };
  }
  if (CONTROL_CHAR_RE.test(value)) {
    return { ok: false, code: "CONTROL_CHAR_BLOCKED" };
  }
  if (PHONE_RE.test(value)) {
    return { ok: false, code: "PHONE_BLOCKED" };
  }
  if (ADDRESS_RE.test(value)) {
    return { ok: false, code: "ADDRESS_BLOCKED" };
  }
  return { ok: true };
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function readBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ ok: true, request: WritingWorksheetRequest } | { ok: false, code: string, message?: string }}
 */
export function validateWritingRequest(body) {
  if (!isPlainObject(body)) {
    return { ok: false, code: "INVALID_BODY" };
  }

  const serialized = JSON.stringify(body);
  if (serialized.length > WRITING_LIMITS.requestBodyMaxBytes) {
    return { ok: false, code: "BODY_TOO_LARGE" };
  }

  for (const key of Object.keys(body)) {
    if (FORBIDDEN_REQUEST_KEYS.has(key)) {
      return { ok: false, code: "FORBIDDEN_FIELD", message: key };
    }
  }

  const writingCategory = String(body.writingCategory || "").trim();
  if (!WRITING_UI_CATEGORIES.includes(/** @type {import("./writing-worksheet-types.js").WritingCategory} */ (writingCategory))) {
    return { ok: false, code: "INVALID_WRITING_CATEGORY" };
  }

  const scriptStyle = String(body.scriptStyle || WRITING_REQUEST_DEFAULTS.scriptStyle);
  if (!SCRIPT_STYLES.has(scriptStyle)) {
    return { ok: false, code: "INVALID_SCRIPT_STYLE" };
  }

  const tracingMode = String(body.tracingMode || WRITING_REQUEST_DEFAULTS.tracingMode);
  if (!TRACING_MODES.has(tracingMode)) {
    return { ok: false, code: "INVALID_TRACING_MODE" };
  }

  const traceRenderMode = String(body.traceRenderMode || WRITING_REQUEST_DEFAULTS.traceRenderMode);
  if (!TRACE_RENDER_MODES.has(traceRenderMode)) {
    return { ok: false, code: "INVALID_TRACE_RENDER_MODE" };
  }

  const nikudMode = String(body.nikudMode || WRITING_REQUEST_DEFAULTS.nikudMode);
  if (!NIKUD_MODES.has(nikudMode)) {
    return { ok: false, code: "INVALID_NIKUD_MODE" };
  }

  const lineTemplate = String(body.lineTemplate || WRITING_REQUEST_DEFAULTS.lineTemplate);
  if (!LINE_TEMPLATES.has(lineTemplate)) {
    return { ok: false, code: "INVALID_LINE_TEMPLATE" };
  }

  const itemsPerLineMax =
    lineTemplate === "reference_sheet"
      ? WRITING_LIMITS.referenceSheetItemsPerLineMax
      : WRITING_LIMITS.itemsPerLineMax;

  const fontSize = String(body.fontSize || WRITING_REQUEST_DEFAULTS.fontSize);
  if (!FONT_SIZES.has(fontSize)) {
    return { ok: false, code: "INVALID_FONT_SIZE" };
  }

  const strokeStyle = String(body.strokeStyle || WRITING_REQUEST_DEFAULTS.strokeStyle);
  if (!STROKE_STYLES.has(strokeStyle)) {
    return { ok: false, code: "INVALID_STROKE_STYLE" };
  }

  const printStrength = String(body.printStrength || WRITING_REQUEST_DEFAULTS.printStrength);
  if (!PRINT_STRENGTHS.has(printStrength)) {
    return { ok: false, code: "INVALID_PRINT_STRENGTH" };
  }

  const pageOrientation = String(body.pageOrientation || WRITING_REQUEST_DEFAULTS.pageOrientation);
  if (!PAGE_ORIENTATIONS.has(pageOrientation)) {
    return { ok: false, code: "INVALID_PAGE_ORIENTATION" };
  }

  const pageDensity = String(body.pageDensity || WRITING_REQUEST_DEFAULTS.pageDensity);
  if (!PAGE_DENSITIES.has(pageDensity)) {
    return { ok: false, code: "INVALID_PAGE_DENSITY" };
  }

  const lineCount = clampInt(
    body.lineCount,
    WRITING_LIMITS.lineCountMin,
    WRITING_LIMITS.lineCountMax,
    WRITING_REQUEST_DEFAULTS.lineCount
  );
  const itemsPerLine = clampInt(
    body.itemsPerLine,
    WRITING_LIMITS.itemsPerLineMin,
    itemsPerLineMax,
    WRITING_REQUEST_DEFAULTS.itemsPerLine
  );
  const repeatsPerLine =
    lineTemplate === "reference_sheet"
      ? 1
      : clampInt(
          body.repeatsPerLine,
          WRITING_LIMITS.repeatsPerLineMin,
          WRITING_LIMITS.repeatsPerLineMax,
          WRITING_REQUEST_DEFAULTS.repeatsPerLine
        );

  const seed =
    body.seed === undefined || body.seed === null
      ? undefined
      : clampInt(body.seed, 0, 2147483647, 0);

  /** @type {Record<string, unknown>} */
  const base = {
    worksheetType: "writing",
    writingCategory,
    scriptStyle,
    tracingMode,
    traceRenderMode,
    nikudMode,
    lineTemplate,
    lineCount,
    itemsPerLine,
    repeatsPerLine,
    fontSize,
    strokeStyle,
    printStrength,
    includeExample: readBool(body.includeExample, WRITING_REQUEST_DEFAULTS.includeExample),
    includeCopyRows: readBool(body.includeCopyRows, WRITING_REQUEST_DEFAULTS.includeCopyRows),
    includeIndependentRows: readBool(
      body.includeIndependentRows,
      WRITING_REQUEST_DEFAULTS.includeIndependentRows
    ),
    includeImage: readBool(body.includeImage, WRITING_REQUEST_DEFAULTS.includeImage),
    includeNameField: readBool(body.includeNameField, WRITING_REQUEST_DEFAULTS.includeNameField),
    includeDateField: readBool(body.includeDateField, WRITING_REQUEST_DEFAULTS.includeDateField),
    pageOrientation,
    pageDensity,
    showStartPoint: readBool(body.showStartPoint, WRITING_REQUEST_DEFAULTS.showStartPoint),
    showDirectionArrows: readBool(
      body.showDirectionArrows,
      WRITING_REQUEST_DEFAULTS.showDirectionArrows
    ),
    showStrokeNumbers: readBool(
      body.showStrokeNumbers,
      WRITING_REQUEST_DEFAULTS.showStrokeNumbers
    ),
    inkSave: readBool(body.inkSave, WRITING_REQUEST_DEFAULTS.inkSave),
    ...(seed !== undefined ? { seed } : {}),
    ...(typeof body.referenceSheetPreset === "string" && body.referenceSheetPreset
      ? { referenceSheetPreset: String(body.referenceSheetPreset) }
      : {}),
  };

  if (writingCategory === "hebrew_letters") {
    /** @type {string[]} */
    let characters = [];
    if (Array.isArray(body.characters)) {
      characters = body.characters.map((c) => sanitizeWritingText(String(c))).filter(Boolean);
    }
    if (isPlainObject(body.characterRange)) {
      const from = sanitizeWritingText(String(body.characterRange.from || ""));
      const to = sanitizeWritingText(String(body.characterRange.to || ""));
      const range = hebrewLetterRange(from, to);
      if (range.length) characters = range;
    }
    characters = [...new Set(characters)];
    if (!characters.length || characters.length > HEBREW_LETTERS.length) {
      return { ok: false, code: "INVALID_HEBREW_CHARACTERS" };
    }
    if (!characters.every(isHebrewLetter)) {
      return { ok: false, code: "INVALID_HEBREW_CHARACTERS" };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "hebrew_letters",
        characters,
        ...(isPlainObject(body.characterRange)
          ? {
              characterRange: {
                from: sanitizeWritingText(String(body.characterRange.from || "")),
                to: sanitizeWritingText(String(body.characterRange.to || "")),
              },
            }
          : {}),
      })),
    };
  }

  if (writingCategory === "english_letters") {
    const letterCase = String(body.letterCase || "upper");
    if (!LETTER_CASES.has(letterCase)) {
      return { ok: false, code: "INVALID_LETTER_CASE" };
    }
    /** @type {string[]} */
    let characters = [];
    if (Array.isArray(body.characters)) {
      characters = body.characters.map((c) => sanitizeWritingText(String(c))).filter(Boolean);
    }
    characters = expandEnglishCharacters(
      /** @type {"upper" | "lower" | "pairs"} */ (letterCase),
      characters
    );
    characters = [...new Set(characters)];
    if (!characters.length || characters.length > 52) {
      return { ok: false, code: "INVALID_ENGLISH_CHARACTERS" };
    }
    if (!characters.every(isEnglishLetter)) {
      return { ok: false, code: "INVALID_ENGLISH_CHARACTERS" };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "english_letters",
        characters,
        letterCase,
      })),
    };
  }

  if (writingCategory === "numbers") {
    if (!isPlainObject(body.numberRange)) {
      return { ok: false, code: "INVALID_NUMBER_RANGE" };
    }
    const min = clampInt(body.numberRange.min, 0, 100, 0);
    const max = clampInt(body.numberRange.max, 0, 100, 10);
    if (min > max) {
      return { ok: false, code: "INVALID_NUMBER_RANGE" };
    }
    const numberMode = String(body.numberMode || "digit");
    if (!NUMBER_MODES.has(numberMode)) {
      return { ok: false, code: "INVALID_NUMBER_MODE" };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "numbers",
        numberRange: { min, max },
        numberMode,
      })),
    };
  }

  if (writingCategory === "prewriting") {
    const prewritingPathId = sanitizeWritingText(String(body.prewritingPathId || ""));
    if (!isPrewritingPathId(prewritingPathId)) {
      return { ok: false, code: "INVALID_PREWRITING_PATH" };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "prewriting",
        prewritingPathId,
        lineTemplate: "prewriting_path",
      })),
    };
  }

  if (writingCategory === "hebrew_words") {
    const wordPackId = String(body.wordPackId || "").trim();
    if (!wordPackId) {
      return { ok: false, code: "INVALID_WORD_PACK" };
    }
    /** @type {string[]} */
    let words = [];
    if (wordPackId === "custom") {
      if (!Array.isArray(body.words)) {
        return { ok: false, code: "INVALID_CUSTOM_WORDS" };
      }
      words = body.words.map((w) => sanitizeWritingText(String(w))).filter(Boolean);
    } else {
      words = wordsFromPack(HEBREW_WORD_PACKS, wordPackId);
    }
    words = [...new Set(words)];
    if (!words.length || words.length > WRITING_LIMITS.customWordsMax) {
      return { ok: false, code: "INVALID_HEBREW_WORDS" };
    }
    for (const word of words) {
      const safety = validateWritingTextSafety(word);
      if (!safety.ok) return { ok: false, code: safety.code };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "hebrew_words",
        wordPackId,
        ...(wordPackId === "custom" ? { words } : {}),
        lineTemplate: "word_row",
        nikudMode: nikudMode === "none" ? "word_nikud" : nikudMode,
      })),
    };
  }

  if (writingCategory === "english_words") {
    const wordPackId = String(body.wordPackId || "").trim();
    if (!wordPackId) {
      return { ok: false, code: "INVALID_WORD_PACK" };
    }
    /** @type {string[]} */
    let words = [];
    if (wordPackId === "custom") {
      if (!Array.isArray(body.words)) {
        return { ok: false, code: "INVALID_CUSTOM_WORDS" };
      }
      words = body.words.map((w) => sanitizeWritingText(String(w))).filter(Boolean);
    } else {
      words = wordsFromPack(ENGLISH_WORD_PACKS, wordPackId);
    }
    words = [...new Set(words)];
    if (!words.length || words.length > WRITING_LIMITS.customWordsMax) {
      return { ok: false, code: "INVALID_ENGLISH_WORDS" };
    }
    for (const word of words) {
      const safety = validateWritingTextSafety(word);
      if (!safety.ok) return { ok: false, code: safety.code };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "english_words",
        wordPackId,
        ...(wordPackId === "custom" ? { words } : {}),
        lineTemplate: "word_row",
      })),
    };
  }

  if (writingCategory === "personal_text") {
    const customTextKind = String(body.customTextKind || "first_name");
    if (!CUSTOM_TEXT_KINDS.has(customTextKind)) {
      return { ok: false, code: "INVALID_CUSTOM_TEXT_KIND" };
    }
    const customText = sanitizeWritingText(String(body.customText || ""));
    if (!customText) {
      return { ok: false, code: "INVALID_CUSTOM_TEXT" };
    }
    const safety = validateWritingTextSafety(customText);
    if (!safety.ok) {
      return { ok: false, code: safety.code };
    }
    const maxLen =
      customTextKind === "first_name" || customTextKind === "full_name"
        ? WRITING_LIMITS.customTextNameMax
        : customTextKind === "word"
          ? WRITING_LIMITS.customTextWordMax
          : WRITING_LIMITS.customTextPhraseMax;
    if (customText.length > maxLen) {
      return { ok: false, code: "CUSTOM_TEXT_TOO_LONG" };
    }
    return {
      ok: true,
      request: finalizeWritingRequest(/** @type {WritingWorksheetRequest} */ ({
        ...base,
        writingCategory: "personal_text",
        customText,
        customTextKind,
      })),
    };
  }

  return { ok: false, code: "INVALID_WRITING_CATEGORY" };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ ok: true, request: WritingWorksheetRequest, presetId?: string } | { ok: false, code: string, message?: string }}
 */
export function validatePublicWritingDemo(body) {
  const presetId = String(body?.presetId || body?.demoPresetId || "").trim();
  /** @type {Record<string, unknown>} */
  let merged = { ...(body || {}) };

  if (presetId) {
    const preset = getPublicWritingDemoPreset(presetId);
    if (!preset) {
      return { ok: false, code: "INVALID_DEMO_PRESET" };
    }
    merged = { ...preset.request, ...merged, writingCategory: preset.writingCategory };
  }

  merged.lineCount = Math.min(
    PUBLIC_WRITING_DEMO_LIMITS.maxLines,
    clampInt(merged.lineCount, 3, PUBLIC_WRITING_DEMO_LIMITS.maxLines, 6)
  );
  merged.itemsPerLine = Math.min(
    PUBLIC_WRITING_DEMO_LIMITS.maxCharsPerLine,
    clampInt(merged.itemsPerLine, 1, PUBLIC_WRITING_DEMO_LIMITS.maxCharsPerLine, 1)
  );

  const tracingMode = String(merged.tracingMode || "trace");
  if (!PUBLIC_WRITING_DEMO_TASK_TYPES.has(tracingMode === "independent" ? "copy" : tracingMode)) {
    if (tracingMode !== "trace" && tracingMode !== "copy" && tracingMode !== "trace_and_copy") {
      return { ok: false, code: "TASK_TYPE_NOT_ALLOWED_IN_PUBLIC_DEMO" };
    }
  }
  if (tracingMode === "independent") {
    return { ok: false, code: "TASK_TYPE_NOT_ALLOWED_IN_PUBLIC_DEMO" };
  }

  const validated = validateWritingRequest(merged);
  if (!validated.ok) {
    return validated;
  }

  const request = validated.request;

  if (request.writingCategory === "hebrew_letters") {
    if (!request.characters.every((c) => PUBLIC_WRITING_DEMO_HEBREW_LETTERS.has(c))) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
  }

  if (request.writingCategory === "english_letters") {
    if (!request.characters.every((c) => PUBLIC_WRITING_DEMO_ENGLISH_PAIRS.has(c))) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
  }

  if (request.writingCategory === "numbers") {
    const values = [];
    for (let n = request.numberRange.min; n <= request.numberRange.max; n += 1) {
      values.push(n);
    }
    if (request.numberMode === "quantity_match") {
      if (values.some((n) => n < 1 || n > PUBLIC_WRITING_DEMO_LIMITS.maxQuantityMatchValue)) {
        return { ok: false, code: "PUBLIC_DEMO_QUANTITY_NOT_ALLOWED" };
      }
    } else if (!values.every((n) => PUBLIC_WRITING_DEMO_NUMBERS.has(n))) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
    if (
      request.numberMode !== "digit" &&
      request.numberMode !== "quantity_match"
    ) {
      return { ok: false, code: "NUMBER_MODE_NOT_ALLOWED_IN_PUBLIC_DEMO" };
    }
  }

  if (request.writingCategory === "prewriting") {
    if (!PUBLIC_WRITING_DEMO_PREWRITING_PATHS.has(request.prewritingPathId)) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
  }

  if (request.writingCategory === "hebrew_words") {
    const words =
      request.wordPackId === "custom" && request.words ? request.words : HEBREW_WORD_PACKS.animals;
    if (!words.every((w) => PUBLIC_WRITING_DEMO_HEBREW_WORDS.has(w))) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
  }

  if (request.writingCategory === "english_words") {
    const words =
      request.wordPackId === "custom" && request.words ? request.words : ENGLISH_WORD_PACKS.animals;
    if (!words.every((w) => PUBLIC_WRITING_DEMO_ENGLISH_WORDS.has(w))) {
      return { ok: false, code: "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" };
    }
  }

  if (request.writingCategory === "personal_text") {
    const maxLen =
      request.customTextKind === "word"
        ? PUBLIC_WRITING_DEMO_LIMITS.maxCustomWordLength
        : PUBLIC_WRITING_DEMO_LIMITS.maxCustomNameLength;
    if (request.customText.length > maxLen) {
      return { ok: false, code: "CUSTOM_TEXT_TOO_LONG" };
    }
  }

  return {
    ok: true,
    request,
    ...(presetId ? { presetId } : {}),
  };
}

export {
  PUBLIC_WRITING_DEMO_PRESETS,
  PUBLIC_WRITING_DEMO_LIMITS,
  PREWRITING_PATHS,
  WRITING_CATEGORIES,
};
