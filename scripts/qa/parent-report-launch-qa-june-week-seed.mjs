#!/usr/bin/env node
/**
 * Isolated parent-context seed for June 2026 week QA (AAA1–AAA12).
 * Adds light free-practice on 2026-06-06 and 2026-06-08 only.
 * No school / classroom data.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-launch-qa-june-week-seed.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-launch-qa-june-week-seed.mjs --clean-only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { resolveAaaStudents } from "./lib/parent-aaa-qa-constants.mjs";
import { bootstrapQaDbWriteGuard } from "./lib/db-write-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEED_TAG = "parent-report-launch-june-week-v1";
const SEED_META_KEY = "parentReportLaunchJuneWeek";
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-launch-qa");

async function loadSimulationModule() {
  process.env.QA_PARENT_SEED_TAG = SEED_TAG;
  process.env.QA_PARENT_SEED_META_KEY = SEED_META_KEY;
  return import("./parent-report-q2e-monthly-simulation.mjs");
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapQaDbWriteGuard(
    "qa/parent-report-launch-qa-june-week-seed",
    "PARENT_REPORT_LAUNCH_JUNE_WEEK_SEED",
    argv
  );
  const cleanOnly = guard.mode.cleanOnly;
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary({ artifactPath: ARTIFACT_DIR });
    return;
  }
  const {
    buildAnswerSchedule,
    cleanTaggedSeedsForTag,
    gradeDbKey,
    insertPracticeSession,
    scenarioPlan,
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

  const cleanup = await cleanTaggedSeedsForTag(supabase, studentIds, SEED_TAG, SEED_META_KEY);
  console.log("Cleanup (tag-scoped):", cleanup);

  if (cleanOnly) return;

  const days = ["2026-06-06", "2026-06-08"];
  const seeded = [];

  for (const entry of students) {
    const plan = scenarioPlan(entry);
    const subject = plan.subject || "math";
    const topic =
      plan.topic ||
      (entry.grade <= 2 ? "addition" : entry.grade <= 4 ? "multiplication" : "fractions");
    const grade = gradeDbKey(entry.grade);

    if (entry.scenario === "A_no_data") {
      seeded.push({ label: entry.label, skipped: true, reason: "A_no_data scenario" });
      continue;
    }

    const answers = buildAnswerSchedule(days, [2, 2], [0, 1]);
    const result = await insertPracticeSession(supabase, entry.studentId, {
      subject,
      topic,
      grade,
      mode: "practice",
      answers,
    });
    seeded.push({ label: entry.label, subject, topic, ...result });
    console.log(`  ${entry.label}: ${result.answerCount} answers`);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const outPath = path.join(ARTIFACT_DIR, "june-week-seed-results.json");
  await writeFile(
    outPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        seedTag: SEED_TAG,
        seedMetaKey: SEED_META_KEY,
        days,
        cleanup,
        seeded,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
