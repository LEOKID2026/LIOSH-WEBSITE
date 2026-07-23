/**
 * Writing worksheet generation orchestration — parent, ready, and public demo.
 * @module lib/writing/writing-generate.server
 */

import { validatePublicWritingDemo, validateWritingRequest } from "./writing-validate.server.js";
import {
  buildReadyWritingPayload,
  buildWritingPayloadFromRequest,
  publicWritingPayload,
  validateWritingAnswerIntegrity,
} from "./writing-payload-build.server.js";
import { getWritingCatalogEntryBySlug } from "./writing-catalog.server.js";
import { writingErrorLabelHe } from "./writing-error-labels.he.js";

/**
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
function writingGenerateFailure(status, code, message) {
  return {
    ok: false,
    status,
    code,
    message: message || writingErrorLabelHe(code) || undefined,
  };
}

/**
 * @typedef {import("./writing-worksheet-types.js").WritingWorksheetRequest} WritingWorksheetRequest
 * @typedef {import("./writing-worksheet-types.js").WritingWorksheetPayload} WritingWorksheetPayload
 */

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   ok: true,
 *   worksheetPayload: WritingWorksheetPayload,
 *   seed: number,
 *   generation: Record<string, unknown>,
 * } | { ok: false, status: number, code: string, message?: string }}
 */
export function generateWritingForParent(input) {
  const validated = validateWritingRequest(input);
  if (!validated.ok) {
    return writingGenerateFailure(400, validated.code, validated.message);
  }

  const request = validated.request;
  const seed = request.seed ?? Math.floor(Math.random() * 2147483647);
  const requestWithSeed = { ...request, seed };

  const worksheetPayload = buildWritingPayloadFromRequest(requestWithSeed, {
    savedAt: Date.now(),
  });

  const integrity = validateWritingAnswerIntegrity(worksheetPayload);
  if (!integrity.pass) {
    return {
      ok: false,
      status: 500,
      code: "answer_integrity_failed",
      message: integrity.errors.join(", "),
    };
  }

  if (!worksheetPayload.pages.length) {
    return writingGenerateFailure(422, "no_printable_pages");
  }

  return {
    ok: true,
    worksheetPayload,
    seed,
    generation: {
      worksheetType: "writing",
      writingCategory: request.writingCategory,
      seed,
      inkSave: request.inkSave === true,
      lineCount: request.lineCount,
      tracingMode: request.tracingMode,
    },
  };
}

/**
 * @param {import("./writing-worksheet-types.js").ReadyWritingCatalogEntry} entry
 * @returns {{
 *   ok: true,
 *   worksheetPayload: WritingWorksheetPayload,
 *   generation: Record<string, unknown>,
 * } | { ok: false, status: number, code: string, message?: string }}
 */
export function generateReadyWritingPayload(entry) {
  if (!entry?.slug || !entry.catalogNumber) {
    return { ok: false, status: 400, code: "invalid_ready_entry" };
  }

  const worksheetPayload = buildReadyWritingPayload(entry);
  const integrity = validateWritingAnswerIntegrity(worksheetPayload);
  if (!integrity.pass) {
    return {
      ok: false,
      status: 500,
      code: "answer_integrity_failed",
      message: integrity.errors.join(", "),
    };
  }

  return {
    ok: true,
    worksheetPayload,
    generation: {
      worksheetType: "writing",
      source: "ready",
      slug: entry.slug,
      catalogNumber: entry.catalogNumber,
      writingCategory: entry.writingCategory,
      seed: entry.seed ?? worksheetPayload.meta.seed ?? null,
      inkSave: entry.inkSave === true,
    },
  };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   ok: true,
 *   worksheetPayload: WritingWorksheetPayload,
 *   seed: number,
 *   generation: Record<string, unknown>,
 * } | { ok: false, status: number, code: string, message?: string }}
 */
export function generatePublicWritingDemo(input) {
  const validated = validatePublicWritingDemo(input);
  if (!validated.ok) {
    const status =
      validated.code === "TASK_TYPE_NOT_ALLOWED_IN_PUBLIC_DEMO" ||
      validated.code === "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" ||
      validated.code === "NUMBER_MODE_NOT_ALLOWED_IN_PUBLIC_DEMO" ||
      validated.code === "PUBLIC_DEMO_QUANTITY_NOT_ALLOWED"
        ? 403
        : 400;
    return writingGenerateFailure(status, validated.code, validated.message);
  }

  const request = validated.request;
  const seed = request.seed ?? Math.floor(Math.random() * 2147483647);
  const requestWithSeed = {
    ...request,
    seed,
    lineCount: Math.min(request.lineCount, 6),
    itemsPerLine: Math.min(request.itemsPerLine, 4),
  };

  const worksheetPayload = buildWritingPayloadFromRequest(requestWithSeed, {
    savedAt: null,
  });

  const integrity = validateWritingAnswerIntegrity(worksheetPayload);
  if (!integrity.pass) {
    return {
      ok: false,
      status: 500,
      code: "answer_integrity_failed",
      message: integrity.errors.join(", "),
    };
  }

  return {
    ok: true,
    worksheetPayload,
    seed,
    generation: {
      worksheetType: "writing",
      source: "public-demo",
      writingCategory: request.writingCategory,
      seed,
      inkSave: request.inkSave === true,
      ...(validated.presetId ? { presetId: validated.presetId } : {}),
    },
  };
}

/**
 * @param {string} slug
 * @param {{ publicOnly?: boolean }} [opts]
 * @returns {{
 *   ok: true,
 *   worksheetPayload: WritingWorksheetPayload,
 *   generation: Record<string, unknown>,
 * } | { ok: false, status: number, code: string, message?: string }}
 */
export function generateReadyWritingBySlug(slug, opts = {}) {
  const entry = getWritingCatalogEntryBySlug(slug);
  if (!entry) {
    return { ok: false, status: 404, code: "unknown_writing_slug" };
  }
  if (opts.publicOnly && !entry.publicAccess) {
    return { ok: false, status: 403, code: "writing_slug_locked" };
  }
  return generateReadyWritingPayload(entry);
}

export { publicWritingPayload };
