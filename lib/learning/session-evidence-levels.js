/**
 * Phase 3 — session/answer/evidence level fields (displayLevel + sourceDifficulty).
 * Bridges legacy easy/medium/hard/mixed with 2-level display model.
 */

import {
  DISPLAY_LEVELS,
  SOURCE_DIFFICULTIES,
  isScienceSubjectId,
  normalizeDisplayLevel,
  resolveSessionLevels,
  sourceDifficultyToDisplayLevel,
} from "./display-level.js";

/**
 * @param {string|null|undefined} value
 * @returns {"easy"|"medium"|"hard"|null}
 */
export function normalizeSourceDifficulty(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "easy" || key === "medium" || key === "hard") return key;
  return null;
}

/**
 * Map resolved session levels back to legacy metadata `level` when client did not send one.
 * @param {{
 *   displayLevel: string,
 *   regularInternalState?: string,
 *   scienceInternalState?: string,
 * }} resolved
 * @param {string|null|undefined} originalLevel
 * @returns {string}
 */
export function deriveLegacySessionLevel(resolved, originalLevel) {
  const orig = String(originalLevel || "").trim().toLowerCase();
  if (orig && ["easy", "medium", "hard", "mixed"].includes(orig)) return orig;
  if (resolved.displayLevel === "advanced") return "hard";
  if (resolved.scienceInternalState) {
    const sci = normalizeSourceDifficulty(resolved.scienceInternalState);
    if (sci) return sci;
  }
  if (resolved.regularInternalState) {
    const reg = normalizeSourceDifficulty(resolved.regularInternalState);
    if (reg === "easy" || reg === "medium") return reg;
  }
  return "mixed";
}

/**
 * Build session metadata level fields for session/start.
 * @param {{
 *   subjectId: string,
 *   level?: string|null,
 *   displayLevel?: string|null,
 *   regularInternalState?: string|null,
 *   scienceInternalState?: string|null,
 *   clientMeta?: Record<string, unknown>|null,
 * }} input
 */
export function buildSessionStartLevelMetadata(input) {
  const clientMeta =
    input.clientMeta && typeof input.clientMeta === "object" && !Array.isArray(input.clientMeta)
      ? input.clientMeta
      : {};

  const resolved = resolveSessionLevels({
    subjectId: input.subjectId,
    level: input.level ?? clientMeta.level,
    displayLevel: input.displayLevel ?? clientMeta.displayLevel,
    regularInternalState: input.regularInternalState ?? clientMeta.regularInternalState,
    scienceInternalState: input.scienceInternalState ?? clientMeta.scienceInternalState,
    sourceDifficulty: clientMeta.sourceDifficulty,
  });

  const legacyLevel = deriveLegacySessionLevel(resolved, input.level ?? clientMeta.level);

  /** @type {Record<string, unknown>} */
  const out = {
    level: legacyLevel,
    displayLevel: resolved.displayLevel,
  };
  if (resolved.regularInternalState) out.regularInternalState = resolved.regularInternalState;
  if (resolved.scienceInternalState) out.scienceInternalState = resolved.scienceInternalState;
  if (resolved.sourceDifficulty) out.sourceDifficulty = resolved.sourceDifficulty;
  return out;
}

/**
 * Resolve per-answer displayLevel + sourceDifficulty from payload/session (aggregate read + answer write).
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {Record<string, unknown>|null|undefined} sessionMeta
 * @param {string|null|undefined} subjectId
 */
export function resolveAnswerLevelFromPayload(payload, sessionMeta = {}, subjectId = "") {
  const p = payload && typeof payload === "object" ? payload : {};
  const sm = sessionMeta && typeof sessionMeta === "object" ? sessionMeta : {};
  const clientMeta =
    p.clientMeta && typeof p.clientMeta === "object" && !Array.isArray(p.clientMeta)
      ? p.clientMeta
      : {};
  const questionEngine =
    p.questionEngine && typeof p.questionEngine === "object" && !Array.isArray(p.questionEngine)
      ? p.questionEngine
      : {};
  const params = p.params && typeof p.params === "object" && !Array.isArray(p.params) ? p.params : {};

  let sourceDifficulty =
    normalizeSourceDifficulty(p.sourceDifficulty) ||
    normalizeSourceDifficulty(clientMeta.sourceDifficulty) ||
    normalizeSourceDifficulty(questionEngine.difficulty) ||
    normalizeSourceDifficulty(p.difficulty) ||
    normalizeSourceDifficulty(params.sourceDifficulty) ||
    normalizeSourceDifficulty(params.difficulty) ||
    normalizeSourceDifficulty(p.level) ||
    normalizeSourceDifficulty(clientMeta.level);

  let displayLevel =
    normalizeDisplayLevel(p.displayLevel) ||
    normalizeDisplayLevel(clientMeta.displayLevel) ||
    normalizeDisplayLevel(params.displayLevel);

  const sessionResolved = resolveSessionLevels({
    subjectId,
    level: sm.level,
    displayLevel: sm.displayLevel ?? displayLevel,
    regularInternalState: p.regularInternalState ?? clientMeta.regularInternalState ?? sm.regularInternalState,
    scienceInternalState: p.scienceInternalState ?? clientMeta.scienceInternalState ?? sm.scienceInternalState,
    sourceDifficulty: sm.sourceDifficulty ?? sourceDifficulty,
  });

  if (!displayLevel) displayLevel = sessionResolved.displayLevel;

  if (!sourceDifficulty) {
    sourceDifficulty =
      normalizeSourceDifficulty(sessionResolved.sourceDifficulty) ||
      normalizeSourceDifficulty(sessionResolved.regularInternalState) ||
      normalizeSourceDifficulty(sessionResolved.scienceInternalState);
  }

  if (!sourceDifficulty) {
    const legacyLevel = String(sm.level || p.level || clientMeta.level || "").trim().toLowerCase();
    sourceDifficulty = normalizeSourceDifficulty(legacyLevel);
    if (!sourceDifficulty && legacyLevel === "hard") sourceDifficulty = "hard";
    if (!sourceDifficulty && (legacyLevel === "mixed" || legacyLevel === "regular")) {
      sourceDifficulty = isScienceSubjectId(subjectId) ? "easy" : "medium";
    }
  }

  if (!sourceDifficulty) sourceDifficulty = "medium";

  if (isScienceSubjectId(subjectId)) {
    displayLevel = "regular";
  } else if (!displayLevel) {
    displayLevel = sourceDifficultyToDisplayLevel(sourceDifficulty) || sessionResolved.displayLevel || "regular";
  }

  displayLevel = normalizeDisplayLevel(displayLevel) || "regular";

  /** @type {Record<string, unknown>} */
  const internalState = {};
  const regularInternalState =
    normalizeSourceDifficulty(p.regularInternalState) ||
    normalizeSourceDifficulty(clientMeta.regularInternalState) ||
    normalizeSourceDifficulty(sm.regularInternalState);
  if (regularInternalState === "easy" || regularInternalState === "medium") {
    internalState.regularInternalState = regularInternalState;
  }
  const scienceInternalState =
    normalizeSourceDifficulty(p.scienceInternalState) ||
    normalizeSourceDifficulty(clientMeta.scienceInternalState) ||
    normalizeSourceDifficulty(sm.scienceInternalState);
  if (scienceInternalState) {
    internalState.scienceInternalState = scienceInternalState;
  }

  return {
    displayLevel,
    sourceDifficulty,
    legacyLevel: sourceDifficulty,
    ...internalState,
  };
}

/**
 * Build answer payload level fields for /api/learning/answer.
 * @param {{
 *   subjectId: string,
 *   bodyLevel?: string|null,
 *   bodyDisplayLevel?: string|null,
 *   bodySourceDifficulty?: string|null,
 *   bodyRegularInternalState?: string|null,
 *   bodyScienceInternalState?: string|null,
 *   clientMeta?: Record<string, unknown>|null,
 *   sessionMeta?: Record<string, unknown>|null,
 *   questionEngine?: Record<string, unknown>|null,
 * }} input
 */
export function buildAnswerLevelFields(input) {
  const clientMeta =
    input.clientMeta && typeof input.clientMeta === "object" && !Array.isArray(input.clientMeta)
      ? { ...input.clientMeta }
      : {};

  const resolved = resolveAnswerLevelFromPayload(
    {
      level: input.bodyLevel,
      displayLevel: input.bodyDisplayLevel,
      sourceDifficulty: input.bodySourceDifficulty,
      regularInternalState: input.bodyRegularInternalState,
      scienceInternalState: input.bodyScienceInternalState,
      clientMeta,
      questionEngine: input.questionEngine,
    },
    input.sessionMeta || {},
    input.subjectId
  );

  clientMeta.level = resolved.legacyLevel;
  clientMeta.displayLevel = resolved.displayLevel;
  clientMeta.sourceDifficulty = resolved.sourceDifficulty;

  /** @type {Record<string, unknown>} */
  const payloadFields = {
    displayLevel: resolved.displayLevel,
    sourceDifficulty: resolved.sourceDifficulty,
    level: resolved.legacyLevel,
    clientMeta,
  };
  if (resolved.regularInternalState) payloadFields.regularInternalState = resolved.regularInternalState;
  if (resolved.scienceInternalState) payloadFields.scienceInternalState = resolved.scienceInternalState;

  return {
    ...payloadFields,
    questionEngineDifficulty: resolved.sourceDifficulty,
  };
}

export const ALLOWED_DISPLAY_LEVEL_VALUES = DISPLAY_LEVELS;
export const ALLOWED_SOURCE_DIFFICULTY_VALUES = SOURCE_DIFFICULTIES;

/**
 * @param {Record<string, number>|null|undefined} counts
 * @returns {"regular"|"advanced"|null}
 */
export function dominantDisplayLevelFromCounts(counts) {
  if (!counts || typeof counts !== "object") return null;
  let bestKey = null;
  let best = -1;
  for (const key of DISPLAY_LEVELS) {
    const n = Math.max(0, Math.floor(Number(counts[key]) || 0));
    if (n > best) {
      best = n;
      bestKey = key;
    }
  }
  if (best <= 0) {
    const unknown = Math.max(0, Math.floor(Number(counts.unknown) || 0));
    return unknown > 0 ? null : null;
  }
  return bestKey;
}

/**
 * @param {Record<string, unknown>} slice
 * @param {{ displayLevel?: string, sourceDifficulty?: string }} fields
 */
export function bumpAnswerLevelRollups(slice, fields) {
  if (!slice || typeof slice !== "object") return;
  if (!slice.displayLevelCounts) {
    slice.displayLevelCounts = { regular: 0, advanced: 0, unknown: 0 };
  }
  const dl = normalizeDisplayLevel(fields.displayLevel);
  const dlKey = dl && DISPLAY_LEVELS.includes(dl) ? dl : "unknown";
  slice.displayLevelCounts[dlKey] = (slice.displayLevelCounts[dlKey] || 0) + 1;

  if (!slice._sourceDifficultyBreakdown) {
    slice._sourceDifficultyBreakdown = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  }
  const sd = normalizeSourceDifficulty(fields.sourceDifficulty);
  const sdKey = sd && SOURCE_DIFFICULTIES.includes(sd) ? sd : "unknown";
  slice._sourceDifficultyBreakdown[sdKey] = (slice._sourceDifficultyBreakdown[sdKey] || 0) + 1;
}

/**
 * @param {Record<string, unknown>} slice
 */
export function finalizeDisplayLevelRollups(slice) {
  if (!slice || typeof slice !== "object") return;
  slice.dominantDisplayLevel = dominantDisplayLevelFromCounts(slice.displayLevelCounts);
}
