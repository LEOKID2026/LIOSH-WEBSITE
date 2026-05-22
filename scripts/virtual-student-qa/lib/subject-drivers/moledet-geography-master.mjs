/**
 * Moledet / Geography master driver — Phase C BLOCKER stub.
 *
 * The `/learning/moledet-geography-master` page does NOT expose the same
 * stable testids the other subject pages use. As of this Phase C audit, a
 * full grep of the page only finds these testids:
 *
 *   moledet-question-stem
 *   student-question-lead
 *   student-question-body
 *
 * It is missing:
 *   moledet-player-name        (other subjects use {subject}-player-name)
 *   moledet-topic-select       (other subjects use {subject}-topic-select)
 *   moledet-grade-select       (math has math-grade-select)
 *   moledet-start-game         (other subjects use {subject}-start-game)
 *   moledet-mcq-${idx}         (Hebrew/English/Science use {subject}-mcq-…)
 *   learning-stop-game         (other subjects share this; moledet does not)
 *
 * Without those selectors the runner cannot reliably:
 *   1. wait for the player-name auto-population checkpoint,
 *   2. choose a topic deterministically,
 *   3. click "▶️ התחל" without falling back to brittle Hebrew-text matches,
 *   4. answer questions through the same MCQ probe + click flow,
 *   5. fire /api/learning/session/finish on a known stop affordance.
 *
 * Per the Phase C instruction "If selectors are unstable or missing, stop
 * and report a verified blocker for that subject. Do not change UI/testids
 * in this phase without approval", this driver intentionally throws a
 * MoledetGeographyBlockerError that the orchestrator records as BLOCKED in
 * the run summary. We do NOT fake activity for this subject.
 */

export class MoledetGeographyBlockerError extends Error {
  constructor() {
    super(
      "moledet-geography-master is BLOCKED for the Phase C runner: " +
        "stable testids for player-name, topic-select, start-game, MCQ options, " +
        "and stop-game are missing. Adding these testids requires product UI " +
        "approval (out of Phase C scope)."
    );
    this.name = "MoledetGeographyBlockerError";
    this.blockerKind = "missing-testids";
    this.missingTestids = [
      "moledet-player-name",
      "moledet-topic-select",
      "moledet-grade-select",
      "moledet-start-game",
      "moledet-mcq-${idx}",
      "learning-stop-game (on /learning/moledet-geography-master)",
    ];
    this.recommendedAction =
      "Open a separate change request to add the canonical {subject}-* testids " +
      "to pages/learning/moledet-geography-master.js (matching hebrew/english/" +
      "science) and re-run the Phase C suite. Do NOT add them as part of this phase.";
  }
}

export async function runMoledetGeographyScenario() {
  throw new MoledetGeographyBlockerError();
}
