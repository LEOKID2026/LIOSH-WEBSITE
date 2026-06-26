#!/usr/bin/env node
/**
 * Mass Virtual Students QA Simulation
 *
 * Planned cohort (not random) — provisions QA parents + students, seeds activity
 * via service-role DB writes (no browser per student), verifies parent reports.
 *
 * Pilot:
 *   node --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs \
 *     --students=60 --parents=6 --days=7 --minutesPerDay=30 --password=747975 \
 *     --subjects=math,geometry,hebrew,english,science --grades=g1,g2,g3,g4,g5,g6 \
 *     --mode=staging --timestampStamping=1
 *
 * Speed-pressure re-patch on existing run (writes DB):
 *   node --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs \
 *     --verify-only --runId=mass-YYYY-MM-DDTHH-MM-SS --patch-speed-pressure --no-sync-names
 *
 * Full seed includes speed-pressure cohort by default (--no-seed-speed-pressure to skip).
 *
 * Focus repro (all students same profile):
 *   ... --students=24 --parents=3 --focus-profile=fast_errors --write
 */
import { readFile } from "node:fs/promises";
import { bootstrapQaDbWriteGuard } from "./lib/db-write-guard.mjs";
import { buildStudentActivityPlan, seedStudentActivity } from "./lib/mass-virtual-students/activity-seeder.mjs";
import { writeAllArtifacts } from "./lib/mass-virtual-students/artifacts.mjs";
import { buildPlannedCohort } from "./lib/mass-virtual-students/cohort.mjs";
import { parseMassSimulationCli } from "./lib/mass-virtual-students/config.mjs";
import { BEHAVIOR_PROFILES, SUBJECT_LABELS_HE } from "./lib/mass-virtual-students/constants.mjs";
import { provisionMassAccounts } from "./lib/mass-virtual-students/provision.mjs";
import { patchSpeedPressureForStudents, seedSpeedPressureCohort } from "./lib/mass-virtual-students/speed-pressure-patch.mjs";
import { backfillParentActivityAttempts } from "./lib/mass-virtual-students/parent-activity-seeder.mjs";
import {
  buildCoverageRows,
  computePassVerdict,
  syncMassStudentDisplayNames,
  verifyParentReports,
} from "./lib/mass-virtual-students/reports.mjs";
import { createServiceClient } from "./lib/mass-virtual-students/supabase.mjs";

function isoTodayMinusDays(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days + 1);
  return d.toISOString().slice(0, 10);
}

function applyVerdict(summaryBase) {
  const v = computePassVerdict(summaryBase);
  return {
    ...summaryBase,
    ...v,
    verdict: v.finalVerdict,
  };
}

function logVerdicts(summary, reportDir) {
  console.log(
    `[mass-sim] infrastructure=${summary.infrastructureVerdict} engineCoverage=${summary.engineCoverageVerdict} final=${summary.finalVerdict} artifacts → ${reportDir}`,
  );
  if (summary.blockers?.length) console.log(`[mass-sim] blockers: ${summary.blockers.join(", ")}`);
}

async function runVerifyOnly(cfg) {
  bootstrapQaDbWriteGuard("run-mass-virtual-students", "mass virtual students QA verify", [
    ...cfg.argv,
    "--verify-only",
  ]);

  const manifest = JSON.parse(await readFile(`${cfg.reportDir}/manifest.json`, "utf8"));
  const prior = JSON.parse(await readFile(`${cfg.reportDir}/summary.json`, "utf8"));
  const { from, to } = prior.dateRange;

  console.log(`[mass-sim] verify-only runId=${cfg.runId} students=${manifest.students.length}`);

  if (cfg.patchParentAssigned) {
    const backfill = await backfillParentActivityAttempts({ runId: cfg.runId, endDay: to });
    console.log(
      `[mass-sim] parent-assigned backfill: ${backfill.backfilled} activities, ${backfill.skipped} skipped, ${backfill.errors.length} errors`,
    );
    if (backfill.errors.length) {
      for (const e of backfill.errors.slice(0, 5)) {
        console.warn(`  activity ${e.activityId}: ${e.error}`);
      }
    }
  }

  if (cfg.patchSpeedPressure) {
    const beforeCounts = prior.engineDecisionDebug?.actualCounts || {};
    const patch = await patchSpeedPressureForStudents({
      students: manifest.students,
      runId: cfg.runId,
      endDay: to,
    });
    patch.before = {
      speed_pressure_pattern: beforeCounts.speed_pressure_pattern ?? 0,
      missingDecisions: prior.missingDecisions || [],
      decisionsSeen: prior.decisionsSeen || [],
      actualCounts: beforeCounts,
    };
    console.log(
      `[mass-sim] speed-pressure patch: ${patch.studentsPatched} patched, ${patch.studentsSkipped} skipped, ${patch.studentsFailed} failed (${patch.answersInserted} answers, ${patch.speedShellsInserted} shells)`,
    );
    cfg._speedPressurePatchAudit = patch;
  }

  if (cfg.syncNames) {
    const nameSync = await syncMassStudentDisplayNames(manifest.students, { dryRun: false });
    console.log(`[mass-sim] synced ${nameSync.updated} student display names to Hebrew`);
    for (const u of nameSync.updates) {
      const st = manifest.students.find((s) => s.studentId === u.studentId);
      if (st) st.displayName = u.hebrewName;
    }
  }

  const reportVerification = await verifyParentReports({
    students: manifest.students,
    fromDate: from,
    toDate: to,
    maxReports: manifest.students.length,
    runId: cfg.runId,
  });

  const englishIssues = reportVerification.results.filter((r) => r.englishHits?.length).length;
  const technicalIssues = reportVerification.results.filter((r) => r.technicalHits?.length).length;
  const hebrewIssues = reportVerification.results.filter((r) => r.hebrewIssues?.length).length;
  const slowApis = reportVerification.results.filter((r) => r.durationMs > 5000).length;

  const summaryBase = {
    ...prior,
    reportsGenerated: reportVerification.reportsGenerated,
    reportsFailed: reportVerification.reportsFailed,
    engineIssueCount: reportVerification.engineFindings.length,
    wordingIssues: englishIssues + technicalIssues,
    hebrewIssues,
    englishIssues,
    technicalIssues,
    apiErrors: reportVerification.errors.length,
    slowApis,
    decisionsSeen: reportVerification.decisionsSeen,
    missingDecisions: reportVerification.missingDecisions,
    englishAnalysis: reportVerification.englishAnalysis,
    engineDecisionDebug: reportVerification.engineDecisionDebug,
    topicCoverage: reportVerification.topicCoverage,
    parentAssignedDebug: reportVerification.parentAssignedDebug,
    speedPressureBridgeDebug: reportVerification.speedPressureBridgeDebug,
    speedPressurePatched: cfg.patchSpeedPressure || false,
    speedPressurePatchAudit: cfg._speedPressurePatchAudit
      ? {
          ...cfg._speedPressurePatchAudit,
          after: {
            speed_pressure_pattern:
              reportVerification.engineDecisionDebug?.actualCounts?.speed_pressure_pattern ?? 0,
            missingDecisions: reportVerification.missingDecisions,
            decisionsSeen: reportVerification.decisionsSeen,
            actualCounts: reportVerification.engineDecisionDebug?.actualCounts || {},
          },
        }
      : undefined,
    parentAssignedBackfilled: cfg.patchParentAssigned || false,
    verifyOnly: true,
    verifiedAt: new Date().toISOString(),
  };

  const summary = applyVerdict(summaryBase);

  await writeAllArtifacts(cfg.reportDir, {
    runId: cfg.runId,
    studentPin: cfg.studentPin,
    parents: manifest.parents,
    manifest,
    coverageRows: buildCoverageRows({
      cohort: manifest.students,
      seededStats: { bySubjectGrade: {} },
      subjects: cfg.subjects,
      grades: cfg.grades,
    }),
    engineFindings: reportVerification.engineFindings,
    reportResults: reportVerification.results,
    errors: reportVerification.errors,
    summary,
  });

  logVerdicts(summary, cfg.reportDir);
  if (summary.finalVerdict !== "PASS") process.exit(1);
}

async function main() {
  const cfg = parseMassSimulationCli();
  if (cfg.verifyOnly) {
    await runVerifyOnly(cfg);
    return;
  }
  const guard = bootstrapQaDbWriteGuard("run-mass-virtual-students", "mass virtual students QA seed", cfg.argv);

  console.log(`[mass-sim] runId=${cfg.runId} students=${cfg.students} parents=${cfg.parents} days=${cfg.days}${cfg.focusProfile ? ` focus=${cfg.focusProfile}` : ""}`);

  const { cohort, studentsPerParent, coverageMatrix } = buildPlannedCohort({
    students: cfg.students,
    parents: cfg.parents,
    subjects: cfg.subjects,
    grades: cfg.grades,
    runId: cfg.runId,
    focusProfile: cfg.focusProfile,
  });

  const provisioned = await provisionMassAccounts({
    cohort,
    parents: cfg.parents,
    studentsPerParent,
    password: cfg.password,
    studentPin: cfg.studentPin,
    emailDomain: cfg.emailDomain,
    runId: cfg.runId,
    dryRun: cfg.dryRun || guard.isDryRun,
  });

  if (provisioned.dryRun) {
    console.log("[mass-sim] dry-run — skipping DB seed + reports");
    await writeAllArtifacts(cfg.reportDir, {
      runId: cfg.runId,
      studentPin: cfg.studentPin,
      parents: provisioned.parents.map((p) => ({
        ...p,
        password: cfg.password,
        childrenCount: p.children?.length ?? 0,
      })),
      manifest: { runId: cfg.runId, dryRun: true, cohort, coverageMatrix },
      coverageRows: buildCoverageRows({
        cohort,
        seededStats: { bySubjectGrade: {} },
        subjects: cfg.subjects,
        grades: cfg.grades,
      }),
      engineFindings: [],
      reportResults: [],
      errors: [],
      summary: {
        runId: cfg.runId,
        verdict: "DRY_RUN",
        parentsCreated: cfg.parents,
        studentsCreated: cfg.students,
        simulatedDays: cfg.days,
        dryRun: true,
      },
    });
    console.log(`[mass-sim] artifacts → ${cfg.reportDir}`);
    return;
  }

  const supabase = createServiceClient();
  const startDay = isoTodayMinusDays(cfg.days);
  const endDay = isoTodayMinusDays(1);

  let totalAnswers = 0;
  let totalSessions = 0;
  let totalParentActivities = 0;
  const seedErrors = [];
  const bySubjectGrade = {};

  for (const student of provisioned.students) {
    const cohortStudent = cohort.find((c) => c.login === student.login);
    const plan = buildStudentActivityPlan(
      { ...cohortStudent, parentId: student.parentId, studentId: student.studentId },
      { days: cfg.days, minutesPerDay: cfg.minutesPerDay, startDay, runId: cfg.runId },
    );

    const seeded = await seedStudentActivity(supabase, student, plan, cfg.runId);
    totalAnswers += seeded.answerCount;
    totalSessions += seeded.sessionCount;
    totalParentActivities += seeded.parentActivityCount;
    seedErrors.push(...seeded.errors);

    const key = `${student.primarySubject}:${student.grade}`;
    bySubjectGrade[key] = (bySubjectGrade[key] || 0) + 1;
  }

  let speedPressureSeedAudit = null;
  if (cfg.seedSpeedPressure) {
    const seedAudit = await seedSpeedPressureCohort({
      students: provisioned.students,
      runId: cfg.runId,
      endDay,
    });
    totalAnswers += seedAudit.answersInserted || 0;
    totalSessions += (seedAudit.speedShellsInserted || 0) + (seedAudit.practiceSessionsInserted || 0);
    speedPressureSeedAudit = seedAudit;
    console.log(
      `[mass-sim] speed-pressure cohort: ${seedAudit.studentsPatched} patched, ${seedAudit.studentsSkipped} skipped, ${seedAudit.studentsFailed} failed (${seedAudit.answersInserted} answers, ${seedAudit.speedShellsInserted} shells)`,
    );
  }

  const reportVerification = await verifyParentReports({
    students: provisioned.students,
    fromDate: startDay,
    toDate: endDay,
    maxReports: cfg.students,
    runId: cfg.runId,
  });

  const studentsByGrade = {};
  const studentsBySubject = {};
  const studentsByProfile = {};
  for (const s of provisioned.students) {
    studentsByGrade[s.grade] = (studentsByGrade[s.grade] || 0) + 1;
    studentsBySubject[s.primarySubject] = (studentsBySubject[s.primarySubject] || 0) + 1;
    studentsByProfile[s.profile] = (studentsByProfile[s.profile] || 0) + 1;
  }

  const englishIssues = reportVerification.results.filter((r) => r.englishHits?.length).length;
  const technicalIssues = reportVerification.results.filter((r) => r.technicalHits?.length).length;
  const hebrewIssues = reportVerification.results.filter((r) => r.hebrewIssues?.length).length;
  const slowApis = reportVerification.results.filter((r) => r.durationMs > 5000).length;

  if (speedPressureSeedAudit) {
    speedPressureSeedAudit.after = {
      speed_pressure_pattern:
        reportVerification.engineDecisionDebug?.actualCounts?.speed_pressure_pattern ?? 0,
      missingDecisions: reportVerification.missingDecisions,
      decisionsSeen: reportVerification.decisionsSeen,
      actualCounts: reportVerification.engineDecisionDebug?.actualCounts || {},
    };
  }

  const subjectCoverageGaps = cfg.subjects.filter((sub) =>
    cfg.grades.every((g) => (bySubjectGrade[`${sub}:${g}`] || 0) === 0),
  );
  const gradeCoverageGaps = cfg.grades.filter((g) =>
    cfg.subjects.every((sub) => (bySubjectGrade[`${sub}:${g}`] || 0) === 0),
  );

  const summaryBase = {
    runId: cfg.runId,
    parentsCreated: provisioned.parents.length,
    studentsCreated: provisioned.students.length,
    studentsByGrade,
    studentsBySubject,
    studentsByProfile,
    simulatedDays: cfg.days,
    totalAnswers,
    totalSessions,
    totalParentActivities,
    reportsGenerated: reportVerification.reportsGenerated,
    reportsFailed: reportVerification.reportsFailed,
    engineIssueCount: reportVerification.engineFindings.length,
    wordingIssues: englishIssues + technicalIssues,
    hebrewIssues,
    englishIssues,
    technicalIssues,
    apiErrors: seedErrors.length + reportVerification.errors.length,
    slowApis,
    decisionsSeen: reportVerification.decisionsSeen,
    missingDecisions: reportVerification.missingDecisions,
    englishAnalysis: reportVerification.englishAnalysis,
    engineDecisionDebug: reportVerification.engineDecisionDebug,
    topicCoverage: reportVerification.topicCoverage,
    parentAssignedDebug: reportVerification.parentAssignedDebug,
    speedPressureBridgeDebug: reportVerification.speedPressureBridgeDebug,
    speedPressureSeedAudit,
    seedSpeedPressure: cfg.seedSpeedPressure,
    focusProfile: cfg.focusProfile || null,
    subjectCoverageGaps,
    gradeCoverageGaps,
    lowCoverageTopics: subjectCoverageGaps.map((s) => SUBJECT_LABELS_HE[s] || s),
    lowCoverageSubskills: [],
    profilesAvailable: BEHAVIOR_PROFILES.map((p) => p.id),
    dateRange: { from: startDay, to: endDay },
    timestampStamping: cfg.timestampStamping,
    mode: cfg.mode,
  };

  const summary = applyVerdict({
    ...summaryBase,
    subjectCoverageGaps,
    gradeCoverageGaps,
  });

  await writeAllArtifacts(cfg.reportDir, {
    runId: cfg.runId,
    studentPin: cfg.studentPin,
    parents: provisioned.parents,
    manifest: {
      runId: cfg.runId,
      emailDomain: cfg.emailDomain,
      parents: provisioned.parents,
      students: provisioned.students,
      createdAt: new Date().toISOString(),
    },
    coverageRows: buildCoverageRows({
      cohort,
      seededStats: { bySubjectGrade },
      subjects: cfg.subjects,
      grades: cfg.grades,
    }),
    engineFindings: reportVerification.engineFindings,
    reportResults: reportVerification.results,
    errors: [...seedErrors, ...reportVerification.errors],
    summary,
  });

  logVerdicts(summary, cfg.reportDir);
  if (summary.finalVerdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err?.message || err);
  process.exit(1);
});
