import { topicOptionsForAssignedActivity } from "../../classroom-activities/assigned-activity-topic-options.js";
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { DEMO_PARENT_SUBJECTS } from "./constants.js";

/**
 * @param {string} gradeLevel e.g. grade_2
 * @param {string} subjectKey
 */
export function demoTopicOptionsForChild(gradeLevel, subjectKey) {
  const gradeKey = normalizeGradeLevelToKey(gradeLevel) || "g2";
  if (!DEMO_PARENT_SUBJECTS.includes(subjectKey)) return [];
  return topicOptionsForAssignedActivity(subjectKey, gradeKey);
}

/**
 * @param {string} gradeLevel
 * @param {string} subjectKey
 * @param {() => number} rnd
 */
export function pickDemoTopicKey(gradeLevel, subjectKey, rnd) {
  const opts = demoTopicOptionsForChild(gradeLevel, subjectKey);
  if (!opts.length) return "general";
  return opts[Math.floor(rnd() * opts.length)].key;
}

/**
 * @param {string} gradeLevel
 * @param {string} subjectKey
 * @param {string} topicKey
 */
export function resolveDemoTopicLabelHe(gradeLevel, subjectKey, topicKey) {
  const opts = demoTopicOptionsForChild(gradeLevel, subjectKey);
  const hit = opts.find((o) => o.key === topicKey);
  return hit?.label || topicKey;
}
