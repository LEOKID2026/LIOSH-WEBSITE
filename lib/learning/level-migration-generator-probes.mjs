#!/usr/bin/env node
/**
 * Phase 2 — generator probes for 8 launch subjects (activity question selection).
 * Run: node lib/learning/level-migration-generator-probes.mjs
 */
import assert from "node:assert/strict";
import { generateActivityQuestionSetClient } from "../classroom-activities/generate-activity-questions-client.js";
import {
  assertQuestionsUseSourceDifficulties,
  mixedMapsToMultipleSourceDifficulties,
  resolveActivityGenerationPlan,
} from "./activity-question-selection.js";
import { resolveActivitySourceDifficulties } from "./display-level.js";
import {
  GEOGRAPHY_TOPIC_KEYS_CORE,
  MOLEDET_TOPIC_KEYS_CORE,
} from "../learning-shared/moledet-geography-display.js";

const COUNT = 5;
const warnings = [];

/**
 * @param {string} label
 * @param {() => Promise<void>} fn
 */
async function probe(label, fn) {
  try {
    await fn();
    console.log(`PASS: ${label}`);
    return { label, ok: true };
  } catch (err) {
    console.error(`FAIL: ${label}`, err?.message || err);
    return { label, ok: false, error: String(err?.message || err) };
  }
}

/**
 * @param {string} label
 * @param {() => Promise<void>} fn
 */
async function probeWarn(label, fn) {
  try {
    await fn();
    console.log(`PASS: ${label}`);
    return { label, ok: true };
  } catch (err) {
    warnings.push({ label, message: String(err?.message || err) });
    console.log(`WARN: ${label} — ${err?.message || err}`);
    return { label, ok: true, warning: true };
  }
}

async function runRegularAdvancedProbe({
  label,
  subject,
  gradeLevel,
  topic,
  regularDifficulty = "mixed",
  advancedDifficulty = "hard",
}) {
  const regularPlan = resolveActivityGenerationPlan(regularDifficulty, subject);
  assert.equal(regularPlan.displayLevel, "regular");
  assert.ok(regularPlan.sourceDifficulties.includes("easy"));
  assert.ok(regularPlan.sourceDifficulties.includes("medium"));

  const regularQs = await generateActivityQuestionSetClient({
    subject,
    gradeLevel,
    topic,
    difficulty: regularDifficulty,
    count: COUNT,
  });
  assert.equal(regularQs.length, COUNT);
  const regCheck = assertQuestionsUseSourceDifficulties(regularQs, regularPlan.sourceDifficulties);
  assert.equal(regCheck.ok, true, regCheck.reason);
  assert.ok(regularQs.every((q) => q.displayLevel === "regular"));

  const advPlan = resolveActivityGenerationPlan(advancedDifficulty, subject);
  assert.equal(advPlan.displayLevel, "advanced");
  assert.deepEqual(advPlan.sourceDifficulties, ["hard"]);

  const advQs = await generateActivityQuestionSetClient({
    subject,
    gradeLevel,
    topic,
    difficulty: advancedDifficulty,
    count: COUNT,
  });
  assert.equal(advQs.length, COUNT);
  const advCheck = assertQuestionsUseSourceDifficulties(advQs, ["hard"]);
  assert.equal(advCheck.ok, true, advCheck.reason);
  assert.ok(advQs.every((q) => q.displayLevel === "advanced" && q.sourceDifficulty === "hard"));
}

const results = [];

results.push(
  await probe("mixed≠medium-only (SSOT)", async () => {
    assert.equal(mixedMapsToMultipleSourceDifficulties("mixed", "math"), true);
    assert.deepEqual(resolveActivitySourceDifficulties("mixed", "math"), ["easy", "medium"]);
    assert.notDeepEqual(resolveActivitySourceDifficulties("mixed", "math"), ["medium"]);
  })
);

results.push(
  await probe("math regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "math",
      subject: "math",
      gradeLevel: "g3",
      topic: "addition",
    });
  })
);

results.push(
  await probe("geometry regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "geometry",
      subject: "geometry",
      gradeLevel: "g3",
      topic: "area",
    });
  })
);

results.push(
  await probe("hebrew regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "hebrew",
      subject: "hebrew",
      gradeLevel: "g4",
      topic: "comprehension",
    });
  })
);

results.push(
  await probe("english G1-G2 advanced maps to hard (SSOT)", async () => {
    const plan = resolveActivityGenerationPlan("hard", "english");
    assert.equal(plan.displayLevel, "advanced");
    assert.deepEqual(plan.sourceDifficulties, ["hard"]);
    const reg = resolveActivityGenerationPlan("mixed", "english");
    assert.equal(reg.displayLevel, "regular");
    assert.deepEqual(reg.sourceDifficulties, ["easy", "medium"]);
  })
);

results.push(
  await probeWarn("english G1 generation (thin pool — mapping only verified above)", async () => {
    await runRegularAdvancedProbe({
      label: "english-g1",
      subject: "english",
      gradeLevel: "g1",
      topic: "grammar",
    });
  })
);

results.push(
  await probeWarn("english G2 generation (thin pool)", async () => {
    await runRegularAdvancedProbe({
      label: "english-g2",
      subject: "english",
      gradeLevel: "g2",
      topic: "grammar",
    });
  })
);

results.push(
  await probe("english G3-G6 regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "english-g3",
      subject: "english",
      gradeLevel: "g3",
      topic: "grammar",
    });
  })
);

results.push(
  await probe("science regular E+M+H, no advanced UI", async () => {
    const plan = resolveActivityGenerationPlan("mixed", "science");
    assert.equal(plan.displayLevel, "regular");
    assert.deepEqual(plan.sourceDifficulties, ["easy", "medium", "hard"]);
    assert.equal(plan.rejectAdvanced, true);

    const qs = await generateActivityQuestionSetClient({
      subject: "science",
      gradeLevel: "g3",
      topic: "body",
      difficulty: "mixed",
      count: COUNT,
    });
    assert.equal(qs.length, COUNT);
    const check = assertQuestionsUseSourceDifficulties(qs, ["easy", "medium", "hard"]);
    assert.equal(check.ok, true, check.reason);
    assert.ok(qs.every((q) => q.displayLevel === "regular"));
  })
);

results.push(
  await probe("moledet strand regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "moledet",
      subject: "moledet_geography",
      gradeLevel: "g3",
      topic: MOLEDET_TOPIC_KEYS_CORE[0],
    });
  })
);

results.push(
  await probe("geography strand regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "geography",
      subject: "moledet_geography",
      gradeLevel: "g5",
      topic: GEOGRAPHY_TOPIC_KEYS_CORE[0],
    });
  })
);

results.push(
  await probe("history regular/advanced", async () => {
    await runRegularAdvancedProbe({
      label: "history",
      subject: "history",
      gradeLevel: "g6",
      topic: "what_is_history",
    });
  })
);

results.push(
  await probeWarn("english G1 advanced thin pool (warning only)", async () => {
    await runRegularAdvancedProbe({
      label: "english-g1-hard",
      subject: "english",
      gradeLevel: "g1",
      topic: "grammar",
      regularDifficulty: "mixed",
      advancedDifficulty: "hard",
    });
  })
);

const failed = results.filter((r) => !r.ok);
console.log("\n--- Phase 2 generator probe summary ---");
console.log(`passed: ${results.filter((r) => r.ok && !r.warning).length}`);
console.log(`warnings: ${warnings.length}`);
console.log(`failed: ${failed.length}`);
if (warnings.length) {
  console.log("Warnings (thin pools — policy unchanged):");
  for (const w of warnings) console.log(`  - ${w.label}: ${w.message}`);
}

if (failed.length) {
  process.exitCode = 1;
  throw new Error(`Generator probes failed: ${failed.map((f) => f.label).join(", ")}`);
}

console.log("\nAll Phase 2 generator probes passed.");
