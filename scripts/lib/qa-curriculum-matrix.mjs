/**
 * Curriculum-aligned matrix for QA (NOT_APPLICABLE vs CRITICAL).
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { GRADES: MATH_GRADES } = await import(href("utils/math-constants.js"));
const { GRADES: GEO_GRADES } = await import(href("utils/geometry-constants.js"));
const { GRADES: HEBREW_GRADES } = await import(href("utils/hebrew-constants.js"));
const { GRADES: MOLEDET_GRADES } = await import(href("utils/moledet-geography-constants.js"));
const { SCIENCE_GRADES } = await import(href("data/science-curriculum.js"));
const { HISTORY_GRADES } = await import(href("data/history-curriculum.js"));

const ENGLISH_TOPICS = ["grammar", "vocabulary", "translation", "sentences", "writing"];

const SKIP_MATRIX_TOPICS = new Set(["mixed"]);

/** @param {string} subject @param {string} grade */
export function curriculumTopicsFor(subject, grade) {
  const g = String(grade || "");
  let list = [];
  switch (subject) {
    case "math":
      list = MATH_GRADES[g]?.operations || [];
      break;
    case "geometry":
      list = GEO_GRADES[g]?.topics || [];
      break;
    case "hebrew":
      list = HEBREW_GRADES[g]?.topics || [];
      break;
    case "moledet_geography":
      list = MOLEDET_GRADES[g]?.topics || [];
      break;
    case "science":
      list = SCIENCE_GRADES[g]?.topics || [];
      break;
    case "history":
      list = HISTORY_GRADES[g]?.topics || [];
      break;
    case "english":
      list = g === "g1" ? ["grammar", "vocabulary", "sentences"] : ENGLISH_TOPICS;
      break;
    default:
      list = [];
  }
  return list.filter((t) => !SKIP_MATRIX_TOPICS.has(t));
}

/** @param {string} subject @param {string} grade @param {string} topic */
export function isCurriculumCell(subject, grade, topic) {
  return curriculumTopicsFor(subject, grade).includes(topic);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 * @param {number} sampleCount
 */
export function classifyInventoryCell(subject, grade, topic, sampleCount) {
  if (!isCurriculumCell(subject, grade, topic)) {
    return {
      status: "NOT_APPLICABLE",
      reason: `topic "${topic}" not in ${grade} curriculum`,
    };
  }
  if (sampleCount === 0) {
    return { status: "CRITICAL", reason: "generator/adapter returned 0 samples" };
  }
  if (sampleCount < 3) {
    return { status: "THIN", reason: `only ${sampleCount} samples in audit probe` };
  }
  return { status: "OK", reason: "adequate probe samples" };
}
