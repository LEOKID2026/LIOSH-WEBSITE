/**
 * Worksheet type registry — routes questions, writing, and reserved coloring.
 * @module lib/worksheets/worksheet-type-registry
 */

import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "./worksheet-generate.server.js";
import { getReadyWorksheetBySlug } from "./worksheet-ready-catalog.js";
import {
  generatePublicWritingDemo,
  generateReadyWritingBySlug,
  generateWritingForParent,
  publicWritingPayload,
} from "../writing/writing-generate.server.js";
import { getWritingCatalogEntryBySlug } from "../writing/writing-catalog.server.js";
import {
  generateColoringWorksheet,
  publicColoringPayload,
} from "../coloring/coloring-generate.server.js";
import { getColoringCatalogForHub } from "../coloring/coloring-catalog.server.js";
import {
  WORKSHEET_TYPE_COLORING,
  WORKSHEET_TYPE_QUESTIONS,
  WORKSHEET_TYPE_WRITING,
} from "../writing/writing-worksheet-types.js";

/** @typedef {"questions" | "writing" | "coloring"} WorksheetTypeId */

const QUESTIONS_HANDLER = {
  /**
   * @param {Record<string, unknown>} input
   */
  generate: generateWorksheetForParent,
  /**
   * @param {import("./worksheet-question-types.js").WorksheetPayload} payload
   */
  publicPayload: publicWorksheetPayload,
  /**
   * @param {string} slug
   * @param {{ publicOnly?: boolean }} [opts]
   */
  validateReady(slug, opts = {}) {
    const entry = getReadyWorksheetBySlug(slug);
    if (!entry) {
      return { ok: false, status: 404, code: "unknown_worksheet_slug" };
    }
    if (opts.publicOnly) {
      return { ok: true, entry };
    }
    return { ok: true, entry };
  },
};

const WRITING_HANDLER = {
  /**
   * @param {Record<string, unknown>} input
   */
  generate(input) {
    if (input?.source === "public-demo" || input?.presetId || input?.demoPresetId) {
      return generatePublicWritingDemo(input);
    }
    if (typeof input?.slug === "string" && input.slug.trim()) {
      return generateReadyWritingBySlug(String(input.slug).trim(), {
        publicOnly: input.publicOnly === true,
      });
    }
    return generateWritingForParent(input);
  },
  /**
   * @param {import("../writing/writing-worksheet-types.js").WritingWorksheetPayload} payload
   */
  publicPayload: publicWritingPayload,
  /**
   * @param {string} slug
   * @param {{ publicOnly?: boolean }} [opts]
   */
  validateReady(slug, opts = {}) {
    const entry = getWritingCatalogEntryBySlug(slug);
    if (!entry) {
      return { ok: false, status: 404, code: "unknown_writing_slug" };
    }
    if (opts.publicOnly && !entry.publicAccess) {
      return { ok: false, status: 403, code: "writing_slug_locked" };
    }
    return { ok: true, entry };
  },
};

const COLORING_HANDLER = {
  generate(input) {
    return generateColoringWorksheet(input);
  },
  publicPayload: publicColoringPayload,
  validateReady(cardKey) {
    const entry = getColoringCatalogForHub().find((c) => c.cardKey === cardKey);
    if (!entry) {
      return { ok: false, status: 404, code: "unknown_coloring_card" };
    }
    return { ok: true, entry };
  },
};

/** @type {Record<WorksheetTypeId, typeof QUESTIONS_HANDLER>} */
const TYPE_HANDLERS = {
  [WORKSHEET_TYPE_QUESTIONS]: QUESTIONS_HANDLER,
  [WORKSHEET_TYPE_WRITING]: WRITING_HANDLER,
  [WORKSHEET_TYPE_COLORING]: COLORING_HANDLER,
};

/**
 * Resolve worksheet type from request body — missing value defaults to questions.
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {WorksheetTypeId}
 */
export function resolveWorksheetType(body) {
  const raw = String(body?.worksheetType || "").trim().toLowerCase();
  if (raw === WORKSHEET_TYPE_WRITING) return WORKSHEET_TYPE_WRITING;
  if (raw === WORKSHEET_TYPE_COLORING) return WORKSHEET_TYPE_COLORING;
  return WORKSHEET_TYPE_QUESTIONS;
}

/**
 * @param {WorksheetTypeId | string | null | undefined} type
 * @returns {typeof QUESTIONS_HANDLER}
 */
export function getTypeHandler(type) {
  const key = String(type || WORKSHEET_TYPE_QUESTIONS).trim().toLowerCase();
  if (key === WORKSHEET_TYPE_WRITING) return TYPE_HANDLERS[WORKSHEET_TYPE_WRITING];
  if (key === WORKSHEET_TYPE_COLORING) return TYPE_HANDLERS[WORKSHEET_TYPE_COLORING];
  return TYPE_HANDLERS[WORKSHEET_TYPE_QUESTIONS];
}

/** @deprecated Use getTypeHandler — kept for transitional imports. */
export function getWorksheetTypeHandler(typeId) {
  return getTypeHandler(typeId);
}

export const WORKSHEET_TYPES = [WORKSHEET_TYPE_QUESTIONS, WORKSHEET_TYPE_WRITING, WORKSHEET_TYPE_COLORING];

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isWritingWorksheetPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const record = /** @type {Record<string, unknown>} */ (payload);
  if (record.payloadKind === "writing_worksheet") return true;
  return Array.isArray(record.pages) && !Array.isArray(record.questions);
}

export {
  WORKSHEET_TYPE_QUESTIONS,
  WORKSHEET_TYPE_WRITING,
  WORKSHEET_TYPE_COLORING,
};
