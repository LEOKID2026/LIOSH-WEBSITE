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
  strong: { correctRate: 0.9, jitterMin: 1, jitterMax: 3 },
  average: { correctRate: 0.75, jitterMin: 1, jitterMax: 3 },
  weak: { correctRate: 0.575, jitterMin: 1, jitterMax: 5 },
  targeted: { correctRate: 0.85, weakTopicRate: 0.35, jitterMin: 1, jitterMax: 4 },
};

export function resolveCorrectRate({ profile, topicKey, weaknessTopics }) {
  const spec = profileSpec(profile);
  let correctRate = spec.correctRate;
  if (
    profile === "targeted" &&
    Array.isArray(weaknessTopics) &&
    topicKey &&
    weaknessTopics.includes(topicKey)
  ) {
    correctRate = spec.weakTopicRate ?? 0.35;
  }
  return correctRate;
}

/**
 * Profile-only draw: should this question intentionally be answered correctly?
 */
export function pickCorrectnessIntent({ profile, rng, topicKey, weaknessTopics }) {
  return rng() < resolveCorrectRate({ profile, topicKey, weaknessTopics });
}

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
  const wantsCorrect = pickCorrectnessIntent({
    profile,
    rng,
    topicKey,
    weaknessTopics,
  });
  if (wantsCorrect) {
    return { value: String(Math.trunc(computedAnswer)), intendedCorrect: true };
  }
  const spec = profileSpec(profile);
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
 * Decide which MCQ option index to click for the current question, based on
 * the active profile and the known correct option index.
 *
 * Phase C consumers (hebrew/english/science MCQ drivers) feed `correctIndex`
 * obtained from a React-fiber probe of the page's `currentQuestion` state —
 * we never modify product data, we only read it to decide click intent.
 *
 * @param {object} args
 * @param {string} args.profile
 * @param {number} args.correctIndex   - 0-based index of the correct option
 * @param {number} args.optionsCount   - total number of MCQ buttons available
 * @param {() => number} args.rng
 * @param {string} [args.topicKey]
 * @param {string[]} [args.weaknessTopics]
 * @returns {{index: number, intendedCorrect: boolean}}
 */
export function pickMcqIndex({
  profile,
  correctIndex,
  optionsCount,
  rng,
  topicKey,
  weaknessTopics,
}) {
  const total = Math.max(1, Number(optionsCount) || 0);
  const correct = Number.isInteger(correctIndex) ? correctIndex : -1;
  const safeCorrect = correct >= 0 && correct < total ? correct : 0;

  if (total <= 1) {
    return { index: 0, intendedCorrect: safeCorrect === 0 };
  }

  const wantsCorrect = pickCorrectnessIntent({
    profile,
    rng,
    topicKey,
    weaknessTopics,
  });
  if (wantsCorrect) {
    return { index: safeCorrect, intendedCorrect: true };
  }
  // Pick a wrong index uniformly from the remaining options.
  const wrongCount = total - 1;
  let pick = Math.floor(rng() * wrongCount);
  if (pick >= safeCorrect) pick += 1;
  if (pick < 0 || pick >= total) pick = (safeCorrect + 1) % total;
  return { index: pick, intendedCorrect: false };
}

/**
 * Tiny seedable RNG so scenario behaviour is repeatable across runs.
 *
 * Important: `state >>> 0` already keeps `state` in the unsigned 32-bit
 * range (0..2^32-1). A subsequent `state & 0xffffffff` would convert it
 * BACK to a signed 32-bit int (because JS bitwise operators treat their
 * operands as signed int32), which yields negative results once the high
 * bit is set. That bug silently broke all profile correctRate gating in
 * Phase C's first run — values like -0.4 always satisfied `rng() < 0.7`,
 * so weak/average looked indistinguishable from strong. We divide the
 * unsigned state directly to produce a value in [0, 1).
 */
export function makeRng(seed) {
  let state = (Number(seed) | 0) || 0xc0ffee;
  if (state < 0) state >>>= 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
