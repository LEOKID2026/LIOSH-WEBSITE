#!/usr/bin/env node
/**
 * Teacher Classroom Daily Simulation — CLI entry.
 *
 * Real Playwright/UI-driven learning via reused virtual-student-qa subject drivers.
 * Isolated from AAA nightly runner and existing QA accounts.
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local \
 *     scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local \
 *     scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3 --subject=math
 */
process.env.TEACHER_PORTAL_ENABLED = process.env.TEACHER_PORTAL_ENABLED || "true";
process.env.TEACHER_PORTAL_INVITE_ONLY = process.env.TEACHER_PORTAL_INVITE_ONLY || "true";

import { parseConfig, makeArtifactsDir } from "./teacher-classroom-sim/config.mjs";
import { bootstrapSimulation, resetSimActivity, verifyUntouchedAccounts } from "./teacher-classroom-sim/bootstrap.mjs";
import { loadState, saveState, loadManifest, isAlreadyRun, recordRun, ensureStateDir } from "./teacher-classroom-sim/state.mjs";
import { resolveSubjectForRun, pickTopicsForDay } from "./teacher-classroom-sim/subjects.mjs";
import { generateDailyPlan } from "./teacher-classroom-sim/daily-plan.mjs";
import { runClassroomSimulation } from "./teacher-classroom-sim/orchestrator.mjs";
import { fetchTeacherInsights, printRunSummary, passwordNoteFromConfig } from "./teacher-classroom-sim/output.mjs";

async function main() {
  const config = parseConfig();
  ensureStateDir(config.stateDir);

  console.log("Teacher Classroom Daily Simulation");
  console.log(`  grade=${config.grade} date=${config.date} baseUrl=${config.baseUrl}`);
  console.log(`  stateDir=${config.stateDir}`);

  const subject = resolveSubjectForRun({
    grade: config.grade,
    date: config.date,
    subjectOverride: config.subjectOverride,
  });
  const topics = pickTopicsForDay({
    subject,
    grade: config.grade,
    date: config.date,
    count: config.topicsPerDay,
  });

  const { admin, manifest, stats } = await bootstrapSimulation({
    grade: config.grade,
    stateDir: config.stateDir,
    teacherPassword: config.teacherPassword,
    parentPassword: config.parentPassword,
    studentPin: config.studentPin,
  });

  if (config.resetActivity) {
    await resetSimActivity(admin, manifest);
    const { state: freshState } = loadState(config.stateDir);
    freshState.runs = [];
    saveState(config.stateDir, freshState);
    console.log("reset-activity: complete (sim students only)");
    if (!config.dryRun && !config.printOnly) {
      // continue to run after reset unless print-only
    }
  }

  const { state } = loadState(config.stateDir);
  if (isAlreadyRun(state, { date: config.date, grade: config.grade, subject }) && !config.force) {
    console.log(
      `\nSKIP: already ran successfully for date=${config.date} grade=${config.grade} subject=${subject}. Use --force=true to re-run.`
    );
    const insights = await fetchTeacherInsights(admin, manifest);
    await printRunSummary({
      config: { ...config, subjectOverride: subject },
      manifest,
      bootstrapStats: stats,
      plan: { subject, topics, summary: { studied: 0, skipped: 0, totalSessions: 0 }, students: {} },
      runResult: { verdict: "skipped", sessionsCreated: 0, answersCreated: 0 },
      insights,
      passwordNote: passwordNoteFromConfig(config),
    });
    process.exit(0);
  }

  const plan = generateDailyPlan({
    date: config.date,
    grade: config.grade,
    subject,
    topics,
    manifest,
    state,
    topicsPerDay: config.topicsPerDay,
  });

  const artifactsDir = makeArtifactsDir({
    repoRoot: config.repoRoot,
    date: config.date,
    subject,
  });

  if (config.printOnly) {
    console.log("\n--print-only: manifest + plan\n");
    console.log(JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(plan, null, 2));
    process.exit(0);
  }

  if (config.dryRun) {
    console.log("\n--dry-run: plan only (no Playwright)\n");
    console.log(JSON.stringify(plan, null, 2));
    process.exit(0);
  }

  const runResult = await runClassroomSimulation({
    plan,
    baseUrl: config.baseUrl,
    headed: config.headed,
    artifactsDir,
  });

  if (runResult.verdict === "fail" || runResult.answersCreated === 0) {
    console.error("\nRun FAILED — state not advanced.");
    process.exit(1);
  }

  const nextState = recordRun(state, {
    date: config.date,
    grade: config.grade,
    subject,
    status: runResult.verdict,
    sessionsCreated: runResult.sessionsCreated,
    answersCreated: runResult.answersCreated,
    studied: plan.summary.studied,
    at: new Date().toISOString(),
  });
  saveState(config.stateDir, nextState);

  const insights = await fetchTeacherInsights(admin, manifest);
  const untouched = await verifyUntouchedAccounts(admin);

  await printRunSummary({
    config,
    manifest,
    bootstrapStats: stats,
    plan,
    runResult,
    insights,
    passwordNote: passwordNoteFromConfig(config),
  });

  console.log("Untouched account checks:");
  for (const c of untouched) {
    console.log(`  ${c.name}: ${c.value}`);
  }

  console.log(`Artifacts: ${artifactsDir}`);
  process.exit(runResult.verdict === "fail" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
