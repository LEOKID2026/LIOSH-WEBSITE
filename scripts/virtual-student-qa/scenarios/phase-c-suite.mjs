/**
 * Phase C scenario suite — multi-subject, profile-controlled.
 *
 * Goals (from the Phase C user spec):
 *   1. Cover all 6 subjects:
 *        math, geometry, hebrew, english, science, moledet/geography.
 *   2. Verify the answer profiles actually differentiate behaviour:
 *        - strong   ≈ mostly correct
 *        - average  ≈ mixed correct/wrong
 *        - weak     ≈ mostly wrong
 *        - targeted ≈ repeated mistakes inside the weakness topic
 *      where the subject's UI exposes a reliable "correctAnswer".
 *   3. Per-scenario baseline/delta evidence against the parent report.
 *
 * Why the "math has every profile" weighting:
 *   Math has the most reliable profile-control surface in the product
 *   (computed numeric answers + text input). It is therefore the best
 *   subject for proving the four profiles really diverge. The other
 *   subjects each contribute one scenario to demonstrate per-subject
 *   coverage; their profile control depends on the React-fiber probe
 *   reliably resolving correctAnswer/correctIndex (Hebrew / English /
 *   Science) or the geometry numeric path.
 *
 * Moledet/geography was originally a BLOCKED scenario because that page
 * lacked stable testids. The Phase C repair pass added the canonical
 * testids without changing design / Hebrew copy / behaviour, so
 * moledet-geography now runs as a real MCQ scenario like the others.
 * The makeBlockerScenario helper stays for any future blocker we need to
 * record honestly.
 *
 * Determinism:
 *   Each scenario carries its own seedable RNG so reruns reproduce the
 *   same correct/wrong sequence and the same MCQ index choices.
 */

import { pickAnswerForArithmetic, makeRng } from "../lib/answer-profiles.mjs";

function makeArithmeticPickFn(rng) {
  return ({ profile, computedAnswer, topicKey, weaknessTopics }) =>
    pickAnswerForArithmetic({
      profile,
      computedAnswer,
      rng,
      topicKey,
      weaknessTopics,
    });
}

function makeMcqRngWrapper(rng) {
  // pickMcqIndex is consumed inside the MCQ driver via scenario.rng() — we
  // pass the raw next() function so the driver can call it once per
  // pickMcqIndex invocation (the picker calls rng() up to twice internally
  // but we call rng() once in the driver per question to pre-seed the
  // picker; passing the same rng() reference keeps the determinism intact).
  return rng;
}

function makeMathScenario({ id, profile, operation, grade, questionCount, weaknessTopics, seed }) {
  const rng = makeRng(seed);
  return {
    id,
    subject: "math",
    profile,
    grade,
    operation,
    topic: operation,
    questionCount,
    weaknessTopics: weaknessTopics ?? [],
    rng: () => rng,
    pickAnswer: makeArithmeticPickFn(rng),
  };
}

function makeGeometryScenario({ id, profile, topic, questionCount, weaknessTopics, seed }) {
  const rng = makeRng(seed);
  return {
    id,
    subject: "geometry",
    profile,
    topic: topic ?? "area",
    questionCount,
    weaknessTopics: weaknessTopics ?? [],
    rng: () => rng,
    pickAnswer: makeArithmeticPickFn(rng),
  };
}

function makeMcqScenario({ subject, id, profile, topic, questionCount, weaknessTopics, seed }) {
  const rng = makeRng(seed);
  return {
    id,
    subject,
    profile,
    topic: topic ?? null,
    questionCount,
    weaknessTopics: weaknessTopics ?? [],
    rng: () => rng,
  };
}

function makeBlockerScenario({ id, subject, profile, topic, questionCount }) {
  return {
    id,
    subject,
    profile: profile || "average",
    topic: topic ?? null,
    questionCount: questionCount ?? 0,
    weaknessTopics: [],
    rng: () => () => 0,
    blocker: true,
  };
}

/**
 * Phase C default suite.
 *
 * Order:
 *   - Math profiles run first so the "do profiles differentiate" evidence is
 *     captured even if a later subject hits a flake.
 *   - One non-math scenario per remaining subject demonstrates multi-subject
 *     coverage and per-subject delta evidence in the parent report.
 *   - Moledet appears last so the orchestrator can fold its BLOCKER status
 *     into the suite summary without aborting prior scenarios.
 */
// Seeds were chosen so that at the configured questionCount each profile's
// intended-correct rate lands within ~10pp of its nominal correctRate. The
// finder lives at `scripts/virtual-student-qa/tools/find-profile-seeds.mjs`;
// re-run it after changing questionCount or any spec in answer-profiles.mjs.
export const PHASE_C_SCENARIOS = [
  makeMathScenario({
    id: "math-strong",
    profile: "strong",
    operation: "addition",
    grade: 3,
    questionCount: 15,
    seed: 0xa1b200, // → 14/15 (93%) intended-correct
  }),
  makeMathScenario({
    id: "math-average",
    profile: "average",
    operation: "addition",
    grade: 3,
    questionCount: 15,
    seed: 0xa1b206, // → 11/15 (73%) intended-correct
  }),
  makeMathScenario({
    id: "math-weak",
    profile: "weak",
    operation: "addition",
    grade: 3,
    questionCount: 15,
    seed: 0xa1b202, // → 6/15 (40%) intended-correct
  }),
  makeMathScenario({
    id: "math-targeted",
    profile: "targeted",
    operation: "multiplication",
    grade: 3,
    questionCount: 15,
    weaknessTopics: ["multiplication"],
    seed: 0xa1b205, // → 4/15 (~27%) intended-correct because every question is in the weakness topic, so weakTopicRate (~0.25) dominates
  }),
  makeGeometryScenario({
    id: "geometry-average",
    profile: "average",
    topic: "area",
    questionCount: 10,
    seed: 0xa1c206, // pick from the average-row of the seed table
  }),
  makeMcqScenario({
    subject: "hebrew",
    id: "hebrew-average",
    profile: "average",
    topic: null,
    questionCount: 10,
    // Effective profile-controlled questions are ~8 (utils/hebrew-audio-attach.js
    // deterministically inserts recording-mode audio at sequenceIndex 5 and 8
    // for grade-3 reading; the runner skips those via the real-UI 'דילוג'
    // button). Seed tuned by tools/find-hebrew-seed.mjs for ~6/8 (75%) at N=8,
    // landing inside the average profile band (55–85%).
    seed: 0xa1d002,
  }),
  makeMcqScenario({
    subject: "english",
    id: "english-average",
    profile: "average",
    topic: null,
    questionCount: 10,
    seed: 0xa1e206,
  }),
  makeMcqScenario({
    subject: "science",
    id: "science-average",
    profile: "average",
    topic: null,
    questionCount: 10,
    seed: 0xa1f206,
  }),
  makeMcqScenario({
    subject: "moledet-geography",
    id: "moledet-geography-average",
    profile: "average",
    // Default topic is "homeland" (set in pages/learning/moledet-geography-master.js).
    // Leaving topic null keeps the page on its default selection — the
    // factory will fall back to whatever `currentQuestion.topic` reports.
    topic: null,
    questionCount: 10,
    seed: 0xa20206,
  }),
];

export const PHASE_C_SCENARIOS_BY_ID = Object.fromEntries(
  PHASE_C_SCENARIOS.map((s) => [s.id, s])
);
