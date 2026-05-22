/**
 * Moledet/Geography master driver — Phase C repair.
 *
 * Phase C originally recorded this subject as a verified BLOCKER because
 * pages/learning/moledet-geography-master.js was missing the canonical
 * {subject}-* testids the runner needs. The Phase C repair pass added the
 * non-visual testids without changing design / behaviour / Hebrew copy:
 *
 *   moledet-player-name
 *   moledet-grade-select
 *   moledet-topic-select
 *   moledet-start-game
 *   moledet-mcq-${idx}
 *   learning-stop-game
 *
 * With those in place the page shape now matches hebrew/english/science,
 * so we can drive it through the generic MCQ subject driver factory. The
 * factory's `subject` prefix is used purely for testid lookups; we pass
 * the short `moledet` prefix here to match what we added to the page,
 * while `subjectLabel` keeps the longer name for log/scenario reporting.
 */
import { makeMcqSubjectDriver } from "./mcq-subject-driver.mjs";

export const runMoledetGeographyScenario = makeMcqSubjectDriver({
  subject: "moledet",
  subjectLabel: "moledet-geography-master",
  path: "/learning/moledet-geography-master",
});
