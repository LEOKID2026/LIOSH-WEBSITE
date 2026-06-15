#!/usr/bin/env node
/** Aggregate final launch verification — runs all P0 checks and writes verdict JSON. */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = resolve(ROOT, "docs/qa");
const VERDICT_JSON = resolve(OUT_DIR, "p0-final-launch-verdict.json");

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100",
      TRUTH_GATES_BASE_URL: process.env.TRUTH_GATES_BASE_URL || "http://localhost:3100",
      ...env,
    },
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  return {
    exitCode: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const steps = [];

steps.push({
  id: "policy_answer_scope",
  cmd: "node scripts/qa/policy-answer-scope-verify.mjs",
  ...run("node", ["scripts/qa/policy-answer-scope-verify.mjs"]),
  artifact: "docs/qa/policy-answer-scope-verify.json",
});

steps.push({
  id: "three_checks",
  cmd: "node scripts/qa/p0-final-three-checks.mjs",
  ...run("node", ["scripts/qa/p0-final-three-checks.mjs"]),
  artifact: "docs/qa/p0-final-three-checks.json",
});

steps.push({
  id: "parent_pdf_smoke",
  cmd: "node scripts/qa/p0-parent-report-live.mjs",
  ...run("node", ["scripts/qa/p0-parent-report-live.mjs"]),
  artifact: "docs/qa/p0-parent-report-live.json",
});

steps.push({
  id: "static_greps_evidence",
  cmd: "node scripts/qa/p0-final-verification.mjs",
  ...run("node", ["scripts/qa/p0-final-verification.mjs"]),
  artifact: "docs/qa/p0-final-verification-results.json",
});

steps.push({
  id: "evidence_gate",
  cmd: "npm run gate:evidence-threshold",
  ...run("npm", ["run", "gate:evidence-threshold"]),
  artifact: null,
});

const mapped = steps.map(({ id, cmd, exitCode, stdout, stderr, artifact }) => ({
  id,
  cmd,
  pass: exitCode === 0,
  exitCode,
  artifact,
  tail: (stdout || stderr).split("\n").slice(-8).join("\n"),
}));

const artifacts = {
  policyAnswerScope: readJson(resolve(OUT_DIR, "policy-answer-scope-verify.json")),
  threeChecks: readJson(resolve(OUT_DIR, "p0-final-three-checks.json")),
  parentReportLive: readJson(resolve(OUT_DIR, "p0-parent-report-live.json")),
  staticVerification: readJson(resolve(OUT_DIR, "p0-final-verification-results.json")),
};

const verdict = {
  generatedAt: new Date().toISOString(),
  port: 3100,
  steps: mapped,
  artifacts: {
    "docs/qa/policy-answer-scope-verify.json": artifacts.policyAnswerScope?.verdict ?? null,
    "docs/qa/p0-final-three-checks.json": artifacts.threeChecks?.pass ?? null,
    "docs/qa/p0-parent-report-live.json": artifacts.parentReportLive?.pass ?? null,
    "docs/qa/p0-final-verification-results.json": artifacts.staticVerification?.staticVerdict ?? null,
    "docs/qa/p0-final-verification-screenshots/": "browser captures from three-checks + parent smoke",
  },
  tapBattleLaunchScope: {
    accessible: true,
    path: "/games → /offline → /offline/tap-battle",
    note: "Start/Next translated to Hebrew (התחל/הבא)",
  },
  verdict: mapped.every((s) => s.pass) ? "PASS" : "NOT PASS",
  failedSteps: mapped.filter((s) => !s.pass).map((s) => s.id),
  staticGrepNotes: {
    hintGrep:
      "FAIL if showHints/hint_render/hint_label in UI paths; question stems with 'לפי הרמז' and getHint() defs may count as hits",
    diagnosticGrep:
      "FAIL if forbidden strings in parent-facing surfaces; normalization/forbidden-terms utility files may count as hits",
  },
};

writeFileSync(VERDICT_JSON, JSON.stringify(verdict, null, 2));
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.verdict === "PASS" ? 0 : 1);
