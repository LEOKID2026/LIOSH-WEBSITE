/**
 * Static + export-based question bank modules to scan (relative to repo root).
 * Procedural-only generators are listed separately — no static rows scanned here.
 */

/** @type {{ path: string, subjectId: string, note?: string }[]} */
export const STATIC_QUESTION_BANK_MODULES = [
  { path: "data/science-questions.js", subjectId: "science", note: "SCIENCE_QUESTIONS (includes phase3 merge)" },
  { path: "utils/hebrew-rich-question-bank.js", subjectId: "hebrew", note: "HEBREW_RICH_POOL" },
  { path: "data/english-questions/grammar-pools.js", subjectId: "english", note: "GRAMMAR_POOLS" },
  { path: "data/english-questions/translation-pools.js", subjectId: "english", note: "TRANSLATION_POOLS" },
  { path: "data/english-questions/sentence-pools.js", subjectId: "english", note: "SENTENCE_POOLS" },
  { path: "data/geography-questions/g1.js", subjectId: "moledet-geography", note: "per-grade buckets" },
  { path: "data/geography-questions/g2.js", subjectId: "moledet-geography" },
  { path: "data/geography-questions/g3.js", subjectId: "moledet-geography" },
  { path: "data/geography-questions/g4.js", subjectId: "moledet-geography" },
  { path: "data/geography-questions/g5.js", subjectId: "moledet-geography" },
  { path: "data/geography-questions/g6.js", subjectId: "moledet-geography" },
  { path: "data/hebrew-questions/g1.js", subjectId: "hebrew-archive", note: "archive parallel bank - see file header" },
  { path: "data/hebrew-questions/g2.js", subjectId: "hebrew-archive" },
  { path: "data/hebrew-questions/g3.js", subjectId: "hebrew-archive" },
  { path: "data/hebrew-questions/g4.js", subjectId: "hebrew-archive" },
  { path: "data/hebrew-questions/g5.js", subjectId: "hebrew-archive" },
  { path: "data/hebrew-questions/g6.js", subjectId: "hebrew-archive" },
];

/** Conceptual geometry bank rows (templates), not procedural generator output */
export const GEOMETRY_CONCEPTUAL_BANK = {
  path: "utils/geometry-conceptual-bank.js",
  subjectId: "geometry",
  exportName: "GEOMETRY_CONCEPTUAL_ITEMS",
  note: "Template rows for conceptual MCQ - scanned as static metadata carriers",
};

/**
 * Runtime / procedural generators — documented for coverage report; not enumerated as static rows.
 * @type {{ path: string, subjectId: string, note: string }[]}
 */
export const PROCEDURAL_QUESTION_SOURCES = [
  {
    path: "utils/math-question-generator.js",
    subjectId: "math",
    note: "Procedural math items - metadata assigned at generation time",
  },
  {
    path: "utils/geometry-question-generator.js",
    subjectId: "geometry",
    note: "Procedural geometry - use geometry-conceptual-bank + generator params",
  },
  {
    path: "utils/hebrew-question-generator.js",
    subjectId: "hebrew",
    note: "Live Hebrew MCQ merge (legacy + rich pool) - large module",
  },
  {
    path: "utils/moledet-geography-question-generator.js",
    subjectId: "moledet-geography",
    note: "Optional procedural geography wrapper",
  },
];
