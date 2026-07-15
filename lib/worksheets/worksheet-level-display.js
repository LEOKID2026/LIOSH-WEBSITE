/**
 * Parent-facing worksheet levels — רגיל / מתקדם only (no קל/בינוני/קשה in UI).
 * @module lib/worksheets/worksheet-level-display
 */

export const WORKSHEET_PUBLIC_LEVEL_KEYS = /** @type {const} */ (["regular", "advanced"]);

/** @typedef {"regular" | "advanced"} WorksheetPublicLevelKey */

export const WORKSHEET_LEVEL_OPTIONS = [
  { key: "regular", labelHe: "רגיל" },
  { key: "advanced", labelHe: "מתקדם" },
];

/** Hebrew labels forbidden in parent-facing worksheet UI/payload. */
export const WORKSHEET_FORBIDDEN_PUBLIC_LEVEL_LABELS = [
  "קל",
  "בינוני",
  "קשה",
  "easy",
  "medium",
  "hard",
];

/**
 * @param {string} levelKey
 * @returns {levelKey is WorksheetPublicLevelKey}
 */
export function isWorksheetPublicLevelKey(levelKey) {
  return levelKey === "regular" || levelKey === "advanced";
}

/**
 * @param {string} levelKey
 * @returns {string}
 */
export function worksheetPublicLevelLabelHe(levelKey) {
  const opt = WORKSHEET_LEVEL_OPTIONS.find((l) => l.key === levelKey);
  return opt?.labelHe || "-";
}

/**
 * @param {string} hay
 * @param {string} word
 */
function containsHebrewLevelWord(hay, word) {
  const re = new RegExp(`(^|[\\s,.:;"'\\--<>]|labelHe:\\s*["'])${word}($|[\\s,.:;"'\\--<>])`, "u");
  return re.test(hay);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenPublicLevelLabels(text) {
  const hay = String(text || "");
  /** @type {string[]} */
  const hits = [];

  for (const label of ["קל", "בינוני", "קשה"]) {
    if (containsHebrewLevelWord(hay, label)) hits.push(label);
  }

  for (const key of ["easy", "medium", "hard"]) {
    const quoted = new RegExp(`["']${key}["']`, "u");
    const levelAssign = new RegExp(`levelKey:\\s*["']${key}["']`, "u");
    if (quoted.test(hay) || levelAssign.test(hay)) hits.push(key);
  }

  return [...new Set(hits)];
}

/**
 * Audit only public payload meta - question body may contain Hebrew words like "קשה".
 * @param {{ meta?: Record<string, unknown> } | null | undefined} pub
 * @returns {string[]}
 */
export function auditPublicPayloadMetaForForbiddenLevelLabels(pub) {
  const meta = pub?.meta;
  if (!meta || typeof meta !== "object") return [];
  return findForbiddenPublicLevelLabels(JSON.stringify(meta));
}
