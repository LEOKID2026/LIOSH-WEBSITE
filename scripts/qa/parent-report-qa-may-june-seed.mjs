#!/usr/bin/env node
/**
 * Seed May–June 2026 parent-context QA data for AAA1–AAA12 (admin parent).
 * Same scenario matrix as Q2E monthly sim; dates shifted 2026-04 → 2026-05.
 * Does NOT touch school / classroom data.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-qa-may-june-seed.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-qa-may-june-seed.mjs --clean-only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { QA_PARENT_ID } from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEED_TAG = "parent-report-qa-may-june-v1";
const SEED_META_KEY = "parentReportQaMayJune";
const WINDOW = { from: "2026-05-01", to: "2026-06-08" };
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-diagnostic-flags-comparison");

async function loadSimulationModule() {
  process.env.QA_PARENT_SEED_TAG = SEED_TAG;
  process.env.QA_PARENT_SEED_META_KEY = SEED_META_KEY;
  return import("./parent-report-q2e-monthly-simulation.mjs");
}

async function main() {
  const cleanOnly = process.argv.includes("--clean-only");
  const {
    cleanTaggedSeedsForTag,
    resolveAaaStudents,
    scenarioPlan,
    seedScenario,
    shiftScenarioPlanDates,
  } = await loadSimulationModule();
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const studentIds = students.map((s) => s.studentId);

  console.log(`\n=== May–June parent QA seed (${SEED_TAG}) ===`);
  console.log(`Window: ${WINDOW.from} .. ${WINDOW.to}`);
  console.log(`Students: ${students.length}\n`);

  const cleanup = await cleanTaggedSeedsForTag(supabase, studentIds, SEED_TAG, SEED_META_KEY);
  console.log("Cleanup (tag-scoped only):", cleanup);

  if (cleanOnly) {
    console.log("--clean-only done");
    return;
  }

  const seeded = [];
  for (const entry of students) {
    const aprilPlan = scenarioPlan(entry);
    const plan = shiftScenarioPlanDates(aprilPlan, "2026-04", "2026-05");
    if (!plan.seed) {
      console.log(`  ${entry.label}: skip (${entry.scenario})`);
      seeded.push({ label: entry.label, scenario: entry.scenario, seeded: false });
      continue;
    }
    const result = await seedScenario(supabase, QA_PARENT_ID, entry, plan);
    console.log(`  ${entry.label}:`, result);
    seeded.push({ label: entry.label, scenario: entry.scenario, ...result });
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const outPath = path.join(ARTIFACT_DIR, "may-june-seed-results.json");
  await writeFile(
    outPath,
    JSON.stringify({ runAt: new Date().toISOString(), seedTag: SEED_TAG, window: WINDOW, cleanup, seeded }, null, 2),
    "utf8"
  );
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
