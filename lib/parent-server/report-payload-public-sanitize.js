/**
 * Deep sanitization for parent-facing report API / HTML / PDF payloads.
 * Removes internal diagnostic metadata keys that must never reach clients.
 */

/** Keys stripped at any depth in public report JSON. */
export const INTERNAL_PARENT_REPORT_KEYS = new Set([
  "_canonicalMeta",
  "_evidenceQuality",
  "appliedParentGating",
  "appliedParentPromotion",
  "bySubSkill",
  "diagnosticSkillId",
  "difficultyDepths",
  "errorPatterns",
  "gatingDecisions",
  "generatorKind",
  "groupingLevel",
  "metadataConfidence",
  "possibleErrorPatterns",
  "problemClasses",
  "promotionDecisions",
  "promotionValidation",
  "promotionValidationReasons",
  "questionTypes",
  "rejectedPromotionCandidates",
  "shadowParentGating",
  "skillId",
  "sourceBreakdown",
  "sourceDifficulty",
  "displayLevel",
  "regularInternalState",
  "scienceInternalState",
  "displayLevelKey",
  "_sourceDifficultyBreakdown",
  "subSkill",
  "supportingEvidenceIds",
  "validatedPromotionCandidates",
]);

/** Internal taxonomy / engine id strings that must not appear in parent-facing values. */
const INTERNAL_TAXONOMY_VALUE_RES =
  /\b(?:english:phonics:[a-z0-9_:]+|english:pool:[a-z0-9_:]+|english:grammar:[a-z0-9_:]+|english:vocabulary:[a-z0-9_:]+|math_[a-z0-9_]+|frac_[a-z0-9_]+)\b/i;

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sanitizePublicReportValue(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (INTERNAL_TAXONOMY_VALUE_RES.test(value)) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizePublicReportValue(item))
      .filter((item) => item != null);
  }
  if (typeof value === "object") {
    return deepStripInternalReportKeys(value);
  }
  return value;
}

/** Keys stripped from public parent report payloads (zero-evidence policy). */
export const ZERO_EVIDENCE_PUBLIC_REPORT_KEYS = new Set([
  "notPracticedSubjectsSummaryHe",
  "notPracticedSubjectsHe",
]);

const ZERO_EVIDENCE_FORBIDDEN_PHRASE_RES = [
  /לא\s*תורגל/u,
  /מקצועות\s+שלא\s+תורגל/u,
  /אין\s+מידע/u,
];

/**
 * Remove zero-evidence subject fields and forbidden phrases from public report payloads.
 * @param {unknown} node
 */
export function stripZeroEvidenceFromPublicReportPayload(node) {
  const cleaned = deepStripInternalReportKeys(node);
  return scrubZeroEvidencePhrases(cleaned);
}

/**
 * @param {unknown} value
 */
function scrubZeroEvidencePhrases(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    for (const re of ZERO_EVIDENCE_FORBIDDEN_PHRASE_RES) {
      if (re.test(value)) return null;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => scrubZeroEvidencePhrases(item))
      .filter((item) => item != null && item !== "");
  }
  if (typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (ZERO_EVIDENCE_PUBLIC_REPORT_KEYS.has(key)) continue;
      const next = scrubZeroEvidencePhrases(child);
      if (next == null) continue;
      out[key] = next;
    }
    return out;
  }
  return value;
}

/**
 * Recursively remove internal-only keys from a report payload subtree.
 * @param {unknown} node
 * @returns {unknown}
 */
export function deepStripInternalReportKeys(node) {
  if (node == null || typeof node !== "object") {
    return typeof node === "string" ? sanitizePublicReportValue(node) : node;
  }

  if (Array.isArray(node)) {
    return node
      .map((item) => deepStripInternalReportKeys(item))
      .filter((item) => item != null);
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (INTERNAL_PARENT_REPORT_KEYS.has(key)) continue;
    if (ZERO_EVIDENCE_PUBLIC_REPORT_KEYS.has(key)) continue;
    const cleaned = deepStripInternalReportKeys(value);
    if (cleaned == null) continue;
    out[key] = cleaned;
  }
  return out;
}

/**
 * Scan serialized public payload for known internal leak patterns (QA / tests).
 * @param {string} jsonText
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function scanPublicReportPayloadForInternalLeaks(jsonText) {
  const text = String(jsonText || "");
  /** @type {string[]} */
  const hits = [];
  if (/\bskillId\b/.test(text)) hits.push("skillId");
  if (/\bsubSkill\b/.test(text)) hits.push("subSkill");
  if (/\bbySubSkill\b/.test(text)) hits.push("bySubSkill");
  if (/\bgatingDecisions\b/.test(text)) hits.push("gatingDecisions");
  if (/\bpromotionDecisions\b/.test(text)) hits.push("promotionDecisions");
  if (/\bsupportingEvidenceIds\b/.test(text)) hits.push("supportingEvidenceIds");
  if (/_evidenceQuality/i.test(text)) hits.push("_evidenceQuality");
  if (/\benglish:phonics:[a-z0-9_:]+\b/i.test(text)) hits.push("english_phonics_taxonomy");
  return { pass: hits.length === 0, hits };
}
