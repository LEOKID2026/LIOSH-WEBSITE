/**
 * Ensure a space between Hebrew letters and adjacent digits in student-facing text.
 * e.g. "זווית1" → "זווית 1", "בסיס2" → "בסיס 2"
 */

const HEBREW_THEN_DIGIT = /([\u05D0-\u05EA\u05F0-\u05F4])(\d)/g;
const DIGIT_THEN_HEBREW = /(\d)([\u05D0-\u05EA\u05F0-\u05F4])/g;

/**
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function normalizeHebrewWordNumberSpacing(text) {
  if (text == null || typeof text !== "string") return "";
  return text
    .replace(HEBREW_THEN_DIGIT, "$1 $2")
    .replace(DIGIT_THEN_HEBREW, "$1 $2");
}
