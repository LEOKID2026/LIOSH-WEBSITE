/**
 * Write final subject simulation artifacts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  FINAL_SIMULATION_SUBJECT_KEYS,
  FINAL_SIMULATION_SUBJECT_LABELS_HE,
  SIMULATION_CHECK_STEPS,
} from "./constants.mjs";

export async function writeSimulationReports(outputDir, payload) {
  await mkdir(outputDir, { recursive: true });

  const summary = {
    runId: payload.runId,
    generatedAt: payload.generatedAt,
    baseUrl: payload.baseUrl,
    port: payload.port,
    autoPort: payload.autoPort,
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
    `- **Verdict:** ${summary.verdict}`,
    "",
    "## Subjects",
    "",
    "| Subject | Result |",
    "| --- | --- |",
  ];

  for (const key of FINAL_SIMULATION_SUBJECT_KEYS) {
    const row = summary.subjects[key];
    const label = FINAL_SIMULATION_SUBJECT_LABELS_HE[key] || key;
    lines.push(`| ${label} | ${row?.pass ? "PASS" : "FAIL"} |`);
  }

  if (failures?.length) {
    lines.push("", "## Failures", "");
    for (const f of failures) {
      lines.push(
        `- **${f.subjectLabel || f.subject}** · grade ${f.grade ?? "?"} · topic ${f.topic ?? "?"} · step \`${f.step}\`: ${f.error}`
      );
      if (f.logFile) lines.push(`  - log: ${f.logFile}`);
    }
  }

  lines.push("", "## Check steps", "", SIMULATION_CHECK_STEPS.map((s) => `- ${s}`).join("\n"), "");
  return `${lines.join("\n")}\n`;
}

export function printConsoleSummary({ subjects, failures, allPass, port, autoPort, outputDir }) {
  const w = 28;
  console.log("");
  console.log("=".repeat(56));
  console.log("  FINAL SUBJECT SIMULATION — RESULTS");
  console.log(`  Port: ${port}${autoPort ? " (auto-selected)" : ""}`);
  console.log(`  Logs: ${outputDir}`);
  console.log("=".repeat(56));
  console.log("");

  for (const key of FINAL_SIMULATION_SUBJECT_KEYS) {
    const label = FINAL_SIMULATION_SUBJECT_LABELS_HE[key] || key;
    const pass = subjects[key]?.pass;
    console.log(`${label.padEnd(w)} — ${pass ? "PASS" : "FAIL"}`);
  }

  console.log("");
  console.log(allPass ? "ALL SUBJECTS PASS" : "FAILURES FOUND");

  if (failures?.length) {
    console.log("");
    console.log("Failure details:");
    for (const f of failures) {
      console.log(
        `  • ${f.subjectLabel || f.subject} | grade ${f.grade ?? "?"} | topic ${f.topic ?? "?"} | ${f.step} | ${f.error}`
      );
      if (f.logFile) console.log(`    log: ${f.logFile}`);
    }
  }
  console.log("");
}
