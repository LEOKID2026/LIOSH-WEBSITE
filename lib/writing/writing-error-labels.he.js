/**
 * Hebrew user-facing labels for writing worksheet validation errors.
 * @module lib/writing/writing-error-labels.he
 */

/** @type {Record<string, string>} */
export const WRITING_ERROR_LABELS_HE = {
  INVALID_HEBREW_CHARACTERS: "יש לבחור אותיות בעברית בלבד",
  INVALID_ENGLISH_CHARACTERS: "יש להזין אותיות באנגלית בלבד",
  INVALID_LETTER_CASE: "סוג האות שנבחר אינו תקין",
  INVALID_NUMBER_RANGE: "טווח המספרים אינו תקין",
  INVALID_NUMBER_MODE: "סוג תרגול המספרים אינו תקין",
  INVALID_PREWRITING_PATH: "סוג הקו שנבחר אינו תקין",
  INVALID_WORD_PACK: "חבילת המילים שנבחרה אינה תקינה",
  INVALID_CUSTOM_WORDS: "יש להזין מילים תקינות",
  INVALID_HEBREW_WORDS: "יש להזין מילים בעברית בלבד",
  INVALID_ENGLISH_WORDS: "יש להזין מילים באנגלית בלבד",
  INVALID_CUSTOM_TEXT: "יש להזין טקסט תקין",
  INVALID_CUSTOM_TEXT_KIND: "סוג הטקסט שנבחר אינו תקין",
  CUSTOM_TEXT_TOO_LONG: "הטקסט ארוך מדי",
  ADDRESS_BLOCKED: "לא ניתן להזין כתובת בטקסט האישי",
  PHONE_BLOCKED: "לא ניתן להזין מספר טלפון בטקסט האישי",
  BIDI_OVERRIDE_BLOCKED: "הטקסט מכיל תווים שאינם נתמכים",
  CONTROL_CHAR_BLOCKED: "הטקסט מכיל תווים שאינם נתמכים",
  INVALID_BODY: "הבקשה אינה תקינה",
  BODY_TOO_LARGE: "הבקשה גדולה מדי",
  INVALID_WRITING_CATEGORY: "קטגוריית הכתיבה אינה תקינה",
  PUBLIC_DEMO_CONTENT_NOT_ALLOWED: "תוכן זה אינו זמין בדף ההתנסות",
  no_printable_pages: "לא ניתן ליצור דף להדפסה מהבחירה הנוכחית",
};

/**
 * @param {string | undefined | null} code
 * @returns {string}
 */
export function writingErrorLabelHe(code) {
  const key = String(code || "").trim();
  return WRITING_ERROR_LABELS_HE[key] || "";
}
