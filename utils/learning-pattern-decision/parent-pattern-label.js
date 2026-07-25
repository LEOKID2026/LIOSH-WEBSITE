/**
 * Parent-safe pattern labels - never expose raw engine ids or "unknown" to parents.
 */

import { TAXONOMY_BY_ID } from "../diagnostic-engine-v2/taxonomy-registry.js";
import { RULE_PRIMARY_PRODUCER } from "../../lib/learning/taxonomy-rule-primary-producers.js";
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

/** Parent-facing Hebrew for taxonomy patternHe values that must not leak English literals. */
const TAXONOMY_PARENT_PATTERN_BY_ID = Object.freeze({
  "E-02": "בלבול בין זמן עבר לזמן הווה באנגלית",
  "E-04": "בלבול בהתאמת כינוי גוף יחיד לפועל המתאים",
});

/** @type {Map<string, string>} literal patternHe / tag → parent Hebrew */
const RAW_PATTERN_LITERAL_PARENT_HE = Object.freeze({
  "past/present": TAXONOMY_PARENT_PATTERN_BY_ID["E-02"],
  "he/she/it": TAXONOMY_PARENT_PATTERN_BY_ID["E-04"],
});

/** @type {Map<string, string>} tag -> taxonomyId */
const TAG_TO_TAXONOMY_ID = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [taxonomyId, producer] of Object.entries(RULE_PRIMARY_PRODUCER)) {
    const tag = String(producer?.tag || "").trim().toLowerCase();
    if (tag) map.set(tag, taxonomyId);
  }
  return map;
})();

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
  const resolved = resolveParentPatternLabelForDisplay(label);
  return !!resolved;
}

/**
 * Resolve any internal tag/key to approved Hebrew for parents.
 * Falls back to taxonomy patternHe when tag maps to a rule.
 * @param {string|null|undefined} label
 * @returns {string}
 */
export function resolveParentPatternLabelForDisplay(label) {
  const raw = String(label || "").trim();
  if (!raw || isBlockedParentPatternLabel(raw)) return "";

  if (/[\u0590-\u05FF]/.test(raw)) {
    return raw.replace(/\s+/g, " ").trim();
  }

  const literalParent = RAW_PATTERN_LITERAL_PARENT_HE[raw.toLowerCase()];
  if (literalParent) return literalParent;

  const mapped = parentFacingErrorPatternLabelHe(raw);
  if (mapped) return mapped;

  const tagKey = raw.toLowerCase();
  const taxonomyId = TAG_TO_TAXONOMY_ID.get(tagKey);
  if (taxonomyId && TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId]) {
    return TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId];
  }
  if (taxonomyId && TAXONOMY_BY_ID[taxonomyId]?.patternHe) {
    const patternHe = String(TAXONOMY_BY_ID[taxonomyId].patternHe).trim();
    const parentFromId = TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId];
    if (parentFromId) return parentFromId;
    if (/[\u0590-\u05FF]/.test(patternHe)) return patternHe;
    const fromLiteral = RAW_PATTERN_LITERAL_PARENT_HE[patternHe.toLowerCase()];
    if (fromLiteral) return fromLiteral;
  }

  if (isTechnicalEnglishPatternKey(raw)) return "";
  return raw;
}

/**
 * @param {string|null|undefined} label
 * @returns {string}
 */
export function sanitizeParentPatternLabel(label) {
  return resolveParentPatternLabelForDisplay(label);
}

export { resolveParentFacingPatternLabelHe };
