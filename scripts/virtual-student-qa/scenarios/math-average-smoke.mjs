/**
 * Phase A first smoke scenario.
 *
 * One math game, grade 3, operation 'addition' (which renders the text-input
 * answer UI by default), 6 questions, 'average' profile (~70% correct).
 * The Phase A goal is to verify that real activity is persisted via the three
 * /api/learning/* endpoints — the exact correct/wrong split is secondary.
 */
import { pickAnswerForArithmetic, makeRng } from "../lib/answer-profiles.mjs";

export const mathAverageSmokeScenario = {
  id: "math-average-smoke",
  subject: "math",
  profile: "average",
  grade: 3,
  operation: "addition",
  questionCount: 6,
  weaknessTopics: [],
  // Lazily-initialized seedable RNG so the same scenario produces the same
  // correct/wrong sequence across runs.
  _rng: null,
  pickAnswer({ profile, computedAnswer, topicKey, weaknessTopics }) {
    if (!this._rng) this._rng = makeRng(0xa1b2c3);
    return pickAnswerForArithmetic({
      profile,
      computedAnswer,
      rng: this._rng,
      topicKey,
      weaknessTopics,
    });
  },
};

export const PHASE_A_SCENARIOS = {
  [mathAverageSmokeScenario.id]: mathAverageSmokeScenario,
};
