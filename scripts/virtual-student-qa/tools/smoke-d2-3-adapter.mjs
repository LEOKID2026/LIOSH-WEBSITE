#!/usr/bin/env node
/**
 * D2.3 adapter smoke (no UI, no browser).
 *
 * Loads the personas + a fresh state, generates a plan for a fixed
 * date, runs the phase-d2-suite adapter, and prints a structural
 * summary. Used to confirm the planner→scenario shape adapter wires
 * correctly across all six subjects without driving any UI or
 * advancing any state.
 *
 * Usage:
 *   node scripts/virtual-student-qa/tools/smoke-d2-3-adapter.mjs
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

import { PERSONAS, PERSONA_LABELS } from "../scenarios/student-personas.mjs";
import { loadState } from "../lib/longitudinal-state.mjs";
import { generateDailyPlan } from "../lib/daily-plan-generator.mjs";
import { buildPhaseD2StudentRecords } from "../scenarios/phase-d2-suite.mjs";
import { makeDailyPacer } from "../lib/realtime-pacer.mjs";

const FIXED_DATE = "2026-05-22";

function buildFakeAccountsByLabel() {
  const m = new Map();
  for (const label of PERSONA_LABELS) {
    m.set(label, { label, username: label, code: null, pin: "1234" });
  }
  return m;
}

function summarizeScenario(scenario) {
  return {
    id: scenario.id,
    subject: scenario.subject,
    profile: scenario.profile,
    grade: scenario.grade ?? null,
    operation: scenario.operation ?? null,
    topic: scenario.topic ?? null,
    questionCount: scenario.questionCount,
    weaknessTopics: scenario.weaknessTopics,
    rngTypeOk: typeof scenario.rng === "function",
    pickAnswerTypeOk:
      scenario.subject === "math" || scenario.subject === "geometry"
        ? typeof scenario.pickAnswer === "function"
        : scenario.pickAnswer == null || typeof scenario.pickAnswer === "function",
  };
}

function main() {
  console.log(`---- D2.3 adapter smoke (date=${FIXED_DATE}) ----`);
  console.log("");
  const tmp = mkdtempSync(join(tmpdir(), "liosh-qa-d2-smoke-"));
  console.log(`tmp state dir: ${tmp}`);

  const stateLoad = loadState({
    stateDir: tmp,
    personas: PERSONAS,
    todayIso: FIXED_DATE,
  });
  console.log(`state: fresh=${stateLoad.fresh}`);

  const plan = generateDailyPlan({
    state: stateLoad.state,
    date: FIXED_DATE,
    mode: "fast",
    personas: PERSONAS,
  });
  console.log(
    `plan: studied=${plan.summary.studied} skipped=${plan.summary.skipped} ` +
      `totalSessions=${plan.summary.totalSessions} ` +
      `totalMinutes=${plan.summary.totalMinutes}`
  );
  console.log(
    `plan.subjectCounts=${JSON.stringify(plan.summary.subjectCounts)}`
  );
  console.log(
    `plan.profileCounts=${JSON.stringify(plan.summary.profileCounts)}`
  );

  const accountsByLabel = buildFakeAccountsByLabel();

  const adapted = buildPhaseD2StudentRecords({
    plan,
    accountsByLabel,
    studentLabels: null,
  });
  console.log("");
  console.log(
    `adapter: studied=${adapted.studied.length} skipped=${adapted.skipped.length} ` +
      `filteredOut=${adapted.filteredOut.length} totalSessions=${adapted.summary.totalSessions}`
  );

  console.log("");
  console.log("Per-studied-student summary:");
  for (const entry of adapted.studied) {
    console.log(
      `  ${entry.label} (grade=${entry.grade}, persona=${entry.personaKind}, ` +
        `defaultProfile=${entry.defaultProfile}, intendedMinutes=${entry.intendedMinutes}, ` +
        `sessions=${entry.sessions.length})`
    );
    for (const s of entry.sessions) {
      const sum = summarizeScenario(s);
      console.log(
        `    - id=${sum.id} subject=${sum.subject} profile=${sum.profile} ` +
          `grade=${sum.grade ?? "—"} topic=${sum.topic ?? "—"} ` +
          `qCount=${sum.questionCount} weakness=${sum.weaknessTopics.length > 0} ` +
          `rngOk=${sum.rngTypeOk} pickAnswerOk=${sum.pickAnswerTypeOk}`
      );
    }
  }
  if (adapted.skipped.length > 0) {
    console.log("");
    console.log("Skipped (planner roll = no, etc.):");
    for (const s of adapted.skipped) {
      console.log(`  ${s.label} (${s.personaKind}, grade=${s.grade}): ${s.reason}`);
    }
  }

  // Filter smoke test
  const filtered = buildPhaseD2StudentRecords({
    plan,
    accountsByLabel,
    studentLabels: ["AAA1", "AAA5"],
  });
  console.log("");
  console.log(
    `filter test (--students AAA1,AAA5): studied=${filtered.studied.length} ` +
      `filteredOut=${filtered.filteredOut.length}`
  );

  // Pacer smoke test
  console.log("");
  const fastPacer = makeDailyPacer({ mode: "fast", scale: 0 });
  const realtimePacer = makeDailyPacer({ mode: "realtime", scale: 1 });
  console.log(
    `pacer fast: mode=${fastPacer.mode} scale=${fastPacer.scale} ` +
      `betweenStudentsBand=${JSON.stringify(fastPacer.bands.betweenStudentsMs)}`
  );
  console.log(
    `pacer realtime: mode=${realtimePacer.mode} scale=${realtimePacer.scale} ` +
      `betweenSessionsBand=${JSON.stringify(realtimePacer.bands.betweenSessionsMs)}`
  );

  // Quick numeric: does every emitted scenario have a valid driver subject?
  const ALLOWED = new Set([
    "math",
    "geometry",
    "hebrew",
    "english",
    "science",
    "moledet-geography",
  ]);
  let invalid = 0;
  for (const entry of adapted.studied) {
    for (const s of entry.sessions) {
      if (!ALLOWED.has(s.subject)) invalid += 1;
    }
  }
  console.log("");
  console.log(`subject coverage: invalid=${invalid} (must be 0)`);
  if (invalid !== 0) {
    process.exit(1);
  }
  console.log("D2.3 adapter smoke OK.");
}

main();
