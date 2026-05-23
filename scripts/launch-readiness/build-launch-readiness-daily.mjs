#!/usr/bin/env node
/**
 * Launch Readiness Daily Gate — E1 MVP entry point.
 *
 * Reads existing artifacts only. Never writes to product, never writes to
 * Supabase. Aggregates per-layer status into a single READY / NOT READY /
 * BLOCKED / PARTIAL verdict.
 *
 * Usage:
 *   npm run qa:launch:daily-gate -- --date 2026-05-23
 *   node scripts/launch-readiness/build-launch-readiness-daily.mjs --date 2026-05-23
 *
 * Outputs:
 *   reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.json
 *   reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.md
 *
 * Exit codes:
 *   0 — gate produced an output file (even if verdict is BLOCKED/NOT READY)
 *   1 — script failed to produce an output file (rare; e.g. fs write error)
 *
 * Design rule: the script always exits 0 if the gate ran end-to-end. The
 * caller (laptop scheduler in E11) decides what to do with the verdict.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  aggregateLayers,
  computeCoverageGaps,
  extractLastNightlyStatus,
} from "./lib/aggregator.mjs";
import { computeVerdict, ALL_LAYERS } from "./lib/verdict-rules.mjs";

const SCHEMA_VERSION = "launch-readiness/v1";

function parseArgs(argv) {
  const args = { date: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--date" || a === "-d") {
      args.date = argv[++i];
    } else if (a?.startsWith("--date=")) {
      args.date = a.slice("--date=".length);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (!a?.startsWith("-") && /^\d{4}-\d{2}-\d{2}$/.test(a || "")) {
      // Accept a bare YYYY-MM-DD positional. Required because PowerShell
      // strips the `--` separator from `npm run X -- --date 2026-05-23`,
      // turning the call into `node script.mjs 2026-05-23`.
      if (!args.date) args.date = a;
    }
  }
  return args;
}

function isValidIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function repoRootFromHere() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // scripts/launch-readiness/build-... -> repo root is two levels up.
  return path.resolve(here, "..", "..");
}

function statusBadgeEmoji(status) {
  switch (status) {
    case "READY":
      return "[READY]";
    case "PARTIAL":
      return "[PARTIAL]";
    case "NOT READY":
      return "[NOT READY]";
    case "BLOCKED":
      return "[BLOCKED]";
    default:
      return "[UNKNOWN]";
  }
}

function layerStatusLabel(status) {
  switch (status) {
    case "pass":
      return "pass";
    case "warn":
      return "warn";
    case "fail":
      return "fail";
    case "not_run":
      return "not_run";
    default:
      return "unknown";
  }
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# Launch Readiness Daily — ${report.date}`);
  lines.push("");
  lines.push(`> נוצר אוטומטית ע"י \`scripts/launch-readiness/build-launch-readiness-daily.mjs\`.`);
  lines.push(`> Schema: \`${report.schemaVersion}\` · נוצר ב-${report.generatedAt}`);
  lines.push("");
  lines.push(`## פסיקה: ${statusBadgeEmoji(report.status)} ${report.status}`);
  lines.push("");
  lines.push(`**סיבה:** ${report.verdictReason}`);
  lines.push("");
  lines.push(`**צעד הבא מומלץ:** ${report.recommendedNextAction}`);
  lines.push("");
  lines.push(`**סטטוס ה-nightly לתאריך הזה:** \`${report.lastNightlyStatus}\``);
  lines.push("");

  // E1.1: surface filtered/full/unknown run kind right under the verdict so a
  // reader can never mistake a focused smoke for a full readiness run.
  const runKindLabel =
    report.runKind === "full"
      ? "full — ריצת nightly מלאה"
      : report.runKind === "filtered"
      ? "filtered — ריצת אימות ממוקדת (NOT full readiness)"
      : "unknown — לא ניתן לסווג";
  lines.push(
    `**סוג ריצת ה-nightly:** \`${report.runKind}\` (${runKindLabel}) · ` +
      `\`isFullNightlyRun = ${report.isFullNightlyRun}\``
  );
  if (report.runKind === "filtered") {
    lines.push("");
    lines.push(
      `> ⚠️ ריצה זו אינה ריצת readiness מלאה. אסור להכריז על READY על בסיס הריצה הזו. ` +
        `סיבה: ${report.nightlyFilterReason || "filtered/manual subset"}.`
    );
  } else if (report.runKind === "unknown") {
    lines.push("");
    lines.push(
      "> ⚠️ לא ניתן לסווג את ריצת ה-nightly כ-full או filtered. בדוק שלמות run-summary.json."
    );
  }
  lines.push("");

  // ---- Blockers ----
  lines.push(`## חוסמים (P0) — ${report.blockers.length}`);
  if (report.blockers.length === 0) {
    lines.push("אין חוסמים פתוחים.");
  } else {
    for (const b of report.blockers) {
      lines.push(`- **[${b.layer}]** ${b.detail}`);
      if (b.action) lines.push(`  - **פעולה:** ${b.action}`);
      if (b.source) lines.push(`  - מקור: \`${b.source}\``);
    }
  }
  lines.push("");

  // ---- Warnings ----
  lines.push(`## אזהרות (P1) — ${report.warnings.length}`);
  if (report.warnings.length === 0) {
    lines.push("אין אזהרות פתוחות.");
  } else {
    for (const w of report.warnings) {
      lines.push(`- **[${w.layer}]** ${w.detail}`);
      if (w.action) lines.push(`  - **פעולה:** ${w.action}`);
      if (w.source) lines.push(`  - מקור: \`${w.source}\``);
    }
  }
  lines.push("");

  // ---- Coverage gaps ----
  lines.push(`## פערי כיסוי — ${report.coverageGaps.length}`);
  if (report.coverageGaps.length === 0) {
    lines.push("אין פערי כיסוי מזוהים ברמת ה-MVP (חישוב מלא יבוא ב-E2).");
  } else {
    for (const g of report.coverageGaps) {
      lines.push(`- \`${g.kind}\`: ${g.detail}`);
    }
  }
  lines.push("");

  // ---- Layers table ----
  lines.push(`## שכבות (${ALL_LAYERS.length})`);
  lines.push("");
  lines.push("| # | שכבה | status | summary | source |");
  lines.push("|---|------|--------|---------|--------|");
  let idx = 1;
  for (const name of ALL_LAYERS) {
    const layer = report.layers[name] || {};
    const status = layerStatusLabel(layer.status);
    const summary = (layer.summary || "—").replace(/\|/g, "\\|");
    const source = layer.source ? `\`${layer.source}\`` : "—";
    lines.push(`| ${idx} | \`${name}\` | \`${status}\` | ${summary} | ${source} |`);
    idx++;
  }
  lines.push("");

  // ---- Footer ----
  lines.push("---");
  lines.push("");
  lines.push("> הקובץ הזה הוא Read-only aggregation. לא נכתב דבר ל-Supabase, לא נשתנו קבצי product, ולא רץ scheduler. ראה [docs/LAUNCH_READINESS_QA_MASTER_PLAN.md](../../../docs/LAUNCH_READINESS_QA_MASTER_PLAN.md).");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      "Usage: node scripts/launch-readiness/build-launch-readiness-daily.mjs --date YYYY-MM-DD"
    );
    process.exit(0);
  }

  if (!args.date) {
    console.error("ERROR: --date YYYY-MM-DD is required.");
    process.exit(1);
  }
  if (!isValidIsoDate(args.date)) {
    console.error(`ERROR: --date must be YYYY-MM-DD, got: ${args.date}`);
    process.exit(1);
  }

  const repoRoot = repoRootFromHere();
  const generatedAt = new Date().toISOString();

  console.log(`launch-readiness/daily-gate: date=${args.date} repoRoot=${repoRoot}`);

  // ---- Read all available artifacts (read-only) ----
  const { layers, sources, runMeta, coverageSummary } = await aggregateLayers({
    repoRoot,
    date: args.date,
  });

  // ---- Compute verdict (runMeta drives filtered-run guardrails — E1.1) ----
  const verdict = computeVerdict({ layers, runMeta });

  // ---- Compute coverage gaps (E2: from coverage-summary when available) ----
  const coverageGaps = computeCoverageGaps({ layers, sources, coverageSummary });

  // ---- Assemble final report ----
  // E1.1: top-level `isFullNightlyRun` + `runKind` make the filtered-run
  // signal a first-class field on the daily artifact, not just a buried
  // warning line.
  const report = {
    date: args.date,
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    status: verdict.status,
    verdictReason: verdict.verdictReason,
    isFullNightlyRun: runMeta ? runMeta.isFullNightlyRun === true : false,
    runKind: runMeta ? runMeta.runKind : "unknown",
    nightlyFilterReason: runMeta ? runMeta.filterReason : null,
    blockers: verdict.blockers,
    warnings: verdict.warnings,
    layers,
    coverageGaps,
    lastNightlyStatus: extractLastNightlyStatus(layers),
    recommendedNextAction: verdict.recommendedNextAction,
    sources,
  };

  // ---- Write artifacts ----
  const outDir = path.join(repoRoot, "reports", "launch-readiness", args.date);
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "LAUNCH_READINESS_DAILY.json");
  const mdPath = path.join(outDir, "LAUNCH_READINESS_DAILY.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  // ---- Stdout summary ----
  console.log("");
  console.log("=========== Launch Readiness Daily Gate ===========");
  console.log(`status        : ${report.status}`);
  console.log(`reason        : ${report.verdictReason}`);
  console.log(`blockers      : ${report.blockers.length}`);
  console.log(`warnings      : ${report.warnings.length}`);
  console.log(`coverageGaps  : ${report.coverageGaps.length}`);
  console.log(`nightly       : ${report.lastNightlyStatus}`);
  console.log(`runKind       : ${report.runKind} (isFullNightlyRun=${report.isFullNightlyRun})`);
  if (report.nightlyFilterReason) {
    console.log(`filterReason  : ${report.nightlyFilterReason}`);
  }
  console.log(`md            : ${path.relative(repoRoot, mdPath).split(path.sep).join("/")}`);
  console.log(`json          : ${path.relative(repoRoot, jsonPath).split(path.sep).join("/")}`);
  console.log("====================================================");
  console.log("");

  // Always exit 0 if the gate ran. The verdict itself is in the file.
  process.exit(0);
}

main().catch((err) => {
  console.error("launch-readiness/daily-gate FAILED:", err?.stack || err);
  process.exit(1);
});
