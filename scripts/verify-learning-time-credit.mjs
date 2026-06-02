/**
 * Verify learning time credit policy (P0 foundation).
 * Run: node scripts/verify-learning-time-credit.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import {
  resolveQuestionTimeCreditTier,
  creditVisibleSliceMs,
  capSessionCreditedMs,
  QuestionTimeLedger,
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LONG_READING_MS,
  TIER_LEGACY_GAME_MS,
  SESSION_MAX_CREDITED_MS,
  resolveTierCapMs,
} from "../utils/learning-time-credit/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function assertEq(label, got, expected) {
  if (got === expected) pass(label);
  else fail(label, `expected ${expected}, got ${got}`);
}

console.log("── Tier caps (fairness on) ──");
assertEq("default cap 300s", resolveTierCapMs("default", true), TIER_DEFAULT_MS);
assertEq("hard cap 480s", resolveTierCapMs("hard", true), TIER_HARD_MS);
assertEq("long_reading cap 600s", resolveTierCapMs("long_reading", true), TIER_LONG_READING_MS);
assertEq("legacy_game cap 120s", resolveTierCapMs("legacy_game", true), TIER_LEGACY_GAME_MS);

console.log("\n── Classification samples ──");
assertEq(
  "math MCQ → default",
  resolveQuestionTimeCreditTier({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition", params: { kind: "add" } },
  }),
  "default"
);
assertEq(
  "math wp → hard",
  resolveQuestionTimeCreditTier({
    subjectId: "math",
    gameMode: "learning",
    question: { params: { kind: "wp_multi_step" } },
  }),
  "hard"
);
assertEq(
  "geometry concept → hard",
  resolveQuestionTimeCreditTier({
    subjectId: "geometry",
    gameMode: "learning",
    question: { params: { kind: "concept_area" } },
  }),
  "hard"
);
assertEq(
  "hebrew reading → long_reading",
  resolveQuestionTimeCreditTier({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension" },
  }),
  "long_reading"
);
assertEq(
  "challenge → legacy_game",
  resolveQuestionTimeCreditTier({ subjectId: "math", gameMode: "challenge", question: {} }),
  "legacy_game"
);

console.log("\n── Credited slices ──");
assertEq("90s → 90s", creditVisibleSliceMs(90_000, TIER_DEFAULT_MS, 0), 90_000);
assertEq("8 min hard → 480s", creditVisibleSliceMs(500_000, TIER_HARD_MS, 0), 480_000);
assertEq("session 3h cap", capSessionCreditedMs(SESSION_MAX_CREDITED_MS + 1), SESSION_MAX_CREDITED_MS);

console.log("\n── Ledger scenarios ──");
{
  const ledger = new QuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "learning",
    question: { params: { kind: "concept_triangles" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const r = ledger.closeQuestion(360_000);
  assertEq("6 min hard geometry → 360s credited", r.creditedMs, 360_000);
  assertEq("6 min hard topic sec", r.creditedSecForTopic, 360);
}

{
  const ledger = new QuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  ledger.onHidden(60_000);
  const r = ledger.closeQuestion(360_000);
  assertEq("hidden gap: only first minute", r.creditedMs, 60_000);
}

console.log("\n── Foundation files exist ──");
const required = [
  "utils/learning-time-credit/constants.js",
  "utils/learning-time-credit/classify-question-tier.js",
  "utils/learning-time-credit/compute-credited-ms.js",
  "utils/learning-time-credit/question-time-ledger.js",
  "utils/learning-time-credit/feature-flag.js",
  "utils/learning-time-credit/index.js",
  "hooks/useLearningVisibilityClock.js",
];

for (const rel of required) {
  if (existsSync(resolve(ROOT, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

console.log("\n── All six masters wired (P2+P3) ──");
const allMasters = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
];

const WIRED_IMPORT = /learning-time-credit/;
for (const rel of allMasters) {
  const src = readFileSync(resolve(ROOT, rel), "utf8");
  if (WIRED_IMPORT.test(src) && /useLearningVisibilityClock/.test(src)) {
    pass(`${rel} wired`);
  } else {
    fail(`${rel} should import learning-time-credit + visibility hook`);
  }
}

if (existsSync(resolve(ROOT, "scripts/verify-all-masters-time-credit-wiring.mjs"))) {
  pass("scripts/verify-all-masters-time-credit-wiring.mjs present");
} else {
  fail("missing scripts/verify-all-masters-time-credit-wiring.mjs");
}

console.log("\n── node:test suite ──");
const testRun = spawnSync(
  process.execPath,
  ["--test", "tests/learning/learning-time-credit.test.mjs"],
  { cwd: ROOT, encoding: "utf8" }
);
if (testRun.status === 0) {
  pass("tests/learning/learning-time-credit.test.mjs");
} else {
  fail("node:test suite", testRun.stderr || testRun.stdout);
}

console.log("");
console.log(`Checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("\nAll learning-time-credit checks PASSED");
process.exit(0);
