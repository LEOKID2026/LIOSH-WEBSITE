/**
 * Client-side session storage for public worksheet preview — separate from parent hub.
 * @module lib/worksheets/worksheet-public-preview-session.client
 */

export const WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY = "leo_worksheet_public_preview_v1";

/**
 * @typedef {Object} WorksheetPublicPreviewSession
 * @property {import("./worksheet-question-types.js").WorksheetPayload} worksheetPayload
 * @property {Record<string, unknown>} generation
 * @property {boolean} includeAnswers
 * @property {"public-demo" | "public-ready"} source
 * @property {string} [slug]
 */

/**
 * @param {WorksheetPublicPreviewSession} data
 */
export function saveWorksheetPublicPreviewSession(data) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY, JSON.stringify(data));
}

/**
 * @returns {WorksheetPublicPreviewSession | null}
 */
export function loadWorksheetPublicPreviewSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY);
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
export function saveWorksheetPublicAnswerKeySession(answerKeyPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY}_answers`,
    JSON.stringify(answerKeyPayload)
  );
}

/**
 * @returns {import("./worksheet-question-types.js").AnswerKeyPayload | null}
 */
export function loadWorksheetPublicAnswerKeySession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY}_answers`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearWorksheetPublicAnswerKeySession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY}_answers`);
}

export function clearWorksheetPublicPreviewSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY);
  sessionStorage.removeItem(`${WORKSHEET_PUBLIC_PREVIEW_STORAGE_KEY}_answers`);
}
