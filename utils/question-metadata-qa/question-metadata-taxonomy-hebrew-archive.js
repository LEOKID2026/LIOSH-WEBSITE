/**
 * Taxonomy for parallel Hebrew archive banks (`data/hebrew-questions/g*.js`).
 * Skill ids encode MCQ domain; subskills encode grade band (g1–g6).
 */

/** Category segment keys inside each export object (reading, grammar, …). */
export const HEBREW_ARCHIVE_CATEGORY_KEYS = [
  "reading",
  "comprehension",
  "grammar",
  "vocabulary",
  "writing",
  "speaking",
];

export const HEBREW_ARCHIVE_SKILL_IDS = new Set([
  ...HEBREW_ARCHIVE_CATEGORY_KEYS.map((c) => `hebrew_archive_${c}`),
  /** G3 reading bank import (`data/hebrew-questions/g3.js`) — grade-scoped diagnostic skill id */
  "hebrew_reading_g3",
]);

export const HEBREW_ARCHIVE_GRADE_SUBSKILL_IDS = new Set(["g1", "g2", "g3", "g4", "g5", "g6"]);

/** @returns {Record<string, Set<string>>} */
export function buildHebrewArchiveSubskillAllowlistBySkill() {
  /** @type {Record<string, Set<string>>} */
  const m = {};
  for (const s of HEBREW_ARCHIVE_SKILL_IDS) {
    m[s] = new Set(HEBREW_ARCHIVE_GRADE_SUBSKILL_IDS);
  }
  m.hebrew_reading_g3 = new Set(["g3"]);
  return m;
}

export const HEBREW_ARCHIVE_SUBSKILL_ALLOWLIST_BY_SKILL = buildHebrewArchiveSubskillAllowlistBySkill();

/**
 * @param {string} exportName e.g. G3_MEDIUM_QUESTIONS
 * @returns {{ grade: number, band: "easy"|"medium"|"hard" } | null}
 */
export function parseHebrewArchiveExportName(exportName) {
  const m = String(exportName).match(/^G(\d)_(EASY|MEDIUM|HARD)_QUESTIONS$/);
  if (!m) return null;
  return { grade: Number(m[1]), band: /** @type {"easy"|"medium"|"hard"} */ (m[2].toLowerCase()) };
}

/**
 * @param {"easy"|"medium"|"hard"} band
 */
export function mapHebrewArchiveBandToDifficulty(band) {
  if (band === "easy") return "basic";
  if (band === "medium") return "standard";
  return "advanced";
}

/**
 * @param {string} category e.g. reading
 */
export function hebrewArchiveCategoryToSkillId(category) {
  const c = String(category).toLowerCase();
  if (!HEBREW_ARCHIVE_CATEGORY_KEYS.includes(c)) return "";
  return `hebrew_archive_${c}`;
}

/**
 * @param {string} objectPath e.g. G1_EASY_QUESTIONS.reading[3]
 * @returns {{ exportName: string, category: string, index: number } | null}
 */
export function parseHebrewArchiveObjectPath(objectPath) {
  const m = String(objectPath).match(/^([A-Z0-9_]+)\.([a-zA-Z0-9_]+)\[(\d+)\]$/);
  if (!m) return null;
  return { exportName: m[1], category: m[2], index: Number(m[3]) };
}

/**
 * @param {string} relPath e.g. data/hebrew-questions/g3.js
 * @returns {number | null}
 */
export function parseGradeFromHebrewArchiveFile(relPath) {
  const m = String(relPath).match(/g(\d)\.js$/i);
  return m ? Number(m[1]) : null;
}

/**
 * @param {string} category
 * @param {string} questionText
 */
export function inferHebrewArchiveCognitiveLevel(category, questionText) {
  const q = String(questionText || "");
  const longPassage = q.length > 140 || q.includes("קרא את הטקסט");
  if (category === "comprehension") {
    if (longPassage && (q.includes("מה הנושא") || q.includes("מה המסר") || q.includes("כמה ")))
      return "analysis";
    return "understanding";
  }
  if (category === "reading") return longPassage ? "understanding" : "recall";
  if (category === "grammar") return "understanding";
  if (category === "vocabulary") return "recall";
  if (category === "writing" || category === "speaking") return "application";
  return "understanding";
}

/**
 * @param {string} category
 * @param {string} questionText
 * @returns {string[]}
 */
export function inferHebrewArchiveExpectedErrorTypes(category, questionText) {
  const q = String(questionText || "");
  const longPassage = q.length > 140 || q.includes("קרא את הטקסט");
  /** @type {string[]} */
  const out = [];
  if (category === "reading") {
    out.push("vocabulary_confusion", "careless_error");
    if (longPassage) out.push("reading_comprehension_error", "detail_recall_error");
  } else if (category === "comprehension") {
    out.push("reading_comprehension_error", "inference_error", "detail_recall_error", "comprehension_gap");
  } else if (category === "grammar") {
    out.push("grammar_error", "careless_error");
  } else if (category === "vocabulary") {
    out.push("vocabulary_confusion", "careless_error");
  } else if (category === "writing") {
    out.push("grammar_error", "careless_error", "incomplete_answer");
  } else if (category === "speaking") {
    out.push("vocabulary_confusion", "careless_error");
  } else {
    out.push("careless_error", "comprehension_gap");
  }
  return [...new Set(out)].filter(Boolean);
}

/**
 * @param {object} record
 * @param {{ ids: string[], confidence: string, reason: string }} prereq
 */
export function classifyHebrewArchiveConfidenceAndReview(record, prereq) {
  const okPath = !!String(record?.objectPath || "").match(
    /^[A-Z0-9_]+\.[a-zA-Z0-9_]+\[\d+\]$/
  );
  const reasons = ["Path-based domain and grade are explicit in file + export + category."];
  if (prereq?.ids?.length) reasons.push(prereq.reason);
  if (okPath) {
    return { confidence: "high", reviewPriority: "low", confidenceReasons: reasons };
  }
  return { confidence: "low", reviewPriority: "high", confidenceReasons: ["Could not validate objectPath pattern."] };
}

/**
 * @returns {{ ids: string[], confidence: "low", reason: string }}
 */
export function suggestHebrewArchivePrerequisites() {
  return {
    ids: [],
    confidence: "low",
    reason: "Hebrew archive fast-track: skip automated prerequisite graph; grade is encoded in subtype.",
  };
}
