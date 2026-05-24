/**
 * Subject rotation + per-grade topic selection for teacher classroom simulation.
 */
import { GRADES as MATH_GRADES } from "../../../utils/math-constants.js";
import { GRADES as GEOMETRY_GRADES } from "../../../utils/geometry-constants.js";
import { GRADES as HEBREW_GRADES } from "../../../utils/hebrew-constants.js";
import { GRADES as MOLEDET_GRADES } from "../../../utils/moledet-geography-constants.js";
import { CANONICAL_SUBJECT_BUCKETS } from "../../../utils/dev-student-simulator/canonical-topic-keys.js";
import { SUBJECT_ROTATION, gradeNumber } from "./config.mjs";

const FNV1A_OFFSET = 2166136261;
const FNV1A_PRIME = 16777619;

function fnv1a32(str) {
  let h = FNV1A_OFFSET >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME) >>> 0;
  }
  return h >>> 0;
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isSubjectAvailableForGrade(subject, gradeKey) {
  const g = gradeNumber(gradeKey);
  if (subject === "moledet-geography") return g >= 3;
  return g >= 1 && g <= 6;
}

export function subjectsForGrade(gradeKey) {
  return SUBJECT_ROTATION.filter((s) => isSubjectAvailableForGrade(s, gradeKey));
}

export function resolveSubjectForRun({ grade, date, subjectOverride }) {
  if (subjectOverride) {
    if (!isSubjectAvailableForGrade(subjectOverride, grade)) {
      throw new Error(`Subject ${subjectOverride} is not available for grade ${grade}`);
    }
    return subjectOverride;
  }
  const pool = subjectsForGrade(grade);
  const dayIndex = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
  return pool[((dayIndex % pool.length) + pool.length) % pool.length];
}

/** Math operations that work with virtual-student-qa math-master text-input driver. */
const MATH_DRIVER_SAFE_OPS = new Set([
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "division_with_remainder",
  "word_problems",
  "fractions",
  "decimals",
  "sequences",
  "order_of_operations",
  "number_sense",
]);

export function topicsForSubjectGrade(subject, gradeKey) {
  switch (subject) {
    case "math": {
      const ops = MATH_GRADES[gradeKey]?.operations || MATH_GRADES.g3.operations;
      return ops.filter((op) => MATH_DRIVER_SAFE_OPS.has(op) && op !== "mixed");
    }
    case "geometry":
      return [...(GEOMETRY_GRADES[gradeKey]?.topics || GEOMETRY_GRADES.g3.topics)];
    case "hebrew":
      return [...(HEBREW_GRADES[gradeKey]?.topics || HEBREW_GRADES.g3.topics)];
    case "moledet-geography":
      return [...(MOLEDET_GRADES[gradeKey]?.topics || MOLEDET_GRADES.g3.topics)];
    case "english":
      return [...CANONICAL_SUBJECT_BUCKETS.english].filter((t) => t !== "mixed");
    case "science":
      return [...CANONICAL_SUBJECT_BUCKETS.science].filter((t) => t !== "mixed");
    default:
      return ["general"];
  }
}

export function pickTopicsForDay({ subject, grade, date, count }) {
  const all = topicsForSubjectGrade(subject, grade).filter((t) => t !== "mixed");
  if (all.length === 0) return ["general"];
  const seed = fnv1a32(`${date}|${grade}|${subject}|topics`);
  const rng = makeRng(seed);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const want = Math.min(count, shuffled.length);
  return shuffled.slice(0, want);
}
