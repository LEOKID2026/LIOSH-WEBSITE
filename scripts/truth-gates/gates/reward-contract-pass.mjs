#!/usr/bin/env node
/** REWARD_CONTRACT_PASS — time credit fairness + coin/dashboard source contracts. */
import { runNodeTest } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const tests = [
  "tests/learning/learning-time-credit.test.mjs",
  "tests/truth-gates/reward-truth-contract.test.mjs",
  "tests/learning/phase9-single-truth-progress.test.mjs",
];

for (const t of tests) {
  const code = runNodeTest(t);
  if (code !== 0) {
    failGate("REWARD_CONTRACT_PASS", `failed: ${t}`, { usesMock: true });
  }
}

passGate("REWARD_CONTRACT_PASS", "reward/time/dashboard unit contracts passed; not live coin persistence", {
  usesMock: true,
  details: {
    liveGate: "REWARD_PASS",
  },
});
