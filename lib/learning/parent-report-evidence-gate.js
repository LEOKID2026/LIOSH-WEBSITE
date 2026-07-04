/**
 * Parent report + diagnostic engine evidence gate (PRODUCT-ALIGNMENT P0).
 * Count only answered questions from self practice and parent-assigned activities.
 */

import { EVIDENCE_CATEGORIES } from "./activity-classification.js";

const NON_COUNTABLE_SESSION_MODES = new Set([
  "learning",
  "mistakes",
  "challenge",
  "speed",
  "marathon",
  "learning_book",
]);

const NON_COUNTABLE_SELF_PRACTICE_MODES = new Set([
  "learning",
  "mistakes",
  "challenge",
  "speed",
  "marathon",
  "learning_book",
  "discussion",
]);

/**
 * Session duration / session counters — only from self-practice modes (not passive / games).
 * @param {string|null|undefined} mode
 */
export function isCountableSelfPracticeSessionMode(mode) {
  const m = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  if (!m || m === "unknown") return false;
  return !NON_COUNTABLE_SESSION_MODES.has(m);
}

/**
 * Self-practice answer row from `answers` table (free_practice source only).
 * @param {{
 *   evidenceCategory?: string,
 *   isDiagnosticEligible?: boolean,
 *   contextFlags?: { afterStepByStep?: boolean, contextAfterBookReading?: boolean },
 *   resolvedMode?: string|null,
 * }} input
 */
export function isCountableSelfPracticeAnswer(input) {
  const ctx = input?.contextFlags && typeof input.contextFlags === "object" ? input.contextFlags : {};
  if (ctx.contextAfterBookReading === true) return false;
  if (ctx.afterStepByStep === true) return false;

  const mode =
    typeof input?.resolvedMode === "string" ? input.resolvedMode.trim().toLowerCase() : "";
  if (mode && NON_COUNTABLE_SELF_PRACTICE_MODES.has(mode)) return false;

  const cat = String(input?.evidenceCategory || "").trim();
  if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) return false;
  if (cat === EVIDENCE_CATEGORIES.LEARNING_GUIDED) return false;
  if (cat === EVIDENCE_CATEGORIES.LEARNING_REVIEW) return false;
  if (cat === EVIDENCE_CATEGORIES.LEARNING_BOOK) return false;
  if (cat === EVIDENCE_CATEGORIES.LEARNING_CONTEXT) return false;
  if (cat === EVIDENCE_CATEGORIES.UNCLASSIFIED) return false;

  return (
    cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT ||
    cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED
  );
}

/** Parent-assigned activity attempts are always countable when present in the attempts loop. */
export function isCountableParentAssignedAnswer() {
  return true;
}

const PARENT_REPORT_EXCLUDED_MODES = new Set([
  "challenge",
  "speed",
  "marathon",
  "learning_book",
]);

const PARENT_REPORT_EXCLUDED_CATEGORIES = new Set([
  EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE,
  EVIDENCE_CATEGORIES.LEARNING_BOOK,
  EVIDENCE_CATEGORIES.LEARNING_CONTEXT,
]);

/**
 * Parent-facing practice totals (questions / correct / wrong / accuracy).
 * Broader than {@link isCountableSelfPracticeAnswer}: includes learning-mode attempts and
 * step-by-step retries so parents see real mistakes — still excludes games, book, and passive context.
 * @param {Parameters<typeof isCountableSelfPracticeAnswer>[0]} input
 */
export function isParentReportPracticeAnswer(input) {
  const ctx = input?.contextFlags && typeof input.contextFlags === "object" ? input.contextFlags : {};
  if (ctx.contextAfterBookReading === true) return false;

  const cat = String(input?.evidenceCategory || "").trim();
  if (PARENT_REPORT_EXCLUDED_CATEGORIES.has(cat)) return false;
  if (!cat || cat === EVIDENCE_CATEGORIES.UNCLASSIFIED) return false;

  if (
    cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT ||
    cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED ||
    cat === EVIDENCE_CATEGORIES.LEARNING_GUIDED ||
    cat === EVIDENCE_CATEGORIES.LEARNING_REVIEW
  ) {
    return true;
  }

  const mode =
    typeof input?.resolvedMode === "string" ? input.resolvedMode.trim().toLowerCase() : "";
  if (mode && PARENT_REPORT_EXCLUDED_MODES.has(mode)) return false;
  if (mode === "learning" || mode === "mistakes") return false;

  if (
    mode === "practice" ||
    mode === "quiz" ||
    mode === "guided_practice" ||
    mode === "homework"
  ) {
    return true;
  }

  return false;
}
