/**
 * Category-aware layout defaults for writing worksheets.
 * Manual letter/number layout (lineTemplate, itemsPerLine) is never overridden here.
 * @module lib/writing/writing-layout-defaults.server
 */

/**
 * @typedef {import("./writing-worksheet-types.js").WritingWorksheetRequest} WritingWorksheetRequest
 */

/**
 * Apply layout defaults only where the generator has no user-facing layout control.
 * Does NOT override trace_row / itemsPerLine for hebrew_letters, english_letters, or numbers.
 * @param {WritingWorksheetRequest} request
 * @returns {WritingWorksheetRequest}
 */
export function applyWritingLayoutDefaults(request) {
  /** @type {WritingWorksheetRequest} */
  const next = { ...request };

  if (next.lineTemplate === "reference_sheet" || next.lineTemplate === "prewriting_path") {
    return next;
  }

  if (next.writingCategory === "hebrew_words" || next.writingCategory === "english_words") {
    next.lineTemplate = "word_row";
    if (next.itemsPerLine > 1) next.itemsPerLine = 1;
  }

  if (next.writingCategory === "personal_text") {
    const kind = next.customTextKind || "first_name";
    if (kind === "word" || kind === "short_phrase" || kind === "greeting") {
      next.lineTemplate = "word_row";
      next.itemsPerLine = 1;
      if (next.lineCount < 6) next.lineCount = 6;
    } else if (kind === "word_list") {
      next.lineTemplate = "word_row";
      next.itemsPerLine = 1;
    } else if (kind === "first_name" || kind === "full_name") {
      next.lineTemplate = "trace_row";
      next.itemsPerLine = 1;
    }
  }

  return next;
}
