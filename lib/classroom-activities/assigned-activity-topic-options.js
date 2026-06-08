/**
 * Topic options for parent/teacher assigned-activity selectors only.
 * Learning master, books, and discussion pickers use teacher-class-topic-options.js unchanged.
 */
import { LAUNCH_SURFACES } from "../launch-readiness/launch-surfaces.js";
import { isTopicAllowedOnSurface } from "../launch-readiness/topic-launch-policy.js";
import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import {
  defaultTopicForSubject,
  topicOptionsForSubject,
} from "../teacher-portal/teacher-class-topic-options.js";

/**
 * Whether a curriculum topic is hidden from assigned-activity UI (central launch policy).
 * @param {string} subjectKey
 * @param {string} gradeKey
 * @param {string} topicKey
 */
export function isTopicHiddenFromAssignedActivity(subjectKey, gradeKey, topicKey) {
  return !isTopicAllowedOnSurface(
    subjectKey,
    gradeKey,
    topicKey,
    LAUNCH_SURFACES.PARENT_ASSIGN
  );
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
