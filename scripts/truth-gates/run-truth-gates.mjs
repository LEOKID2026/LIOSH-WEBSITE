#!/usr/bin/env node
/**
 * Run Truth Gates — Phase 5 orchestrator.
 *
 * Usage:
 *   node scripts/truth-gates/run-truth-gates.mjs
 *   node scripts/truth-gates/run-truth-gates.mjs --gate NO_LOCALSTORAGE_REPORT_PASS
 *   node scripts/truth-gates/run-truth-gates.mjs --launch-only
 *   node scripts/truth-gates/run-truth-gates.mjs --include-mock
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  GATE_SCRIPT_MAP,
  LAUNCH_REQUIRED_GATES,
  TRUTH_GATES,
} from "./gate-registry.mjs";
import { loadEnvFiles, TRUTH_GATES_ROOT } from "./lib/env.mjs";

loadEnvFiles();

const args = process.argv.slice(2);
const singleGate = args.includes("--gate")
  ? args[args.indexOf("--gate") + 1]
  : null;
const launchOnly = args.includes("--launch-only");
const includeMock = args.includes("--include-mock");

/** @type {string[]} */
let gates = singleGate
  ? [singleGate]
  : launchOnly
    ? [...LAUNCH_REQUIRED_GATES]
    : Object.keys(GATE_SCRIPT_MAP);

if (!includeMock && !singleGate) {
  gates = gates.filter((g) => g !== "MOCK_UI_PASS");
}

const report = {
  startedAt: new Date().toISOString(),
  gates: [],
  summary: { pass: 0, fail: 0, skip: 0 },
};

let exitCode = 0;

for (const gate of gates) {
  const rel = GATE_SCRIPT_MAP[gate];
  if (!rel) {
    console.error(`Unknown gate: ${gate}`);
    exitCode = 1;
    continue;
  }
  const script = join(TRUTH_GATES_ROOT, rel);
  console.log(`\n========== Running ${gate} ==========\n`);
  const r = spawnSync("node", [script], {
    cwd: TRUTH_GATES_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  const status = r.status ?? 1;
  const verdict = status === 0 ? "PASS" : status === 2 ? "SKIP" : "FAIL";
  report.gates.push({
    gate,
    verdict,
    exitCode: status,
    launchRequired: TRUTH_GATES[gate]?.launchRequired ?? false,
    stdoutTail: (r.stdout || "").slice(-1500),
    stderrTail: (r.stderr || "").slice(-800),
  });
  report.summary[verdict.toLowerCase()]++;
  if (verdict === "FAIL") exitCode = 1;
  if (launchOnly && TRUTH_GATES[gate]?.launchRequired && verdict === "SKIP") {
    exitCode = 1;
  }
}

report.finishedAt = new Date().toISOString();
const outDir = join(TRUTH_GATES_ROOT, "docs/repair/_artifacts/truth-gates");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `truth-gates-run-${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nTruth gates report: ${outPath}`);
console.log(JSON.stringify(report.summary, null, 2));
process.exit(exitCode);
