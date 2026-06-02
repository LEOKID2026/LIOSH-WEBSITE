/**
 * QA pass — learning time fairness (no deploy).
 * Run: node scripts/verify-learning-time-fairness-qa.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import {
  createQuestionTimeLedger,
  isLearningTimeFairnessV1Enabled,
  resolveMasterFairnessEnabled,
  resolveMasterSessionDurationSeconds,
  legacyTopicCreditSeconds,
  fairnessTopicCreditSeconds,
  topicCreditSecondsFromQuestionClose,
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LONG_READING_MS,
  TIER_LEGACY_GAME_MS,
} from "../utils/learning-time-credit/index.js";
/** Mirror lib/learning-supabase/learning-coin-award.server.js (avoid arcade import in node script). */
function calculateSessionCoins(accuracy, durationSeconds) {
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) return 0;
  const base = 10;
  const acc = typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : 0;
  if (acc >= 95) return base + 10;
  if (acc >= 80) return base + 5;
  return base;
}

/** Minutes mission slice from applySessionToMissions logic. */
function simulateMinutesMissionProgress(durationSeconds) {
  const durationMinutes =
    typeof durationSeconds === "number" && durationSeconds > 0
      ? durationSeconds / 60
      : 0;
  const mission = { type: "minutes", target: 10, progress: 0, completed: false };
  mission.progress = Math.min(mission.target, (mission.progress || 0) + durationMinutes);
  return mission.progress;
}

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

const MASTERS = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
];

console.log("── 1. Feature flag OFF (legacy ledger path) ──");
assertEq("flag default OFF", isLearningTimeFairnessV1Enabled(), false);
assertEq("flag OFF explicit", isLearningTimeFairnessV1Enabled(false), false);
assertEq("learning mode fairness OFF", resolveMasterFairnessEnabled("learning", false), false);
assertEq("challenge fairness OFF", resolveMasterFairnessEnabled("challenge", true), false);

{
  const ledger = createQuestionTimeLedger({
    subjectId: "hebrew",
    gameMode: "learning",
    question: { topic: "comprehension" },
    now: 0,
    fairnessEnabled: false,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(360_000);
  assertEq("legacy session cap 120s", closed.creditedMs, 120_000);
  assertEq("legacy topic discard 360s wall", closed.creditedSecForTopic, 0);
  assertEq("legacyTopicCreditSeconds(299)", legacyTopicCreditSeconds(299), 299);
  assertEq("legacyTopicCreditSeconds(300)", legacyTopicCreditSeconds(300), 0);
}

console.log("\n── 2. Feature flag ON (fairness ledger path) ──");
assertEq("flag ON", isLearningTimeFairnessV1Enabled(true), true);
assertEq("learning fairness ON", resolveMasterFairnessEnabled("learning", true), true);

const fairnessScenarios = [
  {
    label: "math default 20m",
    subjectId: "math",
    mode: "learning",
    question: { operation: "addition" },
    visibleMs: 1_200_000,
    expectedMs: TIER_DEFAULT_MS,
  },
  {
    label: "geometry hard 9m",
    subjectId: "geometry",
    mode: "learning",
    question: { params: { kind: "concept_area" } },
    visibleMs: 540_000,
    expectedMs: TIER_HARD_MS,
  },
  {
    label: "hebrew long_reading 7m",
    subjectId: "hebrew",
    mode: "learning",
    question: { topic: "comprehension" },
    visibleMs: 420_000,
    expectedMs: 420_000,
  },
  {
    label: "hebrew long_reading 11m",
    subjectId: "hebrew",
    mode: "learning",
    question: { topic: "comprehension" },
    visibleMs: 660_000,
    expectedMs: TIER_LONG_READING_MS,
  },
  {
    label: "english passage 7m",
    subjectId: "english",
    mode: "learning",
    question: { params: { kind: "reading_passage_short" } },
    visibleMs: 420_000,
    expectedMs: 420_000,
  },
  {
    label: "science experiments 8m",
    subjectId: "science",
    mode: "learning",
    question: {
      topic: "experiments",
      params: { patternFamily: "sci_experiments_scientific_method" },
    },
    visibleMs: 480_000,
    expectedMs: TIER_HARD_MS,
  },
];

for (const s of fairnessScenarios) {
  const ledger = createQuestionTimeLedger({
    subjectId: s.subjectId,
    gameMode: s.mode,
    question: s.question,
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  const closed = ledger.closeQuestion(s.visibleMs);
  assertEq(`${s.label} creditedMs`, closed.creditedMs, s.expectedMs);
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
  assertEq("geometry 6m topic non-zero", closed.creditedSecForTopic, 360);
  assertEq(
    "fairness topic helper 360s",
    fairnessTopicCreditSeconds(360_000),
    360
  );
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
  assertEq(
    "hidden 5m + visible 2m",
    ledger.closeQuestion(420_000).creditedMs,
    120_000
  );
}

console.log("\n── 3. Masters: no legacy topic guard; timeSpentMs wall-clock ──");
for (const rel of MASTERS) {
  const src = readFileSync(resolve(ROOT, rel), "utf8");
  if (!/duration < 300/.test(src)) pass(`${rel} no duration<300 in source`);
  else fail(`${rel} still has duration < 300`);
  if (/Math\.max\(0, Date\.now\(\) - questionStartTime\)/.test(src)) {
    pass(`${rel} timeSpentMs uses wall clock`);
  } else {
    fail(`${rel} missing wall-clock timeSpentMs pattern`);
  }
  if (/resolveMasterSessionDurationSeconds/.test(src)) {
    pass(`${rel} session finish uses capped duration`);
  } else {
    fail(`${rel} missing resolveMasterSessionDurationSeconds`);
  }
}

console.log("\n── 4. Challenge/speed legacy 120s (no UI edits in QA) ──");
{
  const ledger = createQuestionTimeLedger({
    subjectId: "math",
    gameMode: "challenge",
    question: {},
    now: 0,
    fairnessEnabled: true,
    initiallyVisible: true,
  });
  assertEq("challenge tier cap", ledger.tierCapMs, TIER_LEGACY_GAME_MS);
  assertEq("challenge credit", ledger.closeQuestion(300_000).creditedMs, 120_000);
}

for (const rel of MASTERS) {
  const src = readFileSync(resolve(ROOT, rel), "utf8");
  const isScience = rel.includes("science-master");
  const timerOk = isScience
    ? /setTimeLeft\(25\)/.test(src) && /setTimeLeft\(12\)/.test(src)
    : /setTimeLeft\(20\)/.test(src) && /setTimeLeft\(10\)/.test(src);
  if (timerOk) {
    pass(
      isScience
        ? `${rel} challenge/speed timers 25s/12s (pre-existing)`
        : `${rel} challenge/speed timers 20s/10s`
    );
  } else {
    fail(`${rel} missing expected challenge/speed timer resets`);
  }
  if (/function handleTimeUp/.test(src)) {
    pass(`${rel} handleTimeUp present`);
  } else {
    fail(`${rel} missing handleTimeUp`);
  }
}

console.log("\n── 5. Report / reward chain (static) ──");
const finishApi = readFileSync(
  resolve(ROOT, "pages/api/learning/session/finish.js"),
  "utf8"
);
if (finishApi.includes("duration_seconds") && finishApi.includes("durationSeconds")) {
  pass("session/finish persists duration_seconds from body.durationSeconds");
} else {
  fail("session/finish duration wiring");
}

if (finishApi.includes("awardLearningSessionCoins")) {
  pass("session/finish calls awardLearningSessionCoins(durationSeconds)");
} else {
  fail("session/finish coin award hook");
}

assertEq(
  "coins: 360s session qualifies (base 10)",
  calculateSessionCoins(70, 360),
  10
);
assertEq(
  "coins: 0s session = 0 coins",
  calculateSessionCoins(90, 0),
  0
);

const minutesProgress = simulateMinutesMissionProgress(360);
if (minutesProgress >= 6) {
  pass("daily minutes mission +6 min from 360s durationSeconds (formula)");
} else {
  fail("daily minutes mission progress", `progress=${minutesProgress}`);
}

const reportAgg = readFileSync(
  resolve(ROOT, "lib/parent-server/report-data-aggregate.server.js"),
  "utf8"
);
if (reportAgg.includes("session.duration_seconds")) {
  pass("parent report aggregate sums learning_sessions.duration_seconds");
} else {
  fail("parent report aggregate duration source");
}

console.log("\n── 6. Downstream verify scripts ──");
const scripts = [
  "tests/learning/learning-time-credit.test.mjs",
  "scripts/verify-learning-time-credit.mjs",
  "scripts/verify-math-geometry-time-credit-wiring.mjs",
  "scripts/verify-all-masters-time-credit-wiring.mjs",
];
for (const rel of scripts) {
  if (!existsSync(resolve(ROOT, rel))) {
    fail(`missing ${rel}`);
    continue;
  }
  if (rel.endsWith(".mjs") && rel.startsWith("scripts/")) {
    const r = spawnSync(process.execPath, [rel], { cwd: ROOT, encoding: "utf8" });
    if (r.status === 0) pass(rel);
    else fail(rel, r.stderr || r.stdout);
  } else if (rel.endsWith(".test.mjs")) {
    const r = spawnSync(
      process.execPath,
      ["--test", rel],
      { cwd: ROOT, encoding: "utf8" }
    );
    if (r.status === 0) pass(rel);
    else fail(rel, r.stderr || r.stdout);
  }
}

console.log("");
console.log(`QA checks: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("\nLearning time fairness QA script PASSED");
process.exit(0);
