/**
 * P2: verify math + geometry master wiring against learning-time-credit policy.
 * Run: node scripts/verify-math-geometry-time-credit-wiring.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import {
  createQuestionTimeLedger,
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LEGACY_GAME_MS,
  legacyTopicCreditSeconds,
  fairnessTopicCreditSeconds,
  topicCreditSecondsFromQuestionClose,
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

function assertNear(label, got, expected, tolerance = 5_000) {
  if (Math.abs(got - expected) <= tolerance) pass(label);
  else fail(label, `expected ~${expected}, got ${got}`);
}

console.log("── Master source wiring ──");
const WIRED = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
];
for (const rel of WIRED) {
  const src = readFileSync(resolve(ROOT, rel), "utf8");
  if (/learning-time-credit/.test(src) && /useLearningVisibilityClock/.test(src)) {
    pass(`${rel} imports ledger + visibility hook`);
  } else {
    fail(`${rel} missing learning-time-credit wiring`);
  }
  if (/resolveMasterSessionDurationSeconds/.test(src)) {
    pass(`${rel} applies 3h session cap on finish`);
  } else {
    fail(`${rel} missing session cap helper`);
  }
  if (!/duration < 300/.test(src)) {
    pass(`${rel} removed legacy topic duration<300 discard`);
  } else {
    fail(`${rel} still has duration < 300 topic guard`);
  }
}

console.log("\n── Fairness ON — credited visible time (ledger parity) ──");

{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition", params: { kind: "add_two" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(1_200_000);
  assertEq("math default MCQ 20 min visible => 300s", closed.creditedMs, TIER_DEFAULT_MS);
}

{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { params: { kind: "wp_multi_step" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(480_000);
  assertEq("math wp_* 8 min visible => 480s", closed.creditedMs, TIER_HARD_MS);
}

{
  const ledger = createQuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "learning",
    question: { topic: "triangles", params: { kind: "concept_area" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(360_000);
  assertEq("geometry concept* 6 min => 360s credited", closed.creditedMs, 360_000);
  assertEq(
    "geometry concept* 6 min topic seconds non-zero",
    closed.creditedSecForTopic,
    360
  );
}

{
  const ledger = createQuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "learning",
    question: { topic: "triangles", params: { kind: "concept_proof" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(540_000);
  assertEq("geometry concept* 9 min => 480s cap", closed.creditedMs, TIER_HARD_MS);
}

{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  ledger.flushVisibleSlice(120_000);
  ledger.onHidden(120_000);
  const closed = ledger.closeQuestion(420_000);
  assertEq("hidden 5 min + prior visible 2 min => 120s", closed.creditedMs, 120_000);
}

console.log("\n── Fairness OFF — legacy rollback ──");

{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: false,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(400_000);
  assertEq("legacy session credit cap 120s", closed.creditedMs, 120_000);
  assertEq("legacy topic discard at 300s+", legacyTopicCreditSeconds(360), 0);
  assertEq("legacy topic keeps under 300s", legacyTopicCreditSeconds(299), 299);
}

console.log("\n── Challenge/speed — legacy 120s game cap ──");

{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "challenge",
    question: { operation: "multiplication" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("challenge tier cap", ledger.tierCapMs, TIER_LEGACY_GAME_MS);
  const closed = ledger.closeQuestion(200_000);
  assertEq("challenge credited cap 120s", closed.creditedMs, 120_000);
}

{
  const ledger = createQuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "speed",
    question: { topic: "area" },
    now: 0,
    fairnessEnabled: false,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(180_000);
  assertEq("speed legacy 120s", closed.creditedMs, 120_000);
}

console.log("\n── Topic credit helpers (geometry 6 min) ──");
assertEq(
  "fairness topic 360s",
  fairnessTopicCreditSeconds(360_000),
  360
);
assertEq(
  "topicCreditSecondsFromQuestionClose fairness",
  topicCreditSecondsFromQuestionClose(360_000, true, 360),
  360
);

console.log("");
console.log(`Checks: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nMath + geometry time-credit wiring verification PASSED");
process.exit(0);
