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
import { writeAllArtifacts, writeCheckpoint, writeProvisionManifest } from "./lib/mass-virtual-students/artifacts.mjs";
import { buildPlannedCohort } from "./lib/mass-virtual-students/cohort.mjs";
import { parseMassSimulationCli } from "./lib/mass-virtual-students/config.mjs";
import { BEHAVIOR_PROFILES, SUBJECT_LABELS_HE } from "./lib/mass-virtual-students/constants.mjs";
import { provisionMassAccounts } from "./lib/mass-virtual-students/provision.mjs";
import { patchSpeedPressureForStudents, seedSpeedPressureCohort } from "./lib/mass-virtual-students/speed-pressure-patch.mjs";
import { backfillParentActivityAttempts } from "./lib/mass-virtual-students/parent-activity-seeder.mjs";
import { printPreflightReport, runMassSimulationPreflight } from "./lib/mass-virtual-students/preflight.mjs";
import {
  buildCoverageRows,
  buildLevelCoverageRows,
  computePassVerdict,
  syncMassStudentDisplayNames,
  verifyParentReports,
} from "./lib/mass-virtual-students/reports.mjs";
import {
  displayLevelsForSubject,
  resolvePracticeDisplayLevel,
  summarizeCohortLevelDistribution,
} from "./lib/mass-virtual-students/display-level-cohort.mjs";
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

function simLog(msg) {
  console.log(msg);
  if (process.stdout.isTTY) return;
  try {
    process.stdout.write("");
  } catch {
    /* ignore */
  }
}

async function loadResumeCheckpoint(reportDir) {
  try {
    return JSON.parse(await readFile(`${reportDir}/checkpoint.json`, "utf8"));
  } catch {
    return null;
  }
}

async function loadExistingManifest(reportDir) {
  try {
    return JSON.parse(await readFile(`${reportDir}/manifest.json`, "utf8"));
  } catch {
    return null;
  }
}

async function loadSeededStudentIdsFromDb(supabase, runId) {
  const ids = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("learning_sessions")
      .select("student_id")
      .contains("metadata", { massVirtualStudents: runId })
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id) ids.add(row.student_id);
    }
    if (data.length < 1000) break;
  }
  return ids;
}

function startHeartbeat(runId, getStats) {
  const started = Date.now();
  return setInterval(() => {
    const s = getStats();
    simLog(
      `[mass-sim] runId=${runId} phase=${s.phase} seeded=${s.studentsSeeded}/${s.studentsTotal} answers=${s.totalAnswers} sessions=${s.totalSessions} elapsed=${Math.round((Date.now() - started) / 60000)}m`,
    );
  }, 5 * 60 * 1000);
}

function abortOnSpeedPressureMissing(summary, reportDir) {
  if (!(summary.missingDecisions || []).includes("speed_pressure_pattern")) return;
  console.error(
    "[mass-sim] STOP: speed_pressure_pattern missing — do NOT start a new 1000. Inspect speed-pressure debug in:",
    reportDir,
  );
  process.exit(1);
}

async function loadPriorSummaryForVerify(cfg, manifest) {
  try {
    return JSON.parse(await readFile(`${cfg.reportDir}/summary.json`, "utf8"));
  } catch {
    const checkpoint = await loadResumeCheckpoint(cfg.reportDir);
    const from = isoTodayMinusDays(cfg.days);
    const to = isoTodayMinusDays(1);
    console.log(
      `[mass-sim] verify-only: no summary.json — bootstrapping dateRange --days=${cfg.days} (${from}..${to})`,
    );
    return {
      runId: cfg.runId,
      dateRange: { from, to },
      parentsCreated: manifest.parents?.length ?? cfg.parents,
      studentsCreated: manifest.students?.length ?? cfg.students,
      simulatedDays: cfg.days,
      totalAnswers: checkpoint?.totalAnswers ?? null,
      totalSessions: checkpoint?.totalSessions ?? null,
      totalParentActivities: checkpoint?.totalParentActivities ?? null,
      mode: cfg.mode,
      timestampStamping: cfg.timestampStamping,
      seedSpeedPressure: cfg.seedSpeedPressure,
    };
  }
}

async function runVerifyOnly(cfg) {
  bootstrapQaDbWriteGuard("run-mass-virtual-students", "mass virtual students QA verify", [
    ...cfg.argv,
    "--verify-only",
  ]);

  const manifest = JSON.parse(await readFile(`${cfg.reportDir}/manifest.json`, "utf8"));
  const prior = await loadPriorSummaryForVerify(cfg, manifest);
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
    patchAudit: cfg._speedPressurePatchAudit || prior.speedPressureSeedAudit || null,
  });

  const bySubjectGrade = {};
  const bySubjectGradeLevel = {};
  for (const s of manifest.students) {
    const key = `${s.primarySubject}:${s.grade}`;
    bySubjectGrade[key] = (bySubjectGrade[key] || 0) + 1;
    const resolvedLevel = resolvePracticeDisplayLevel(s.primarySubject, s.displayLevel || "regular");
    const levelKey = `${s.primarySubject}:${s.grade}:${resolvedLevel}`;
    bySubjectGradeLevel[levelKey] = (bySubjectGradeLevel[levelKey] || 0) + 1;
  }

  const subjectCoverageGaps = cfg.subjects.filter((sub) =>
    cfg.grades.every((g) => (bySubjectGrade[`${sub}:${g}`] || 0) === 0),
  );
  const gradeCoverageGaps = cfg.grades.filter((g) =>
    cfg.subjects.every((sub) => (bySubjectGrade[`${sub}:${g}`] || 0) === 0),
  );
  const levelCoverageGaps = [];
  for (const subject of cfg.subjects) {
    for (const grade of cfg.grades) {
      for (const displayLevel of displayLevelsForSubject(subject)) {
        const levelKey = `${subject}:${grade}:${displayLevel}`;
        if ((bySubjectGradeLevel[levelKey] || 0) === 0) {
          levelCoverageGaps.push(levelKey);
        }
      }
    }
  }
  const studentsByDisplayLevel = summarizeCohortLevelDistribution(manifest.students, cfg.subjects);

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
    speedPressureTopicAlignmentDebug: reportVerification.speedPressureTopicAlignmentDebug,
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
    subjectCoverageGaps,
    gradeCoverageGaps,
    levelCoverageGaps,
    studentsByDisplayLevel,
  };

  const summary = applyVerdict({
    ...summaryBase,
    subjectCoverageGaps,
    gradeCoverageGaps,
    levelCoverageGaps,
  });

  await writeAllArtifacts(cfg.reportDir, {
    runId: cfg.runId,
    studentPin: cfg.studentPin,
    parents: manifest.parents,
    manifest,
    coverageRows: buildCoverageRows({
      cohort: manifest.students,
      seededStats: { bySubjectGrade },
      subjects: cfg.subjects,
      grades: cfg.grades,
    }),
    coverageLevelRows: buildLevelCoverageRows(manifest.students, cfg.subjects, cfg.grades, {
      bySubjectGradeLevel,
    }),
    engineFindings: reportVerification.engineFindings,
    reportResults: reportVerification.results,
    errors: reportVerification.errors,
    summary,
  });

  logVerdicts(summary, cfg.reportDir);
  abortOnSpeedPressureMissing(summary, cfg.reportDir);
  if (summary.finalVerdict !== "PASS") process.exit(1);
}

async function main() {
  const cfg = parseMassSimulationCli();

  const preflight = runMassSimulationPreflight({ subjects: cfg.subjects, grades: cfg.grades });
  printPreflightReport(preflight);
  if (cfg.preflightOnly) {
    process.exit(preflight.ok ? 0 : 1);
  }
  if (!preflight.ok) {
    process.exit(1);
  }

  if (cfg.verifyOnly) {
    await runVerifyOnly(cfg);
    return;
  }
  const guard = bootstrapQaDbWriteGuard("run-mass-virtual-students", "mass virtual students QA seed", cfg.argv);

  console.log(`[mass-sim] runId=${cfg.runId} students=${cfg.students} parents=${cfg.parents} days=${cfg.days}${cfg.focusProfile ? ` focus=${cfg.focusProfile}` : ""}`);

  const { cohort, studentsPerParent, coverageMatrix, levelCoverageMatrix } = buildPlannedCohort({
    students: cfg.students,
    parents: cfg.parents,
    subjects: cfg.subjects,
    grades: cfg.grades,
    runId: cfg.runId,
    focusProfile: cfg.focusProfile,
  });

  const existingManifest = cfg.resume ? await loadExistingManifest(cfg.reportDir) : null;
  let provisioned;

  if (existingManifest?.students?.length) {
    simLog(
      `[mass-sim] resume: reusing manifest (${existingManifest.students.length} students, ${existingManifest.parents?.length ?? 0} parents) — skipping provision`,
    );
    provisioned = {
      dryRun: false,
      parents: existingManifest.parents,
      students: existingManifest.students,
    };
  } else {
    simLog("[mass-sim] provisioning accounts (~12 min, no per-student log)...");
    provisioned = await provisionMassAccounts({
      cohort,
      parents: cfg.parents,
      studentsPerParent,
      password: cfg.password,
      studentPin: cfg.studentPin,
      emailDomain: cfg.emailDomain,
      runId: cfg.runId,
      dryRun: cfg.dryRun || guard.isDryRun,
    });

    if (!provisioned.dryRun) {
      await writeProvisionManifest(cfg.reportDir, {
        runId: cfg.runId,
        emailDomain: cfg.emailDomain,
        parents: provisioned.parents,
        students: provisioned.students,
        createdAt: new Date().toISOString(),
        coverageMatrix,
        levelCoverageMatrix,
      });
      simLog(`[mass-sim] manifest written → ${cfg.reportDir}/manifest.json`);
    }
  }

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
      manifest: { runId: cfg.runId, dryRun: true, cohort, coverageMatrix, levelCoverageMatrix },
      coverageRows: buildCoverageRows({
        cohort,
        seededStats: { bySubjectGrade: {} },
        subjects: cfg.subjects,
        grades: cfg.grades,
      }),
      coverageLevelRows: buildLevelCoverageRows(cohort, cfg.subjects, cfg.grades, {}),
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
  const bySubjectGradeLevel = {};
  const seededStudentIds = new Set();

  const priorCheckpoint = cfg.resume ? await loadResumeCheckpoint(cfg.reportDir) : null;
  if (cfg.resume) {
    let fromCheckpoint = 0;
    if (priorCheckpoint?.seededStudentIds?.length) {
      for (const id of priorCheckpoint.seededStudentIds) seededStudentIds.add(id);
      fromCheckpoint = priorCheckpoint.seededStudentIds.length;
      totalAnswers = priorCheckpoint.totalAnswers || 0;
      totalSessions = priorCheckpoint.totalSessions || 0;
      totalParentActivities = priorCheckpoint.totalParentActivities || 0;
    }
    const fromDb = await loadSeededStudentIdsFromDb(supabase, cfg.runId);
    for (const id of fromDb) seededStudentIds.add(id);
    if (seededStudentIds.size) {
      simLog(
        `[mass-sim] resume: skipping ${seededStudentIds.size} students (checkpoint=${fromCheckpoint}, db=${fromDb.size})`,
      );
    }
  }

  const heartbeatStats = {
    phase: "seed",
    studentsSeeded: seededStudentIds.size,
    studentsTotal: provisioned.students.length,
    totalAnswers,
    totalSessions,
  };
  const heartbeat = startHeartbeat(cfg.runId, () => heartbeatStats);

  let seededCount = seededStudentIds.size;
  for (const student of provisioned.students) {
    if (seededStudentIds.has(student.studentId)) continue;

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
    seededStudentIds.add(student.studentId);
    seededCount += 1;

    const key = `${student.primarySubject}:${student.grade}`;
    bySubjectGrade[key] = (bySubjectGrade[key] || 0) + 1;

    const cohortLevel = cohortStudent?.displayLevel || "regular";
    const resolvedLevel = resolvePracticeDisplayLevel(student.primarySubject, cohortLevel);
    const levelKey = `${student.primarySubject}:${student.grade}:${resolvedLevel}`;
    bySubjectGradeLevel[levelKey] = (bySubjectGradeLevel[levelKey] || 0) + 1;

    heartbeatStats.studentsSeeded = seededCount;
    heartbeatStats.totalAnswers = totalAnswers;
    heartbeatStats.totalSessions = totalSessions;

    if (seededCount % cfg.progressEvery === 0 || seededCount === provisioned.students.length) {
      simLog(
        `[mass-sim] runId=${cfg.runId} phase=seed seeded=${seededCount}/${provisioned.students.length} answers=${totalAnswers} sessions=${totalSessions} login=${student.login}`,
      );
      await writeCheckpoint(cfg.reportDir, {
        runId: cfg.runId,
        phase: "seed",
        updatedAt: new Date().toISOString(),
        studentsSeeded: seededCount,
        studentsTotal: provisioned.students.length,
        seededStudentIds: [...seededStudentIds],
        totalAnswers,
        totalSessions,
        totalParentActivities,
        lastLogin: student.login,
        seedErrors,
      });
    }
  }

  clearInterval(heartbeat);
  heartbeatStats.phase = "speed-pressure";

  let speedPressureSeedAudit = null;
  await writeCheckpoint(cfg.reportDir, {
    runId: cfg.runId,
    phase: "speed-pressure",
    updatedAt: new Date().toISOString(),
    studentsSeeded: seededCount,
    studentsTotal: provisioned.students.length,
    seededStudentIds: [...seededStudentIds],
    totalAnswers,
    totalSessions,
    totalParentActivities,
    seedErrors,
  });
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
    patchAudit: speedPressureSeedAudit,
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

  const levelCoverageGaps = [];
  for (const subject of cfg.subjects) {
    for (const grade of cfg.grades) {
      for (const displayLevel of displayLevelsForSubject(subject)) {
        const levelKey = `${subject}:${grade}:${displayLevel}`;
        if ((bySubjectGradeLevel[levelKey] || 0) === 0) {
          levelCoverageGaps.push(levelKey);
        }
      }
    }
  }

  const studentsByDisplayLevel = summarizeCohortLevelDistribution(cohort, cfg.subjects);

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
    speedPressureTopicAlignmentDebug: reportVerification.speedPressureTopicAlignmentDebug,
    speedPressureSeedAudit,
    seedSpeedPressure: cfg.seedSpeedPressure,
    focusProfile: cfg.focusProfile || null,
    subjectCoverageGaps,
    gradeCoverageGaps,
    levelCoverageGaps,
    studentsByDisplayLevel,
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
    levelCoverageGaps,
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
    coverageLevelRows: buildLevelCoverageRows(cohort, cfg.subjects, cfg.grades, {
      bySubjectGradeLevel,
    }),
    engineFindings: reportVerification.engineFindings,
    reportResults: reportVerification.results,
    errors: [...seedErrors, ...reportVerification.errors],
    summary,
  });

  logVerdicts(summary, cfg.reportDir);
  abortOnSpeedPressureMissing(summary, cfg.reportDir);
  if (summary.finalVerdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err?.message || err);
  process.exit(1);
});
