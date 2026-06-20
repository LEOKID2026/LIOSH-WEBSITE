#!/usr/bin/env node
/** REWARD_CONTRACT_PASS — time credit fairness + coin/dashboard + economy single source contracts. */
import { runNodeTest } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const tests = [
  "tests/learning/learning-time-credit.test.mjs",
  "tests/truth-gates/reward-truth-contract.test.mjs",
  "tests/learning/phase9-single-truth-progress.test.mjs",
  "tests/rewards/economy-config-required.test.mjs",
  "tests/rewards/economy-no-hardcoded-contract.test.mjs",
  "tests/rewards/economy-resolution-chain.test.mjs",
  "tests/rewards/card-settings-required.test.mjs",
  "tests/rewards/admin-student-economy-parity.test.mjs",
  "tests/rewards/card-catalog-baseline.test.mjs",
  "tests/rewards/card-rules-no-hardcoded.test.mjs",
  "tests/rewards/card-requirement-he.test.mjs",
  "tests/rewards/card-acquisition-evaluator.test.mjs",
  "tests/rewards/card-catalog-admin-parity.test.mjs",
  "tests/arcade/economy-entry-costs.test.mjs",
];

for (const t of tests) {
  const code = runNodeTest(t);
  if (code !== 0) {
    failGate("REWARD_CONTRACT_PASS", `failed: ${t}`, { usesMock: true });
  }
}

passGate("REWARD_CONTRACT_PASS", "reward/time/dashboard/economy single-source contracts passed", {
  usesMock: true,
  details: {
    liveGate: "REWARD_PASS",
  },
});
