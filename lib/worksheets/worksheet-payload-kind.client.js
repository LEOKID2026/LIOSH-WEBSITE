/**
 * Client-side worksheet payload discrimination — questions vs writing vs coloring.
 * @module lib/worksheets/worksheet-payload-kind.client
 */

import { WRITING_PAYLOAD_KIND } from "../writing/writing-worksheet-types.js";
import { COLORING_PAYLOAD_KIND } from "../coloring/coloring-worksheet-types.js";

/**
 * @param {unknown} payload
 * @returns {payload is import("../coloring/coloring-worksheet-types.js").ColoringWorksheetPayload}
 */
export function isColoringWorksheetPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const record = /** @type {Record<string, unknown>} */ (payload);
  return record.payloadKind === COLORING_PAYLOAD_KIND;
}

/**
 * @param {unknown} payload
 * @returns {payload is import("../writing/writing-worksheet-types.js").WritingWorksheetPayload}
 */
export function isWritingWorksheetPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const record = /** @type {Record<string, unknown>} */ (payload);
  if (record.payloadKind === WRITING_PAYLOAD_KIND) return true;
  if (record.payloadKind === COLORING_PAYLOAD_KIND) return false;
  return Array.isArray(record.pages) && !Array.isArray(record.questions);
}

/**
 * @param {unknown} payload
 * @returns {payload is import("./worksheet-question-types.js").WorksheetPayload}
 */
export function isQuestionWorksheetPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Array.isArray(/** @type {Record<string, unknown>} */ (payload).questions);
}
