/**
 * Topic options for parent worksheet hub — core four subjects only.
 * @module lib/worksheets/worksheet-topic-options
 */

import { topicOptionsForSubject } from "../teacher-portal/teacher-class-topic-options.js";
import { listGeometryTopicsForGrade } from "./worksheet-geometry-allowlist.js";
import { GRADES as GEOMETRY_GRADES, TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";
import { GRADES as HEBREW_GRADES } from "../../utils/hebrew-constants.js";
import { ENGLISH_GRADES } from "../../data/english-curriculum.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/**
 * Grade has mixed + at least two other worksheet topic slots.
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @param {{ key: string }[]} nonMixedTopics
 */
function canExposeWorksheetMixed(subjectId, gradeKey, nonMixedTopics) {
  if (nonMixedTopics.length < 2) return false;
  if (subjectId === "math") {
    return (MATH_GRADES[gradeKey]?.operations || []).includes("mixed");
  }
  if (subjectId === "hebrew") {
    return (HEBREW_GRADES[gradeKey]?.topics || []).includes("mixed");
  }
  if (subjectId === "english") {
    return (ENGLISH_GRADES[gradeKey]?.topics || []).includes("mixed");
  }
  if (subjectId === "geometry") {
    return (GEOMETRY_GRADES[gradeKey]?.topics || []).includes("mixed");
  }
  return false;
}

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @returns {{ key: string, label: string }[]}
 */
export function worksheetTopicOptionsForGrade(subjectId, gradeKey) {
  if (subjectId === "geometry") {
    const topics = listGeometryTopicsForGrade(gradeKey)
      .filter((key) => key !== "mixed")
      .map((key) => ({
        key,
        label: GEOMETRY_TOPICS[key]?.name || key,
      }));
    if (canExposeWorksheetMixed(subjectId, gradeKey, topics)) {
      topics.push({ key: "mixed", label: "תרגול מעורב" });
    }
    return topics;
  }

  const topics = topicOptionsForSubject(subjectId, gradeKey).filter(
    ({ key }) => key !== "mixed"
  );

  // Math / Hebrew / English: expose “תרגול מעורב” when ≥2 concrete topics exist.
  if (
    (subjectId === "math" || subjectId === "hebrew" || subjectId === "english") &&
    canExposeWorksheetMixed(subjectId, gradeKey, topics)
  ) {
    topics.push({ key: "mixed", label: "תרגול מעורב" });
  }

  return topics;
}

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @returns {string}
 */
export function defaultWorksheetTopicForGrade(subjectId, gradeKey) {
  const opts = worksheetTopicOptionsForGrade(subjectId, gradeKey);
  return opts[0]?.key || "";
}
