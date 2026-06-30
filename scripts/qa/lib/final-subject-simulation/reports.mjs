/**
 * Write final subject simulation artifacts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ACTIVITY_CHECK_STEPS,
  FINAL_SIMULATION_SUBJECT_KEYS,
  formatLevelSummaryLine,
  LEVEL_CHECK_STEPS,
  SUBJECT_SETUP_STEPS,
} from "./constants.mjs";

export async function writeSimulationReports(outputDir, payload) {
  await mkdir(outputDir, { recursive: true });

  const summary = {
    runId: payload.runId,
    generatedAt: payload.generatedAt,
    baseUrl: payload.baseUrl,
    port: payload.port,
    autoPort: payload.autoPort,
    displayLevelModel: "regular/advanced (science regular-only)",
    allPass: payload.allPass,
    verdict: payload.allPass ? "ALL SUBJECTS PASS" : "FAILURES FOUND",
    subjects: payload.subjects,
    globalChecks: payload.globalChecks || {},
  };

  await writeFile(join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, "per-subject-results.json"), `${JSON.stringify(payload.subjects, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, "failures.json"), `${JSON.stringify(payload.failures, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, "summary.md"), buildSummaryMd(summary, payload.failures), "utf8");

  if (payload.rawLog != null) {
    await writeFile(join(outputDir, "raw-log.txt"), payload.rawLog, "utf8");
  }
}

function buildSummaryMd(summary, failures) {
  const lines = [
    `# Final Subject Simulation — ${summary.runId}`,
    "",
    `- **Generated:** ${summary.generatedAt}`,
    `- **Base URL:** ${summary.baseUrl}`,
    `- **Port:** ${summary.port}${summary.autoPort ? " (auto-selected)" : ""}`,
    `- **Display levels:** ${summary.displayLevelModel}`,
    `- **Verdict:** ${summary.verdict}`,
    "",
    "## Subjects (רגיל / מתקדם)",
    "",
  ];

  for (const key of FINAL_SIMULATION_SUBJECT_KEYS) {
    lines.push(`- ${formatLevelSummaryLine(key, summary.subjects[key] || {})}`);
  }

  if (failures?.length) {
    lines.push("", "## Failures", "");
    for (const f of failures) {
      lines.push(
        `- **${f.subjectLabel || f.subject}** · grade ${f.grade ?? "?"} · topic ${f.topic ?? "?"} · ${f.displayLevel ? `${f.displayLevel} · ` : ""}step \`${f.step}\`: ${f.error}`
      );
      if (f.logFile) lines.push(`  - log: ${f.logFile}`);
    }
  }

  lines.push(
    "",
    "## Setup steps",
    "",
    SUBJECT_SETUP_STEPS.map((s) => `- ${s}`).join("\n"),
    "",
    "## Per-level steps",
    "",
    LEVEL_CHECK_STEPS.map((s) => `- ${s}`).join("\n"),
    "",
    "## Activity steps",
    "",
    ACTIVITY_CHECK_STEPS.map((s) => `- ${s}`).join("\n"),
    ""
  );
  return `${lines.join("\n")}\n`;
}

export function printConsoleSummary({ subjects, failures, allPass, port, autoPort, outputDir }) {
  console.log("");
  console.log("=".repeat(60));
  console.log("  FINAL SUBJECT SIMULATION — RESULTS (רגיל / מתקדם)");
  console.log(`  Port: ${port}${autoPort ? " (auto-selected)" : ""}`);
  console.log(`  Logs: ${outputDir}`);
  console.log("=".repeat(60));
  console.log("");

  for (const key of FINAL_SIMULATION_SUBJECT_KEYS) {
    console.log(formatLevelSummaryLine(key, subjects[key] || {}));
  }

  console.log("");
  console.log(allPass ? "ALL SUBJECTS PASS" : "FAILURES FOUND");

  if (failures?.length) {
    console.log("");
    console.log("Failure details:");
    for (const f of failures) {
      console.log(
        `  • ${f.subjectLabel || f.subject} | grade ${f.grade ?? "?"} | topic ${f.topic ?? "?"} | ${f.displayLevel || f.step} | ${f.error}`
      );
      if (f.logFile) console.log(`    log: ${f.logFile}`);
    }
  }
  console.log("");
}

export function collectFailures(subjects, logFile) {
  const failures = [];
  for (const [subjectKey, result] of Object.entries(subjects)) {
    if (result.pass) continue;
    const label = result.subjectLabel || subjectKey;

    if (!result.setup?.subject_loads?.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: "subject_loads",
        error: result.setup.subject_loads.detail,
        logFile,
      });
      continue;
    }

    if (!result.advancedAbsent?.pass && result.regularOnly) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: "advanced_not_present",
        displayLevel: "advanced",
        error: result.advancedAbsent.detail,
        logFile,
      });
    }

    if (!result.levels?.regular?.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: "regular",
        displayLevel: "regular",
        error: result.levels.regular.error || result.error,
        logFile,
      });
    }

    if (!result.regularOnly && !result.levels?.advanced?.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: "advanced",
        displayLevel: "advanced",
        error: result.levels?.advanced?.error || result.error,
        logFile,
      });
    }

    if (!result.activities?.regular?.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: "regular_activity",
        error: result.activities.regular.detail,
        logFile,
      });
    }

    if (!result.activities?.advanced?.pass) {
      failures.push({
        subject: subjectKey,
        subjectLabel: label,
        grade: result.grade,
        topic: result.topic,
        step: result.regularOnly ? "advanced_activity_blocked" : "advanced_activity",
        displayLevel: result.regularOnly ? "advanced" : undefined,
        error: result.activities.advanced.detail,
        logFile,
      });
    }
  }
  return failures;
}
