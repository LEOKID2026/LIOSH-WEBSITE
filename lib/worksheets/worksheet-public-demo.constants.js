/**
 * Public demo worksheet generator — shared constants (client + server).
 * @module lib/worksheets/worksheet-public-demo.constants
 */

/** Fixed exercise count for public demo generator only. */
export const PUBLIC_DEMO_COUNT = 8;

/**
 * Grade-aware allowlist: one open topic per subject+grade.
 * @type {Record<string, Record<string, { topicKey: string, mathPracticeFormats?: string[] }>>}
 */
export const PUBLIC_DEMO_ALLOWED_BY_GRADE = {
  math: {
    g1: { topicKey: "addition", mathPracticeFormats: ["horizontal_add_sub"] },
    g2: {
      topicKey: "addition",
      mathPracticeFormats: ["horizontal_add_sub", "vertical_add_sub"],
    },
    g3: {
      topicKey: "addition",
      mathPracticeFormats: ["horizontal_add_sub", "vertical_add_sub"],
    },
    g4: {
      topicKey: "addition",
      mathPracticeFormats: ["horizontal_add_sub", "vertical_add_sub"],
    },
    g5: {
      topicKey: "addition",
      mathPracticeFormats: ["horizontal_add_sub", "vertical_add_sub"],
    },
    g6: {
      topicKey: "addition",
      mathPracticeFormats: ["horizontal_add_sub", "vertical_add_sub"],
    },
  },
  geometry: {
    g1: { topicKey: "shapes_basic" },
    g2: { topicKey: "area" },
    g3: { topicKey: "area" },
    g4: { topicKey: "area" },
    g5: { topicKey: "area" },
    g6: { topicKey: "area" },
  },
  hebrew: {
    g1: { topicKey: "reading" },
    g2: { topicKey: "reading" },
    g3: { topicKey: "comprehension" },
    g4: { topicKey: "comprehension" },
    g5: { topicKey: "comprehension" },
    g6: { topicKey: "comprehension" },
  },
  english: {
    g1: { topicKey: "phonics" },
    g2: { topicKey: "vocabulary" },
    g3: { topicKey: "vocabulary" },
    g4: { topicKey: "vocabulary" },
    g5: { topicKey: "vocabulary" },
    g6: { topicKey: "vocabulary" },
  },
};

/**
 * @param {string} subjectId
 * @param {string} gradeKey
 * @returns {{ topicKey: string, mathPracticeFormats?: string[] } | null}
 */
export function getPublicDemoAllowlistEntry(subjectId, gradeKey) {
  const subject = PUBLIC_DEMO_ALLOWED_BY_GRADE[String(subjectId || "").trim()];
  if (!subject) return null;
  return subject[String(gradeKey || "").trim()] || null;
}

/**
 * @param {string} subjectId
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {boolean}
 */
export function isPublicDemoTopicAllowed(subjectId, gradeKey, topicKey) {
  const entry = getPublicDemoAllowlistEntry(subjectId, gradeKey);
  if (!entry) return false;
  return entry.topicKey === String(topicKey || "").trim();
}
