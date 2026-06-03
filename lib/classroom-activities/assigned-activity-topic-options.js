/**
 * Topic options for parent/teacher assigned-activity selectors only.
 * Learning master, books, and discussion pickers use teacher-class-topic-options.js unchanged.
 */
import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import {
  defaultTopicForSubject,
  topicOptionsForSubject,
} from "../teacher-portal/teacher-class-topic-options.js";

/** @param {string} gradeKey */
function gradeNumberFromKey(gradeKey) {
  const canonical = resolveCanonicalGradeKey(gradeKey);
  const m = String(canonical || "").match(/^g([1-6])$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Whether a curriculum topic is hidden from assigned-activity UI (not from learning).
 * @param {string} subjectKey
 * @param {string} gradeKey
 * @param {string} topicKey
 */
export function isTopicHiddenFromAssignedActivity(subjectKey, gradeKey, topicKey) {
  const gradeNum = gradeNumberFromKey(gradeKey);
  if (gradeNum == null) return false;

  if (subjectKey === "hebrew") {
    if (topicKey !== "writing" && topicKey !== "speaking") return false;
    return gradeNum >= 3;
  }

  if (subjectKey === "english") {
    if (topicKey !== "writing") return false;
    return gradeNum >= 2;
  }

  return false;
}

/**
 * @param {string} subjectKey
 * @param {string} gradeKey
 */
export function topicOptionsForAssignedActivity(subjectKey, gradeKey) {
  return topicOptionsForSubject(subjectKey, gradeKey).filter(
    ({ key }) => !isTopicHiddenFromAssignedActivity(subjectKey, gradeKey, key)
  );
}

/**
 * @param {string} subjectKey
 * @param {string} gradeKey
 */
export function defaultTopicForAssignedActivity(subjectKey, gradeKey) {
  const opts = topicOptionsForAssignedActivity(subjectKey, gradeKey);
  if (subjectKey === "math") return opts[0]?.key || "addition";
  if (subjectKey === "moledet_geography") return opts[0]?.key || "";
  return opts[0]?.key || defaultTopicForSubject(subjectKey, gradeKey);
}
