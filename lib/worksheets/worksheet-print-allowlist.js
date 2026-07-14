/**
 * Subject allowlist and printability rules — core four subjects only in Wave A–F.
 * @module lib/worksheets/worksheet-print-allowlist
 */

import { WORKSHEET_PRINTABILITY } from "./worksheet-question-types.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/** @type {Record<WorksheetSubjectId, { labelHe: string; enabled: boolean }>} */
export const WORKSHEET_SUBJECT_ALLOWLIST = {
  math: { labelHe: "מתמטיקה / חשבון", enabled: true },
  geometry: { labelHe: "גיאומטריה", enabled: true },
  hebrew: { labelHe: "עברית", enabled: true },
  english: { labelHe: "אנגלית", enabled: true },
};

/** Optional future subjects — not part of current approval. */
export const WORKSHEET_SUBJECT_OPTIONAL = {
  science: { labelHe: "מדעים", enabled: false },
  history: { labelHe: "היסטוריה", enabled: false },
  homeland: { labelHe: "מולדת", enabled: false },
  geography: { labelHe: "גיאוגרפיה", enabled: false },
};

/**
 * @param {string} subjectId
 * @returns {subjectId is WorksheetSubjectId}
 */
export function isCoreWorksheetSubject(subjectId) {
  return subjectId in WORKSHEET_SUBJECT_ALLOWLIST && WORKSHEET_SUBJECT_ALLOWLIST[/** @type {WorksheetSubjectId} */ (subjectId)].enabled;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import("./worksheet-question-types.js").WorksheetPrintability}
 */
export function resolvePrintability(raw) {
  if (raw?.requiresAudio === true || raw?.itemType === "audio") {
    return WORKSHEET_PRINTABILITY.blocked_audio;
  }
  if (raw?.pictureRef || raw?.imageUrl || raw?.requiresImage === true) {
    return WORKSHEET_PRINTABILITY.blocked_image;
  }
  if (raw?.diagramSpec && typeof raw.diagramSpec === "object" && raw.diagramSpec.kind === "pending") {
    return WORKSHEET_PRINTABILITY.blocked_diagram_pending;
  }
  return WORKSHEET_PRINTABILITY.printable;
}

/**
 * @param {import("./worksheet-question-types.js").WorksheetPrintability} printability
 * @returns {boolean}
 */
export function isPrintableQuestion(printability) {
  return printability === WORKSHEET_PRINTABILITY.printable;
}
