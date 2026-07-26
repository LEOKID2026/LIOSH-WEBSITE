/**
 * Legacy helper — key-only parent-safe label resolution.
 */
import { parentFacingErrorPatternLabelHe } from "./parent-facing-error-pattern-he.js";

/**
 * @param {{ key?: string, label?: string, count?: number }|null|undefined} pattern
 * @returns {string}
 */
export function resolveFactualParentPatternLabel(pattern) {
  if (!pattern || typeof pattern !== "object") return "";
  return parentFacingErrorPatternLabelHe(pattern.key);
}
