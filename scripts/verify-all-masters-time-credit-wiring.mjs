/**
 * P2+P3: verify all six learning masters + tier scenarios.
 * Run: node scripts/verify-all-masters-time-credit-wiring.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import {
  createQuestionTimeLedger,
  resolveQuestionTimeCreditTier,
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LONG_READING_MS,
  TIER_LEGACY_GAME_MS,
  legacyTopicCreditSeconds,
  fairnessTopicCreditSeconds,
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

const ALL_MASTERS = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
];

console.log("── All six masters wired ──");
for (const rel of ALL_MASTERS) {
  const src = readFileSync(resolve(ROOT, rel), "utf8");
  if (/learning-time-credit/.test(src) && /useLearningVisibilityClock/.test(src)) {
    pass(`${rel} wired`);
  } else {
    fail(`${rel} missing ledger wiring`);
  }
  if (!/duration < 300/.test(src)) {
    pass(`${rel} no legacy topic duration<300 guard`);
  } else {
    fail(`${rel} still has duration < 300 discard`);
  }
  if (/resolveMasterSessionDurationSeconds/.test(src)) {
    pass(`${rel} session 3h cap on finish`);
  } else {
    fail(`${rel} missing session cap helper`);
  }
}

console.log("\n── Tier classification (explicit allowlists) ──");
assertEq(
  "hebrew spelling → default",
  resolveQuestionTimeCreditTier({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "spelling", params: { kind: "spelling" } },
  }),
  "default"
);
assertEq(
  "hebrew comprehension → long_reading",
  resolveQuestionTimeCreditTier({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension", params: { kind: "comprehension" } },
  }),
  "long_reading"
);
assertEq(
  "hebrew composition → hard",
  resolveQuestionTimeCreditTier({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "writing", params: { kind: "g5.full_composition_scaffold_choice" } },
  }),
  "hard"
);
assertEq(
  "english grammar MCQ → default",
  resolveQuestionTimeCreditTier({
    subjectId: "english",
    gameMode: "learning",
    question: { topic: "grammar", params: { kind: "tense", patternFamily: "present_simple" } },
  }),
  "default"
);
assertEq(
  "english passage → long_reading",
  resolveQuestionTimeCreditTier({
    subjectId: "english",
    gameMode: "learning",
    question: { topic: "vocabulary", params: { kind: "passage_comprehension" } },
  }),
  "long_reading"
);
assertEq(
  "english translation → hard",
  resolveQuestionTimeCreditTier({
    subjectId: "english",
    gameMode: "learning",
    question: { topic: "translation", params: { kind: "sentence_translate" } },
  }),
  "hard"
);
assertEq(
  "science body → default",
  resolveQuestionTimeCreditTier({
    subjectId: "science",
    gameMode: "learning",
    question: {
      topic: "body",
      params: { patternFamily: "science_body_heart_location", subtype: "sci_body_general" },
    },
  }),
  "default"
);
assertEq(
  "science experiments → hard",
  resolveQuestionTimeCreditTier({
    subjectId: "science",
    gameMode: "learning",
    question: {
      topic: "experiments",
      params: { patternFamily: "sci_experiments_scientific_method", subtype: "sci_experiments_general" },
    },
  }),
  "hard"
);
assertEq(
  "moledet homeland → default",
  resolveQuestionTimeCreditTier({
    subjectId: "moledet",
    gameMode: "learning",
    question: { topic: "homeland", params: { kind: "homeland", levelKey: "easy" } },
  }),
  "default"
);
assertEq(
  "moledet maps → long_reading",
  resolveQuestionTimeCreditTier({
    subjectId: "moledet_geography",
    gameMode: "learning",
    question: { topic: "maps", params: { kind: "maps", levelKey: "medium" } },
  }),
  "long_reading"
);
assertEq(
  "moledet maps hard level → long_reading (maps topic precedence)",
  resolveQuestionTimeCreditTier({
    subjectId: "moledet_geography",
    gameMode: "learning",
    question: { topic: "maps", params: { kind: "maps", levelKey: "hard", difficulty: "advanced" } },
  }),
  "long_reading"
);

console.log("\n── P2 math/geometry scenarios ──");
{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "learning",
    question: { operation: "addition" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("math 20 min visible → 300s", ledger.closeQuestion(1_200_000).creditedMs, TIER_DEFAULT_MS);
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
  assertEq("math wp 8 min → 480s", ledger.closeQuestion(480_000).creditedMs, TIER_HARD_MS);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "geometry",
    gameMode: "learning",
    question: { params: { kind: "concept_area" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(360_000);
  assertEq("geometry concept 6 min → 360s", closed.creditedMs, 360_000);
  assertEq("geometry topic 360s non-zero", closed.creditedSecForTopic, 360);
}

console.log("\n── P3 subject scenarios ──");
{
  const ledger = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "spelling", params: { kind: "spelling" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("hebrew default 20 min → 300s", ledger.closeQuestion(1_200_000).creditedMs, TIER_DEFAULT_MS);
}
{
  const ledger7 = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension", params: { kind: "comprehension" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("hebrew comprehension 7 min → 420s", ledger7.closeQuestion(420_000).creditedMs, 420_000);
}
{
  const ledger11 = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension", params: { kind: "comprehension" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq(
    "hebrew comprehension 11 min → 600s cap",
    ledger11.closeQuestion(660_000).creditedMs,
    TIER_LONG_READING_MS
  );
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "english",
    gameMode: "learning",
    question: { topic: "grammar", params: { kind: "word_meaning" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("english default 20 min → 300s", ledger.closeQuestion(1_200_000).creditedMs, TIER_DEFAULT_MS);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "english",
    gameMode: "learning",
    question: { topic: "vocabulary", params: { kind: "reading_passage_short" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("english passage 7 min → 420s", ledger.closeQuestion(420_000).creditedMs, 420_000);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "science",
    gameMode: "learning",
    question: { topic: "body", params: { patternFamily: "science_body_heart_location" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("science default 20 min → 300s", ledger.closeQuestion(1_200_000).creditedMs, TIER_DEFAULT_MS);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "science",
    gameMode: "learning",
    question: {
      topic: "experiments",
      params: { patternFamily: "sci_experiments_scientific_method" },
    },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("science experiments 8 min → 480s", ledger.closeQuestion(480_000).creditedMs, TIER_HARD_MS);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "moledet_geography",
    gameMode: "learning",
    question: { topic: "maps", params: { kind: "maps" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("moledet maps 20 min → 600s cap", ledger.closeQuestion(1_200_000).creditedMs, TIER_LONG_READING_MS);
  const ledger2 = createQuestionTimeLedger({
    subjectId: "moledet_geography",
    gameMode: "learning",
    question: { topic: "maps", params: { kind: "maps" } },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("moledet maps 8 min → 480s", ledger2.closeQuestion(480_000).creditedMs, 480_000);
}

console.log("\n── Visibility + legacy rollback ──");
{
  const ledger = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "reading" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  ledger.flushVisibleSlice(120_000);
  ledger.onHidden(120_000);
  assertEq("hidden 5m + visible 2m → 120s", ledger.closeQuestion(420_000).creditedMs, 120_000);
}
assertEq("fairness topic 420s", fairnessTopicCreditSeconds(420_000), 420);
assertEq("legacy topic discard 360s", legacyTopicCreditSeconds(360), 0);
{
  const ledger = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension" },
    now: 0,
    fairnessEnabled: false,
    initiallyVisible: true,
  });
  assertEq("legacy OFF session 120s", ledger.closeQuestion(400_000).creditedMs, 120_000);
}
{
  const ledger = createQuestionTimeLedger({
    subjectId: "english",
    gameMode: "challenge",
    question: { topic: "grammar" },
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("challenge tier cap", ledger.tierCapMs, TIER_LEGACY_GAME_MS);
  assertEq("challenge credit 120s", ledger.closeQuestion(200_000).creditedMs, 120_000);
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
if (failed > 0) process.exit(1);
console.log("\nAll masters time-credit wiring verification PASSED");
process.exit(0);
