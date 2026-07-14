/**
 * Client-side session storage for worksheet preview — keeps answers off question page.
 * @module lib/worksheets/worksheet-preview-session.client
 */

export const WORKSHEET_PREVIEW_STORAGE_KEY = "leo_worksheet_preview_v1";

/**
 * @typedef {Object} WorksheetPreviewSession
 * @property {import("./worksheet-question-types.js").WorksheetPayload} worksheetPayload
 * @property {Record<string, unknown>} generation
 * @property {boolean} includeAnswers
 * @property {"ready" | "create" | "recommendation"} [source]
 */

/**
 * @param {WorksheetPreviewSession} data
 */
export function saveWorksheetPreviewSession(data) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WORKSHEET_PREVIEW_STORAGE_KEY, JSON.stringify(data));
}

/**
 * @returns {WorksheetPreviewSession | null}
 */
export function loadWorksheetPreviewSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORKSHEET_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.worksheetPayload?.questions) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {import("./worksheet-question-types.js").AnswerKeyPayload} answerKeyPayload
 */
export function saveWorksheetAnswerKeySession(answerKeyPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${WORKSHEET_PREVIEW_STORAGE_KEY}_answers`,
    JSON.stringify(answerKeyPayload)
  );
}

/**
 * @returns {import("./worksheet-question-types.js").AnswerKeyPayload | null}
 */
export function loadWorksheetAnswerKeySession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${WORKSHEET_PREVIEW_STORAGE_KEY}_answers`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearWorksheetAnswerKeySession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${WORKSHEET_PREVIEW_STORAGE_KEY}_answers`);
}

export function clearWorksheetPreviewSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WORKSHEET_PREVIEW_STORAGE_KEY);
  sessionStorage.removeItem(`${WORKSHEET_PREVIEW_STORAGE_KEY}_answers`);
}
