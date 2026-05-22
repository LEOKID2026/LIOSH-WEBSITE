/**
 * Hebrew master driver — Phase C.
 *
 * Thin wrapper around the generic MCQ subject driver. Hebrew uses the
 *   hebrew-player-name / hebrew-topic-select / hebrew-start-game /
 *   hebrew-mcq-${idx} / hebrew-question-stem
 * testids; profile correctness comes from the React-fiber probe of
 * `currentQuestion.correctAnswer` matched against the visible MCQ labels.
 */
import { makeMcqSubjectDriver } from "./mcq-subject-driver.mjs";

export const runHebrewScenario = makeMcqSubjectDriver({
  subject: "hebrew",
  subjectLabel: "hebrew-master",
  path: "/learning/hebrew-master",
});
