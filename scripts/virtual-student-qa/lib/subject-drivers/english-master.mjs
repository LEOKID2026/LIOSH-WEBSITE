/**
 * English master driver — Phase C.
 *
 * Thin wrapper around the generic MCQ subject driver. English uses the
 *   english-player-name / english-topic-select / english-start-game /
 *   english-mcq-${idx}
 * testids. Profile correctness comes from the React-fiber probe of
 * `currentQuestion.correctAnswer` matched against the visible MCQ labels.
 */
import { makeMcqSubjectDriver } from "./mcq-subject-driver.mjs";

export const runEnglishScenario = makeMcqSubjectDriver({
  subject: "english",
  subjectLabel: "english-master",
  path: "/learning/english-master",
});
