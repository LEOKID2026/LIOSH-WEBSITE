/**
 * Helper that finds Phase C scenario seeds whose intended-correct rate
 * lands within ~10pp of the profile's nominal correctRate at the
 * questionCount the suite uses.
 *
 * Run when scenarios/phase-c-suite.mjs changes correctRate, questionCount,
 * or weakness-topic mapping. Update the chosen seeds in that file so the
 * profile-evidence rows in the run summary cleanly differentiate
 * strong / average / weak / targeted.
 *
 *   node scripts/virtual-student-qa/tools/find-profile-seeds.mjs
 */

import {
  pickAnswerForArithmetic,
  makeRng,
} from "../lib/answer-profiles.mjs";

const profiles = ["strong", "average", "weak", "targeted"];

// targeted's distinctive behaviour comes from spec.weakTopicRate (~0.25)
// dominating when the question's topicKey is in scenario.weaknessTopics.
// Match the math-targeted scenario layout (topic == weaknessTopic).
const targets = { strong: 0.95, average: 0.7, weak: 0.4, targeted: 0.25 };
const topicForProfile = {
  strong: { topic: "addition", weakness: [] },
  average: { topic: "addition", weakness: [] },
  weak: { topic: "addition", weakness: [] },
  targeted: { topic: "multiplication", weakness: ["multiplication"] },
};

for (const profile of profiles) {
  const target = targets[profile];
  const N = 15;
  const candidates = [];
  const ctx = topicForProfile[profile];
  for (let seed = 0xa1b200; seed <= 0xa1b2ff; seed++) {
    const rng = makeRng(seed);
    let correct = 0;
    for (let i = 0; i < N; i++) {
      const r = pickAnswerForArithmetic({
        profile,
        computedAnswer: 100,
        rng,
        topicKey: ctx.topic,
        weaknessTopics: ctx.weakness,
      });
      if (r.intendedCorrect) correct += 1;
    }
    candidates.push({
      seed,
      correct,
      rate: correct / N,
      distance: Math.abs(correct / N - target),
    });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const top = candidates.slice(0, 3);
  console.log(`${profile} (target=${target}): top 3 seeds @ N=${N}:`);
  for (const c of top) {
    console.log(
      `  seed=0x${c.seed.toString(16)}: correct=${c.correct}/${N} rate=${(c.rate * 100).toFixed(0)}%`
    );
  }
}
