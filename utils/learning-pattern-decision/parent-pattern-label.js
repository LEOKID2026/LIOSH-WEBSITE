/**
 * Parent-safe pattern labels - never expose raw engine ids or "unknown" to parents.
 */

import {
  isTechnicalEnglishPatternKey,
  parentFacingErrorPatternLabelHe,
  resolveParentFacingPatternLabelHe,
} from "./parent-facing-error-pattern-he.js";

const BLOCKED_LABELS = new Set([
  "unknown",
  "unspecified",
  "unclassified",
  "none",
  "null",
  "undefined",
]);

/**
 * Labels that must never drive parent-facing repeated-pattern wording.
 * @param {string|null|undefined} label
 */
export function isBlockedParentPatternLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (BLOCKED_LABELS.has(lower)) return true;
  if (/^\(unknown\)$/i.test(raw)) return true;
  return false;
}

/**
 * @param {string|null|undefined} label
 */
export function isUsableParentPatternLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (BLOCKED_LABELS.has(lower)) return false;
  if (lower.startsWith("recent:")) return false;
  if (lower.startsWith("pf:recent:")) return false;
  if (/^\(unknown\)$/i.test(raw)) return false;
  if (/^pf:[a-z0-9_:.-]+$/i.test(raw) && !/[\u0590-\u05FF]/.test(raw)) return false;
  if (/^k:[a-z0-9_|.-]+$/i.test(raw) && !/[\u0590-\u05FF]/.test(raw)) return false;
  if (/^default_[a-z0-9_]+$/i.test(raw)) return false;
  if (isTechnicalEnglishPatternKey(raw)) return false;
  return true;
}

/**
 * @param {string|null|undefined} label
 * @returns {string}
 */
export function sanitizeParentPatternLabel(label) {
  const mapped = resolveParentFacingPatternLabelHe(label);
  return mapped && isUsableParentPatternLabel(mapped) ? mapped : "";
}
