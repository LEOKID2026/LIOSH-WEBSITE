/**
 * Activity Evidence Classification
 *
 * Pure, side-effect-free classification of learning answer evidence.
 * This is the single source of truth for the entire system.
 *
 * Used by:
 *  - pages/api/learning/answer.js (free-practice answers)
 *  - All 3 assigned activity answer write paths (class / individual / parent)
 *  - scripts/backfill-activity-classification.mjs (offline backfill)
 *  - lib/parent-server/report-data-aggregate.server.js (Phase 4)
 */

/**
 * Evidence category enum values.
 * diagnostic_independent  — cold, unaided practice → mastery-eligible
 * diagnostic_competitive  — challenge/speed/marathon → eligible, separate bucket
 * diagnostic_guided       — live_lesson, practice_mistakes → eligible with context note
 * learning_guided         — learning mode, guided_practice, step-by-step → NOT diagnostic
 * learning_review         — mistakes mode (reviewing past wrongs) → NOT cold probe
 * learning_book           — book reading session → never diagnostic
 * learning_context        — discussion activities → no accuracy meaning
 * unclassified            — unknown or missing mode → excluded from all claims
 */
export const EVIDENCE_CATEGORIES = Object.freeze({
  DIAGNOSTIC_INDEPENDENT: "diagnostic_independent",
  DIAGNOSTIC_COMPETITIVE: "diagnostic_competitive",
  DIAGNOSTIC_GUIDED: "diagnostic_guided",
  LEARNING_GUIDED: "learning_guided",
  LEARNING_REVIEW: "learning_review",
  LEARNING_BOOK: "learning_book",
  LEARNING_CONTEXT: "learning_context",
  UNCLASSIFIED: "unclassified",
});

/**
 * Complete mode → classification mapping.
 * Covers free-practice modes, all assigned activity modes, and book mode.
 *
 * @type {Record<string, { isDiagnosticEligible: boolean, evidenceCategory: string }>}
 */
export const MODE_CLASSIFICATION_MAP = Object.freeze({
  // ── Free-practice modes (from learning masters) ──────────────────────────
  practice: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  graded: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  drill: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  review: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  normal: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  practice_mistakes: {
    // Eligible but context-flagged: targeted retry, not a cold probe
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED,
  },
  challenge: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE,
  },
  speed: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE,
  },
  marathon: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE,
  },
  learning: {
    // Explanation/hint visible during question — answer leakage possible
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
  },
  mistakes: {
    // Reviewing previously wrong answers — not a cold probe
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_REVIEW,
  },

  // ── Assigned activity modes (classroom / individual / parent) ─────────────
  quiz: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  homework: {
    // Assumed independent at home
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  worksheet: {
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT,
  },
  live_lesson: {
    // Teacher present — eligible but context-flagged
    isDiagnosticEligible: true,
    evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED,
  },
  guided_practice: {
    // Guided with hints/explanation — not independent, not diagnostic
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
  },
  discussion: {
    // No accuracy diagnostic meaning
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_CONTEXT,
  },

  // ── Book mode ─────────────────────────────────────────────────────────────
  learning_book: {
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_BOOK,
  },
});

/**
 * The set of all modes that are diagnostic-eligible (ignoring context overrides).
 */
export const DIAGNOSTIC_ELIGIBLE_MODES = Object.freeze(
  new Set(
    Object.entries(MODE_CLASSIFICATION_MAP)
      .filter(([, v]) => v.isDiagnosticEligible)
      .map(([k]) => k)
  )
);

/**
 * Classify a single answer or attempt's evidence value.
 *
 * Rules (applied in priority order):
 *  1. afterStepByStep=true → always learning_guided, never diagnostic
 *  2. source="learning_book" or mode="learning_book" → learning_book, never diagnostic
 *  3. mode lookup in MODE_CLASSIFICATION_MAP
 *  4. Fallback → unclassified, not diagnostic
 *
 * @param {string|null|undefined} mode
 *   The game/activity mode string (e.g. "practice", "quiz", "learning").
 * @param {"free_practice"|"assigned_class"|"assigned_individual"|"assigned_parent"|"learning_book"} [source]
 *   The source/scope of the answer. Defaults to "free_practice".
 * @param {{
 *   afterStepByStep?: boolean,
 *   contextAfterBookReading?: boolean,
 *   hintsUsed?: number,
 * }} [context]
 *   Runtime context flags resolved before calling this function.
 * @returns {{
 *   isDiagnosticEligible: boolean,
 *   evidenceCategory: string,
 *   contextFlags: {
 *     afterStepByStep: boolean,
 *     contextAfterBookReading: boolean,
 *     hasHints: boolean,
 *     stepByStepOverride?: boolean,
 *     unknownMode?: boolean,
 *     rawMode?: string|null,
 *   }
 * }}
 */
export function classifyActivityEvidence(mode, source = "free_practice", context = {}) {
  const normalizedMode =
    typeof mode === "string" && mode.trim() ? mode.trim().toLowerCase() : null;
  const afterStepByStep = context.afterStepByStep === true;
  const contextAfterBookReading = context.contextAfterBookReading === true;
  const hintsUsed = typeof context.hintsUsed === "number" ? context.hintsUsed : 0;
  const baseFlags = {
    afterStepByStep,
    contextAfterBookReading,
    hasHints: hintsUsed > 0,
  };

  // Priority 1 — step-by-step override: always non-diagnostic, regardless of mode
  if (afterStepByStep) {
    return {
      isDiagnosticEligible: false,
      evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_GUIDED,
      contextFlags: { ...baseFlags, stepByStepOverride: true },
    };
  }

  // Priority 2 — book source/mode
  if (source === "learning_book" || normalizedMode === "learning_book") {
    return {
      isDiagnosticEligible: false,
      evidenceCategory: EVIDENCE_CATEGORIES.LEARNING_BOOK,
      contextFlags: baseFlags,
    };
  }

  // Priority 2.5 — parent-assigned activity: real child learning evidence for diagnostic engine.
  // guided_practice from a parent is diagnostic_guided (like live_lesson), not learning-only.
  // homework falls through to mode map (diagnostic_independent). Classroom modes unchanged.
  if (source === "assigned_parent" && normalizedMode === "guided_practice") {
    return {
      isDiagnosticEligible: true,
      evidenceCategory: EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED,
      contextFlags: baseFlags,
    };
  }

  // Priority 3 — mode lookup
  if (normalizedMode !== null) {
    const entry = MODE_CLASSIFICATION_MAP[normalizedMode];
    if (entry) {
      return {
        isDiagnosticEligible: entry.isDiagnosticEligible,
        evidenceCategory: entry.evidenceCategory,
        contextFlags: baseFlags,
      };
    }
  }

  // Priority 4 — fallback: unknown or missing mode → unclassified, not eligible
  return {
    isDiagnosticEligible: false,
    evidenceCategory: EVIDENCE_CATEGORIES.UNCLASSIFIED,
    contextFlags: {
      ...baseFlags,
      unknownMode: true,
      rawMode: mode ?? null,
    },
  };
}
