#!/usr/bin/env node
/** EVIDENCE_THRESHOLD_PASS — zero/low/strong evidence policy (in-process, not artifact). */
import { runTsxScript } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const scripts = [
  "scripts/parent-report-zero-evidence-policy.mjs",
  "scripts/parent-report-diagnostic-evidence.mjs",
];

for (const s of scripts) {
  const code = runTsxScript(s);
  if (code !== 0) {
    failGate("EVIDENCE_THRESHOLD_PASS", `${s} failed`, { layer: "contract" });
  }
}

passGate(
  "EVIDENCE_THRESHOLD_PASS",
  "zero-evidence + diagnostic evidence threshold suites passed",
  { layer: "contract", usesMock: true }
);
