/**
 * Dual-engine runner — DE2 + V3 from synthetic scenario input.
 * Works today against DE2; V3 fields are read when present (never required to crash).
 */

import { runDiagnosticEngineV2 } from "../../../../../utils/diagnostic-engine-v2/index.js";
import { runDiagnosticEngineV3 } from "../../../../../utils/diagnostic-engine-v3/index.js";
import { normalizeMistakeEvent } from "../../../../../utils/mistake-event.js";

export const DEFAULT_WINDOW = Object.freeze({
  startMs: Date.UTC(2026, 3, 1, 0, 0, 0, 0),
  endMs: Date.UTC(2026, 3, 14, 23, 59, 59, 999),
});

/**
 * @param {Record<string, unknown>} partial
 * @param {number} [idx]
 */
export function mistake(partial, idx = 0) {
  const { startMs, endMs } = DEFAULT_WINDOW;
  const span = endMs - startMs;
  return normalizeMistakeEvent(
    {
      timestamp: startMs + Math.floor((span * (idx + 1)) / (idx + 2)),
      isCorrect: false,
      ...partial,
    },
    partial.subject || partial.subjectId || "math",
  );
}

/**
 * @param {number} questions
 * @param {number} correct
 * @param {Record<string, unknown>} [extra]
 */
export function topicRow(questions, correct, extra = {}) {
  const wrong = Math.max(0, questions - correct);
  return {
    questions,
    correct,
    wrong,
    accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
    needsPractice: questions > 0 && correct / questions < 0.7,
    lastSessionMs: DEFAULT_WINDOW.endMs - 3600_000,
    dataSufficiencyLevel: questions >= 12 ? "medium" : questions >= 8 ? "low" : "low",
    isEarlySignalOnly: questions < 8,
    ...extra,
  };
}

/**
 * @param {object} input
 * @param {Record<string, Record<string, Record<string, unknown>>>} input.maps
 * @param {Record<string, unknown[]>} input.rawMistakesBySubject
 * @param {unknown[]} [input.probes]
 * @param {{ startMs?: number, endMs?: number }} [input.window]
 */
export function runDualEngine(input) {
  const window = input.window || DEFAULT_WINDOW;
  const de2 = runDiagnosticEngineV2({
    maps: input.maps,
    rawMistakesBySubject: input.rawMistakesBySubject,
    startMs: window.startMs,
    endMs: window.endMs,
  });
  const v3 = runDiagnosticEngineV3({
    maps: input.maps,
    rawMistakesBySubject: input.rawMistakesBySubject,
    startMs: window.startMs,
    endMs: window.endMs,
    probeEvidence: input.probes || [],
    diagnosticEngineV2: de2,
  });

  const primarySubject = Object.keys(input.maps || {})[0] || "math";
  const rollups = v3.rollupsBySubject?.[primarySubject] || [];
  const unit = Array.isArray(de2.units) ? de2.units[0] : null;

  return { de2, v3, rollups, unit, window, primarySubject };
}

/**
 * Pick rollup by topic or subskill hint.
 * @param {object[]} rollups
 * @param {{ topic?: string, subskill?: string }} hint
 */
export function pickRollup(rollups, hint = {}) {
  if (!Array.isArray(rollups) || rollups.length === 0) return null;
  if (hint.subskill) {
    const bySub = rollups.find((r) => r.subskill === hint.subskill);
    if (bySub) return bySub;
  }
  if (hint.topic) {
    const byTopic = rollups.find((r) => r.topic === hint.topic);
    if (byTopic) return byTopic;
  }
  return rollups[0];
}

/**
 * @param {object} de2
 * @param {string} [subjectId]
 */
export function pickDe2Unit(de2, subjectId) {
  const units = Array.isArray(de2?.units) ? de2.units : [];
  if (subjectId) {
    return units.find((u) => u.subjectId === subjectId) || units[0] || null;
  }
  return units[0] || null;
}
