/**
 * Deep sanitization for parent-facing report API / HTML / PDF payloads.
 * Removes internal diagnostic metadata keys that must never reach clients.
 *
 * Structural identifier fields (questionId, answerId, …) are NEVER nulled by
 * taxonomy-content regex — DE2 / pattern-evidence-gate need the real DB ids.
 * Public scrubbing must not destroy forensic evidence used before/during engine runs.
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

/**
 * Structural / forensic identifier keys — preserve string values even when they
 * embed taxonomy-like tokens (e.g. questionId with canonicalMetadata skillId math_add_two).
 */
export const STRUCTURAL_EVIDENCE_ID_KEYS = new Set([
  "questionId",
  "questionLabel",
  "answerId",
  "sourceAnswerId",
  "sessionId",
  "learningSessionId",
  "learning_session_id",
  "question_id",
  "questionFingerprint",
]);

/** Internal taxonomy / engine id strings that must not appear in parent-facing values. */
const INTERNAL_TAXONOMY_VALUE_RES =
  /\b(?:english:phonics:[a-z0-9_:]+|english:pool:[a-z0-9_:]+|english:grammar:[a-z0-9_:]+|english:vocabulary:[a-z0-9_:]+|math_[a-z0-9_]+|frac_[a-z0-9_]+)\b/i;

/**
 * @param {unknown} value
 * @param {string|null|undefined} [fieldKey]
 * @returns {unknown}
 */
function sanitizePublicReportValue(value, fieldKey = null) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (fieldKey && STRUCTURAL_EVIDENCE_ID_KEYS.has(fieldKey)) return value;
    if (INTERNAL_TAXONOMY_VALUE_RES.test(value)) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizePublicReportValue(item, fieldKey))
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
 * @param {string|null|undefined} [fieldKey]
 */
function scrubZeroEvidencePhrases(value, fieldKey = null) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (fieldKey && STRUCTURAL_EVIDENCE_ID_KEYS.has(fieldKey)) return value;
    for (const re of ZERO_EVIDENCE_FORBIDDEN_PHRASE_RES) {
      if (re.test(value)) return null;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => scrubZeroEvidencePhrases(item, fieldKey))
      .filter((item) => item != null && item !== "");
  }
  if (typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (ZERO_EVIDENCE_PUBLIC_REPORT_KEYS.has(key)) continue;
      const next = scrubZeroEvidencePhrases(child, key);
      if (next == null) continue;
      out[key] = next;
    }
    return out;
  }
  return value;
}

/**
 * Strip internal metadata keys from one diagnostic/recent mistake row without
 * applying taxonomy-value regex to forensic string fields (questionId, …).
 * Used so DE2 can run on API payloads after public sanitize of the rest.
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {Record<string, unknown>|null|undefined}
 */
export function stripInternalKeysFromEvidenceRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (INTERNAL_PARENT_REPORT_KEYS.has(key)) continue;
    if (key === "_canonicalMeta") continue;
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripInternalKeysFromEvidenceRow(/** @type {Record<string, unknown>} */ (value));
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? stripInternalKeysFromEvidenceRow(/** @type {Record<string, unknown>} */ (item))
          : item,
      );
      continue;
    }
    // Preserve structural id strings and all other scalars as-is (no taxonomy nulling).
    out[key] = value;
  }
  return out;
}

/**
 * Recursively remove internal-only keys from a report payload subtree.
 * @param {unknown} node
 * @param {string|null|undefined} [fieldKey] parent object key when descending
 * @returns {unknown}
 */
export function deepStripInternalReportKeys(node, fieldKey = null) {
  if (node == null || typeof node !== "object") {
    return typeof node === "string" ? sanitizePublicReportValue(node, fieldKey) : node;
  }

  if (Array.isArray(node)) {
    return node
      .map((item) => deepStripInternalReportKeys(item, fieldKey))
      .filter((item) => item != null);
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (INTERNAL_PARENT_REPORT_KEYS.has(key)) continue;
    if (ZERO_EVIDENCE_PUBLIC_REPORT_KEYS.has(key)) continue;
    const cleaned = deepStripInternalReportKeys(value, key);
    if (cleaned == null) continue;
    out[key] = cleaned;
  }
  return out;
}

/**
 * Scan serialized public payload for known internal leak patterns (QA / tests).
 * Structural evidence ids may legally contain skill-like tokens; this scan is for
 * explicit metadata key leaks and bare taxonomy ids in parent-facing prose paths.
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
