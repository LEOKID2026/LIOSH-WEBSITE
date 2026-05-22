/**
 * Science master driver — Phase C.
 *
 * Thin wrapper around the generic MCQ subject driver. Science uses the
 *   science-player-name / science-topic-select / science-start-game /
 *   science-mcq-${idx}
 * testids. Science questions store correctIndex (number) instead of
 * correctAnswer (string); the fiber probe handles both shapes and resolves
 * the correct DOM index by matching options[correctIndex] against the
 * visible MCQ button labels.
 */
import { makeMcqSubjectDriver } from "./mcq-subject-driver.mjs";

export const runScienceScenario = makeMcqSubjectDriver({
  subject: "science",
  subjectLabel: "science-master",
  path: "/learning/science-master",
});
