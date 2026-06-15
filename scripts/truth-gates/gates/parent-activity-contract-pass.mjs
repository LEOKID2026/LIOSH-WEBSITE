#!/usr/bin/env node
/** PARENT_ACTIVITY_CONTRACT_PASS — aggregation + no separate report label (unit/source contract). */
import { runNodeTest } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const tests = [
  "tests/learning/parent-activity-learning-credit.test.mjs",
  "tests/parent-server/parent-assigned-activities.test.mjs",
  "tests/truth-gates/parent-activity-truth-contract.test.mjs",
  "tests/learning/phase4-aggregate-filter.test.mjs",
];

for (const t of tests) {
  const code = runNodeTest(t);
  if (code !== 0) {
    failGate("PARENT_ACTIVITY_CONTRACT_PASS", `failed: ${t}`, { usesMock: true });
  }
}

passGate(
  "PARENT_ACTIVITY_CONTRACT_PASS",
  "parent activity unit/source contracts passed; not a live product gate",
  { usesMock: true, details: { liveGate: "PARENT_ACTIVITY_PASS" } }
);
