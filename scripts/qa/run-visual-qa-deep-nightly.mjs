#!/usr/bin/env node
/**
 * Deep / nightly Visual QA — wraps visual-qa-harness.mjs across subjects, cohorts, rounds.
 *
 * Never stops on ISSUES_FOUND / BLOCKED / exit 1|2 from a single harness run.
 *
 * Usage (full night):
 *   npx next dev -p 3002 -H 127.0.0.1
 *   $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3002"
 *   $env:VISUAL_QA_SAMPLES_PER_GRADE="50"
 *   $env:VISUAL_QA_DEEP_ROUNDS="2"
 *   node scripts/qa/run-visual-qa-deep-nightly.mjs
 *
 * Smoke:
 *   $env:VISUAL_QA_SAMPLES_PER_GRADE="2"
 *   $env:VISUAL_QA_DEEP_ROUNDS="1"
 *   node scripts/qa/run-visual-qa-deep-nightly.mjs
 *
 * Env:
 *   VISUAL_QA_DEEP_SUBJECTS       default geometry,math,hebrew,english
 *   VISUAL_QA_DEEP_ROUNDS         default 2
 *   VISUAL_QA_SAMPLES_PER_GRADE    default 50 (passed to harness)
 *   VISUAL_QA_RUN_TIMEOUT_MINUTES default 75 per harness run
 *   VISUAL_QA_DEEP_RUN_ID         optional override for reports/visual-qa-deep/<runId>/
 *   PLAYWRIGHT_BASE_URL / VISUAL_QA_BASE_URL
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoRoot } from "../virtual-student-qa/lib/config.mjs";

const REPO_ROOT = getRepoRoot();
const SCRIPT_DIR = join(REPO_ROOT, "scripts", "qa");
const HARNESS_PATH = join(SCRIPT_DIR, "visual-qa-harness.mjs");

const DEFAULT_SUBJECTS = ["geometry", "math", "hebrew", "english"];
const COHORTS = [
  { id: "primary", useSecondStudent: false },
  { id: "secondary", useSecondStudent: true },
];

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeRunId(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

function parseSubjects() {
  const raw = String(process.env.VISUAL_QA_DEEP_SUBJECTS || "").trim();
  if (!raw) return [...DEFAULT_SUBJECTS];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseDeepEnv() {
  const subjects = parseSubjects();
  const rounds = Math.max(1, Number(process.env.VISUAL_QA_DEEP_ROUNDS || 2) || 2);
  const samplesPerGrade = Math.max(
    1,
    Number(process.env.VISUAL_QA_SAMPLES_PER_GRADE || 50) || 50
  );
  const runTimeoutMinutes = Math.max(
    1,
    Number(process.env.VISUAL_QA_RUN_TIMEOUT_MINUTES || 75) || 75
  );
  const baseUrl =
    String(process.env.PLAYWRIGHT_BASE_URL || process.env.VISUAL_QA_BASE_URL || "http://127.0.0.1:3002").trim();
  const runId = String(process.env.VISUAL_QA_DEEP_RUN_ID || makeRunId()).trim();
  const progressIntervalMinutes = Math.max(
    1,
    Number(process.env.VISUAL_QA_DEEP_PROGRESS_MINUTES || 10) || 10
  );

  return {
    subjects,
    rounds,
    samplesPerGrade,
    runTimeoutMinutes,
    baseUrl,
    runId,
    progressIntervalMs: progressIntervalMinutes * 60_000,
    runTimeoutMs: runTimeoutMinutes * 60_000,
  };
}

function roundDirName(round) {
  return `round-${String(round).padStart(2, "0")}`;
}

function runOutputRel(runId, round, subject, cohort) {
  return join("reports", "visual-qa-deep", runId, roundDirName(round), subject, cohort);
}

function sampleSeedFor(runId, round, subject, cohort) {
  return `${runId}-r${round}-${subject}-${cohort}`;
}

function plannedSamplesPerRun(samplesPerGrade) {
  return samplesPerGrade * 6;
}

function issueKey(subject, sample, detail) {
  return [subject, sample.grade || "", sample.topic || "", detail].join("\0");
}

function extractIssueDetails(sample) {
  const details = sample?.issues?.details;
  if (Array.isArray(details) && details.length) return details;
  if (sample?.captureError) return [`sample capture failed: ${sample.captureError}`];
  return [];
}

async function readReportJson(reportPath) {
  try {
    const raw = await readFile(reportPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizeRunReport(report, fallbackStatus) {
  if (!report) {
    return {
      status: fallbackStatus,
      samplesCompleted: 0,
      samplesWithIssues: 0,
      blockedCount: fallbackStatus === "BLOCKED" || fallbackStatus === "BLOCKED_TIMEOUT" ? 1 : 0,
    };
  }
  const status = report.status || fallbackStatus;
  const samplesCompleted = report.samples?.length || 0;
  const samplesWithIssues = report.issueSummary?.samplesWithIssues ?? 0;
  const blockedCount = status === "BLOCKED" || status === "BLOCKED_TIMEOUT" ? 1 : 0;
  return { status, samplesCompleted, samplesWithIssues, blockedCount };
}

function spawnHarnessRun({ env, logPath }) {
  return new Promise((resolve) => {
    const chunks = [];
    const errChunks = [];
    let timedOut = false;
    let spawnError = null;

    let child;
    try {
      child = spawn(process.execPath, [HARNESS_PATH], {
        cwd: REPO_ROOT,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        exitCode: null,
        timedOut: false,
        spawnError: error?.message || String(error),
        stdout: "",
        stderr: "",
      });
      return;
    }

    const timeoutMs = Number(env.__RUN_TIMEOUT_MS) || 75 * 60_000;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }, 5000);
    }, timeoutMs);

    child.stdout.on("data", (buf) => chunks.push(buf));
    child.stderr.on("data", (buf) => errChunks.push(buf));

    child.on("error", (error) => {
      spawnError = error?.message || String(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(chunks).toString("utf8");
      const stderr = Buffer.concat(errChunks).toString("utf8");
      resolve({
        exitCode: code,
        timedOut,
        spawnError,
        stdout,
        stderr,
      });
    });
  });
}

function mapExitToStatus(exitCode, timedOut, spawnError) {
  if (spawnError) return "RUNNER_FAILED";
  if (timedOut) return "BLOCKED_TIMEOUT";
  if (exitCode === 0) return "VISUAL_QA_PASS";
  if (exitCode === 2) return "BLOCKED";
  if (exitCode === 1) return "ISSUES_FOUND";
  if (exitCode == null) return "RUNNER_FAILED";
  return "ISSUES_FOUND";
}

function printProgress(state) {
  const {
    runId,
    currentRound,
    totalRounds,
    currentSubject,
    currentCohort,
    currentStatus,
    completedRuns,
    totalRuns,
    completedSamples,
    plannedSamples,
    issuesSoFar,
    blockedSoFar,
    startedAt,
  } = state;

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  const avgSecPerRun = completedRuns > 0 ? elapsedSec / completedRuns : null;
  const remainingRuns = totalRuns - completedRuns;
  const etaSec =
    avgSecPerRun != null ? Math.round(avgSecPerRun * remainingRuns) : null;

  log("");
  log("--- Visual QA Deep progress ---");
  log(`runId: ${runId}`);
  log(`round: ${currentRound}/${totalRounds}`);
  log(`subject: ${currentSubject || "(pending)"}`);
  log(`cohort: ${currentCohort || "(pending)"}`);
  log(`last status: ${currentStatus || "(pending)"}`);
  log(`runs: ${completedRuns}/${totalRuns}`);
  log(`samples: ${completedSamples}/${plannedSamples}`);
  log(`issues so far: ${issuesSoFar}`);
  log(`blocked so far: ${blockedSoFar}`);
  log(`elapsed: ${elapsedSec}s`);
  if (etaSec != null) log(`estimated remaining: ${etaSec}s`);
  log("-------------------------------");
  log("");
}

function renderSummaryText(summary) {
  const lines = [
    "Visual QA Deep Nightly Summary",
    `runId: ${summary.runId}`,
    `status: ${summary.overallStatus}`,
    `startedAt: ${summary.startedAt}`,
    `finishedAt: ${summary.finishedAt}`,
    `durationSec: ${summary.durationSec}`,
    `baseUrl: ${summary.baseUrl}`,
    `subjects: ${summary.subjects.join(", ")}`,
    `rounds: ${summary.rounds}`,
    `samplesPerGrade: ${summary.samplesPerGrade}`,
    `totalPlannedSamples: ${summary.totalPlannedSamples}`,
    `totalCompletedSamples: ${summary.totalCompletedSamples}`,
    `totalIssues: ${summary.totalIssues}`,
    `totalBlocked: ${summary.totalBlocked}`,
    `totalPassedRuns: ${summary.totalPassedRuns}`,
    `totalIssueRuns: ${summary.totalIssueRuns}`,
    `totalBlockedRuns: ${summary.totalBlockedRuns}`,
    `runnerFailures: ${summary.runnerFailures}`,
    "",
    "=== Runs ===",
  ];

  for (const r of summary.runs) {
    lines.push(
      [
        `round ${r.round}`,
        r.subject,
        r.cohort,
        r.status,
        `exit=${r.exitCode ?? "null"}`,
        `samples=${r.samplesCompleted}`,
        `issues=${r.samplesWithIssues}`,
        `duration=${r.durationSec}s`,
        r.reportPath,
      ].join(" | ")
    );
  }

  lines.push("", "=== Top issues ===");
  for (const t of summary.topIssues) {
    lines.push(`${t.issueTitle} | count=${t.count} | subjects=${t.subjectsAffected.join(",")}`);
    if (t.exampleScreenshots?.length) {
      lines.push(`  screenshots: ${t.exampleScreenshots.slice(0, 3).join(", ")}`);
    }
  }

  lines.push("", "=== Grouped findings ===");
  for (const g of summary.groupedFindings) {
    lines.push(
      `${g.subject} / ${g.grade} / ${g.topic} / ${g.issueTitle} / ${g.count}`
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cfg = parseDeepEnv();
  const deepRoot = join(REPO_ROOT, "reports", "visual-qa-deep", cfg.runId);
  await mkdir(deepRoot, { recursive: true });

  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  const totalRuns = cfg.rounds * cfg.subjects.length * COHORTS.length;
  const totalPlannedSamples = totalRuns * plannedSamplesPerRun(cfg.samplesPerGrade);

  const manifest = {
    runId: cfg.runId,
    startedAt: startedAtIso,
    baseUrl: cfg.baseUrl,
    subjects: cfg.subjects,
    rounds: cfg.rounds,
    samplesPerGrade: cfg.samplesPerGrade,
    cohorts: COHORTS.map((c) => c.id),
    totalPlannedSamples,
    totalRuns,
    harnessPath: relative(REPO_ROOT, HARNESS_PATH),
  };

  await writeFile(join(deepRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const runRecords = [];
  const groupedMap = new Map();
  let completedRuns = 0;
  let completedSamples = 0;
  let issuesSoFar = 0;
  let blockedSoFar = 0;
  let runnerFailures = 0;

  let currentRound = 0;
  let currentSubject = "";
  let currentCohort = "";
  let currentStatus = "";

  const progressTimer = setInterval(() => {
    printProgress({
      runId: cfg.runId,
      currentRound,
      totalRounds: cfg.rounds,
      currentSubject,
      currentCohort,
      currentStatus,
      completedRuns,
      totalRuns,
      completedSamples,
      plannedSamples: totalPlannedSamples,
      issuesSoFar,
      blockedSoFar,
      startedAt,
    });
  }, cfg.progressIntervalMs);

  log(`Visual QA Deep runId=${cfg.runId}`);
  log(`Planned: ${totalRuns} harness runs, ${totalPlannedSamples} samples`);
  log(`Output: ${relative(REPO_ROOT, deepRoot)}`);

  for (let round = 1; round <= cfg.rounds; round += 1) {
    currentRound = round;
    for (const subject of cfg.subjects) {
      currentSubject = subject;
      for (const cohort of COHORTS) {
        currentCohort = cohort.id;
        const outRel = runOutputRel(cfg.runId, round, subject, cohort.id);
        const outAbs = join(REPO_ROOT, outRel);
        await mkdir(outAbs, { recursive: true });

        const sampleSeed = sampleSeedFor(cfg.runId, round, subject, cohort.id);
        const logPath = join(outAbs, "run.log");
        const reportJsonPath = join(outAbs, "visual-qa-report.json");
        const reportTxtPath = join(outAbs, "visual-qa-report.txt");
        const screenshotsPath = join(outRel, "screenshots");

        const harnessEnv = {
          ...process.env,
          PLAYWRIGHT_BASE_URL: cfg.baseUrl,
          VISUAL_QA_BASE_URL: cfg.baseUrl,
          VISUAL_QA_SUBJECT: subject,
          VISUAL_QA_SAMPLES_PER_GRADE: String(cfg.samplesPerGrade),
          VISUAL_QA_MODE: "sample",
          VISUAL_QA_OUTPUT_DIR: outRel,
          VISUAL_QA_SAMPLE_SEED: sampleSeed,
          __RUN_TIMEOUT_MS: String(cfg.runTimeoutMs),
        };

        if (cohort.useSecondStudent) {
          harnessEnv.VISUAL_QA_USE_SECOND_STUDENT = "1";
        } else {
          delete harnessEnv.VISUAL_QA_USE_SECOND_STUDENT;
        }
        delete harnessEnv.VISUAL_QA_ALLOW_MUTATIONS;

        log(
          `[${completedRuns + 1}/${totalRuns}] round ${round} ${subject} ${cohort.id} seed=${sampleSeed}`
        );

        const runStarted = Date.now();
        let result;
        try {
          result = await spawnHarnessRun({ env: harnessEnv, logPath });
        } catch (error) {
          result = {
            exitCode: null,
            timedOut: false,
            spawnError: error?.message || String(error),
            stdout: "",
            stderr: "",
          };
        }

        const runDurationSec = Math.round((Date.now() - runStarted) / 1000);
        const logBody = [
          `# Visual QA Deep harness run`,
          `runId=${cfg.runId}`,
          `round=${round}`,
          `subject=${subject}`,
          `cohort=${cohort.id}`,
          `sampleSeed=${sampleSeed}`,
          `exitCode=${result.exitCode}`,
          `timedOut=${result.timedOut}`,
          `spawnError=${result.spawnError || ""}`,
          `durationSec=${runDurationSec}`,
          "",
          "=== stdout ===",
          result.stdout || "",
          "",
          "=== stderr ===",
          result.stderr || "",
        ].join("\n");
        await writeFile(logPath, logBody, "utf8");

        let status = mapExitToStatus(result.exitCode, result.timedOut, result.spawnError);
        if (result.spawnError) {
          runnerFailures += 1;
        }

        const report = await readReportJson(reportJsonPath);
        if (report?.status) {
          status = result.timedOut ? "BLOCKED_TIMEOUT" : report.status;
        }

        const summary = summarizeRunReport(report, status);
        completedSamples += summary.samplesCompleted;
        issuesSoFar += summary.samplesWithIssues;
        if (summary.blockedCount || status === "BLOCKED" || status === "BLOCKED_TIMEOUT") {
          blockedSoFar += 1;
        }

        if (report?.samples?.length) {
          for (const sample of report.samples) {
            for (const detail of extractIssueDetails(sample)) {
              const key = issueKey(subject, sample, detail);
              const prev = groupedMap.get(key) || {
                subject,
                grade: sample.grade || "",
                topic: sample.topic || "",
                issueTitle: detail,
                issueCode: detail,
                count: 0,
                examples: [],
                screenshots: [],
              };
              prev.count += 1;
              if (prev.examples.length < 5) {
                prev.examples.push({
                  questionText: (sample.questionText || "").slice(0, 200),
                  studentLabel: sample.studentLabel,
                  topicDisplay: sample.topicDisplay,
                });
              }
              if (sample.screenshotPath && prev.screenshots.length < 5) {
                prev.screenshots.push(sample.screenshotPath);
              }
              groupedMap.set(key, prev);
            }
          }
        }

        if (status === "BLOCKED" && report?.blocked && !report.samples?.length) {
          const detail = report.blocked.whatYouNeed || report.blocked.detail || "blocked";
          const key = issueKey(subject, { grade: "?", topic: "?" }, `BLOCKED: ${detail}`);
          const prev = groupedMap.get(key) || {
            subject,
            grade: "?",
            topic: "?",
            issueTitle: `BLOCKED: ${detail}`,
            issueCode: "BLOCKED",
            count: 0,
            examples: [{ blocked: report.blocked }],
            screenshots: [],
          };
          prev.count += 1;
          groupedMap.set(key, prev);
        }

        if (status === "BLOCKED_TIMEOUT") {
          const key = issueKey(subject, { grade: "?", topic: "?" }, "BLOCKED_TIMEOUT");
          const prev = groupedMap.get(key) || {
            subject,
            grade: "?",
            topic: "?",
            issueTitle: "BLOCKED_TIMEOUT",
            issueCode: "BLOCKED_TIMEOUT",
            count: 0,
            examples: [],
            screenshots: [],
          };
          prev.count += 1;
          groupedMap.set(key, prev);
        }

        const runRecord = {
          round,
          subject,
          cohort: cohort.id,
          sampleSeed,
          status,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          spawnError: result.spawnError || null,
          samplesCompleted: summary.samplesCompleted,
          samplesWithIssues: summary.samplesWithIssues,
          blockedCount: summary.blockedCount,
          durationSec: runDurationSec,
          reportPath: relative(REPO_ROOT, reportJsonPath),
          reportTxtPath: relative(REPO_ROOT, reportTxtPath),
          logPath: relative(REPO_ROOT, logPath),
          screenshotsPath,
        };

        runRecords.push(runRecord);
        completedRuns += 1;
        currentStatus = status;

        log(
          `  → ${status} exit=${result.exitCode} samples=${summary.samplesCompleted} issues=${summary.samplesWithIssues} (${runDurationSec}s)`
        );

        printProgress({
          runId: cfg.runId,
          currentRound,
          totalRounds: cfg.rounds,
          currentSubject,
          currentCohort,
          currentStatus,
          completedRuns,
          totalRuns,
          completedSamples,
          plannedSamples: totalPlannedSamples,
          issuesSoFar,
          blockedSoFar,
          startedAt,
        });
      }
    }
  }

  clearInterval(progressTimer);

  const finishedAt = Date.now();
  const finishedAtIso = new Date(finishedAt).toISOString();
  const durationSec = Math.round((finishedAt - startedAt) / 1000);

  const totalPassedRuns = runRecords.filter((r) => r.status === "VISUAL_QA_PASS").length;
  const totalIssueRuns = runRecords.filter((r) => r.status === "ISSUES_FOUND").length;
  const totalBlockedRuns = runRecords.filter(
    (r) => r.status === "BLOCKED" || r.status === "BLOCKED_TIMEOUT"
  ).length;

  const groupedFindings = [...groupedMap.values()].sort((a, b) => b.count - a.count);

  const topIssueMap = new Map();
  for (const g of groupedFindings) {
    const prev = topIssueMap.get(g.issueTitle) || {
      issueTitle: g.issueTitle,
      count: 0,
      subjectsAffected: new Set(),
      gradesAffected: new Set(),
      exampleScreenshots: [],
    };
    prev.count += g.count;
    prev.subjectsAffected.add(g.subject);
    if (g.grade) prev.gradesAffected.add(g.grade);
    for (const shot of g.screenshots) {
      if (prev.exampleScreenshots.length < 5) prev.exampleScreenshots.push(shot);
    }
    topIssueMap.set(g.issueTitle, prev);
  }

  const topIssues = [...topIssueMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((t) => ({
      issueTitle: t.issueTitle,
      count: t.count,
      subjectsAffected: [...t.subjectsAffected],
      gradesAffected: [...t.gradesAffected],
      exampleScreenshots: t.exampleScreenshots,
    }));

  const overallStatus = runnerFailures
    ? "RUNNER_FAILED"
    : totalBlockedRuns
      ? "BLOCKED"
      : issuesSoFar
        ? "ISSUES_FOUND"
        : "VISUAL_QA_PASS";

  const summary = {
    runId: cfg.runId,
    startedAt: startedAtIso,
    finishedAt: finishedAtIso,
    durationSec,
    baseUrl: cfg.baseUrl,
    subjects: cfg.subjects,
    rounds: cfg.rounds,
    samplesPerGrade: cfg.samplesPerGrade,
    totalPlannedSamples,
    totalCompletedSamples: completedSamples,
    totalIssues: issuesSoFar,
    totalBlocked: blockedSoFar,
    totalPassedRuns,
    totalIssueRuns,
    totalBlockedRuns,
    runnerFailures,
    overallStatus,
    runs: runRecords,
    groupedFindings,
    topIssues,
    manifestPath: relative(REPO_ROOT, join(deepRoot, "manifest.json")),
  };

  const summaryJsonPath = join(deepRoot, "summary.json");
  const summaryTxtPath = join(deepRoot, "summary.txt");
  await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(summaryTxtPath, renderSummaryText(summary), "utf8");

  log("");
  log(`Deep Visual QA finished: ${overallStatus}`);
  log(`Summary: ${relative(REPO_ROOT, summaryJsonPath)}`);
  log(`Duration: ${durationSec}s | samples ${completedSamples}/${totalPlannedSamples} | issues ${issuesSoFar}`);

  process.exit(runnerFailures ? 3 : 0);
}

main().catch((error) => {
  log(`RUNNER_FAILED: ${error?.message || error}`);
  process.exit(3);
});
