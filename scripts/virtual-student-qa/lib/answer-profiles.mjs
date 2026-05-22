/**
 * Answer profile heuristics.
 *
 * Phase A consumes only the 'average' profile, but the other profiles are
 * wired up so that Phase C can pick them up without refactoring this module.
 *
 * Profiles do NOT change product thresholds — they only control how often the
 * runner intentionally submits a wrong answer. Thresholds in
 * utils/parent-report-v2.js, utils/diagnostic-engine-v2/* etc. remain owned
 * by the product and are read-only here.
 */

const PROFILES = {
  strong: { correctRate: 0.95, jitterMin: 1, jitterMax: 3 },
  average: { correctRate: 0.7, jitterMin: 1, jitterMax: 3 },
  weak: { correctRate: 0.4, jitterMin: 1, jitterMax: 5 },
  targeted: { correctRate: 0.85, weakTopicRate: 0.25, jitterMin: 1, jitterMax: 4 },
};

export function profileSpec(profile) {
  return PROFILES[profile] || PROFILES.average;
}

/**
 * Decide whether to submit the correct arithmetic answer or a perturbed wrong
 * one, based on the active profile.
 *
 * @param {object} args
 * @param {string} args.profile
 * @param {number|null} args.computedAnswer  - parsed correct answer (or null)
 * @param {() => number} args.rng
 * @param {string} [args.topicKey]
 * @param {string[]} [args.weaknessTopics]
 * @returns {{value: string, intendedCorrect: boolean}}
 */
export function pickAnswerForArithmetic({ profile, computedAnswer, rng, topicKey, weaknessTopics }) {
  if (computedAnswer === null || !Number.isFinite(computedAnswer)) {
    return {
      value: String(Math.max(0, Math.floor(rng() * 10))),
      intendedCorrect: false,
    };
  }
  const spec = profileSpec(profile);
  let correctRate = spec.correctRate;
  if (
    profile === "targeted" &&
    Array.isArray(weaknessTopics) &&
    topicKey &&
    weaknessTopics.includes(topicKey)
  ) {
    correctRate = spec.weakTopicRate ?? 0.25;
  }
  const wantsCorrect = rng() < correctRate;
  if (wantsCorrect) {
    return { value: String(Math.trunc(computedAnswer)), intendedCorrect: true };
  }
  const jitterMin = spec.jitterMin ?? 1;
  const jitterMax = spec.jitterMax ?? 3;
  const span = Math.max(1, jitterMax - jitterMin + 1);
  const offset = jitterMin + Math.floor(rng() * span);
  const sign = rng() < 0.5 ? -1 : 1;
  let perturbed = Math.trunc(computedAnswer) + sign * offset;
  if (perturbed === Math.trunc(computedAnswer)) perturbed += 1;
  if (perturbed < 0) perturbed = Math.abs(perturbed) + 1;
  return { value: String(perturbed), intendedCorrect: false };
}

/**
 * Tiny seedable RNG so scenario behavior is repeatable across runs.
 */
export function makeRng(seed) {
  let state = (Number(seed) | 0) || 0xc0ffee;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state & 0xffffffff) / 0x100000000;
  };
}
