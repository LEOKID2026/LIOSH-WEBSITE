/**
 * Parent-facing raw key / engine jargon blacklist (E3 MVP).
 *
 * Used to scan extracted parent-report TEXT only — never Hebrew UI labels.
 * Patterns target internal snake_case identifiers, taxonomy keys, and engine
 * tokens that must not appear in a parent-facing report body.
 */

/** Tokens that indicate a raw internal key leaked into parent UI text. */
export const RAW_KEY_TOKENS = [
  // English taxonomy / bucket keys
  "reading_comprehension",
  "grammar",
  "vocabulary",
  "translation",
  "sentences",
  "writing",
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "fractions",
  "decimals",
  "percentages",
  "word_problems",
  "order_of_operations",
  "factors_multiples",
  "division_with_remainder",
  "earth_space",
  "experiments",
  "materials",
  "animals",
  "plants",
  // Internal id prefixes (product topic codes)
  "m04_",
  "e03_",
  "h04_",
  "mg_",
  // Engine / schema field names
  "confidence_level",
  "unit_key",
  "subjectId",
  "topicKey",
  "bucketKey",
  "topic_key",
  "operation_id",
  "diagnosticEngineV2",
  "diagnostic_engine_v2",
  "parent-report-v2",
  "learning_profile",
  "weaknessSubject",
];

/** Engine / QA jargon that must not appear in parent-facing copy. */
export const ENGINE_JARGON_TOKENS = [
  "diagnosticEngineV2",
  "diagnostic_engine_v2",
  "canonical-topic-keys",
  "tier1Counts",
  "sessionId",
  "playerName",
  "personaKind",
  "cli-filter",
  "virtual-student",
  "bleedOk",
  "ownDeltaOk",
  "snapshotDelta",
  "bucketKey",
  "topic_key",
  "unit_key",
  "subjectId",
  "confidence_level",
];

/**
 * Scan text for blacklist tokens. Returns unique matches with context.
 * Skips matches inside URLs or UUIDs to reduce false positives.
 *
 * @param {string} text
 * @param {string[]} tokens
 * @returns {{ token: string, context: string }[]}
 */
export function scanTextForTokens(text, tokens) {
  if (!text || typeof text !== "string") return [];
  const haystack = text;
  const found = [];

  for (const token of tokens) {
    if (!token) continue;
    const idx = haystack.indexOf(token);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 30);
    const end = Math.min(haystack.length, idx + token.length + 30);
    found.push({
      token,
      context: haystack.slice(start, end).replace(/\s+/g, " ").trim(),
    });
  }

  // Deduplicate by token
  const seen = new Set();
  return found.filter((m) => {
    if (seen.has(m.token)) return false;
    seen.add(m.token);
    return true;
  });
}

/**
 * Run both raw-key and engine-jargon scans on report text.
 *
 * @param {string} text
 * @returns {{ rawKeys: object[], engineJargon: object[] }}
 */
export function scanParentReportText(text) {
  return {
    rawKeys: scanTextForTokens(text, RAW_KEY_TOKENS),
    engineJargon: scanTextForTokens(text, ENGINE_JARGON_TOKENS),
  };
}
