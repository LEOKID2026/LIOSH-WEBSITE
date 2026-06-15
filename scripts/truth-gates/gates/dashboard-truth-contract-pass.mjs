#!/usr/bin/env node
/** DASHBOARD_TRUTH_CONTRACT_PASS — missing vs 0%, server minutes, no localStorage authority. */
import { runNodeTest } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const code = runNodeTest("tests/learning/phase9-single-truth-progress.test.mjs");
if (code !== 0) {
  failGate("DASHBOARD_TRUTH_CONTRACT_PASS", "phase9-single-truth-progress.test.mjs failed", {
    usesMock: true,
  });
}

passGate(
  "DASHBOARD_TRUTH_CONTRACT_PASS",
  "student dashboard display truth + server-derived minutes contracts passed; not live dashboard UI",
  { usesMock: true, details: { liveGate: "DASHBOARD_TRUTH_PASS" } }
);
