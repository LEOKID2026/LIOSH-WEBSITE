/**
 * Hebrew copy delta gate — compare workspace scan to committed baseline.
 * Run: node scripts/hebrew-copy-delta-gate.mjs [--dry-run] [--warn-only] [--strict] [--domain ...] [--baseline-version v1.0.0]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectHybridScanFiles,
  collectScanFiles,
  computeDeltas,
  evaluateGate,
  readJsonl,
  scanWorkspace,
} from "./lib/hebrew-copy-scan-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {
    dryRun: false,
    warnOnly: false,
    strict: false,
    domain: null,
    baselineVersion: "v1.0.1",
    scanMode: "hybrid",
    suppressMovedOnly: true,
    suppressInternalOrphan: true,
    suppressInventoryNoise: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--warn-only") args.warnOnly = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "--domain" && argv[i + 1]) args.domain = argv[++i];
    else if (a === "--baseline-version" && argv[i + 1]) args.baselineVersion = argv[++i];
    else if (a === "--scan-mode" && argv[i + 1]) args.scanMode = argv[++i];
  }
  return args;
}

export function runDeltaGate(options = {}) {
  const args = {
    dryRun: false,
    warnOnly: false,
    strict: false,
    domain: null,
    baselineVersion: "v1.0.1",
    scanMode: "hybrid",
    suppressMovedOnly: true,
    suppressInternalOrphan: true,
    suppressInventoryNoise: true,
    root: ROOT,
    ...options,
  };

  const baselinePath = join(args.root, "data", "hebrew-copy-baseline", args.baselineVersion, "baseline.jsonl");
  if (!existsSync(baselinePath)) {
    throw new Error(`Baseline not found: ${relative(args.root, baselinePath)} — run hebrew-copy-baseline-build.mjs first`);
  }

  const baseline = readJsonl(baselinePath);
  const filteredBaseline = args.domain ? baseline.filter((b) => b.domain === args.domain) : baseline;

  let files;
  let newScanFiles = new Set();
  let baselineFileCount = 0;

  if (args.scanMode === "broad") {
    files = collectScanFiles(args.root, args.domain);
  } else if (args.scanMode === "baseline-only") {
    const hybrid = collectHybridScanFiles(filteredBaseline, args.root, args.domain);
    files = [...hybrid.baselineFiles].sort();
    baselineFileCount = files.length;
  } else {
    const hybrid = collectHybridScanFiles(filteredBaseline, args.root, args.domain);
    files = hybrid.files;
    newScanFiles = hybrid.newFiles;
    baselineFileCount = hybrid.baselineFiles.size;
  }

  let current = scanWorkspace(args.root, files);
  if (args.domain) current = current.filter((c) => c.domain === args.domain);

  const deltas = computeDeltas(filteredBaseline, current, {
    scannedFiles: files,
    newScanFiles,
    root: args.root,
    suppressMovedOnly: args.suppressMovedOnly !== false,
    suppressInternalOrphan: args.suppressInternalOrphan !== false,
    suppressInventoryNoise: args.suppressInventoryNoise !== false,
  });
  const gate = evaluateGate(deltas, { strict: args.strict, warnOnly: args.warnOnly || args.dryRun });

  const byType = {};
  const byRisk = {};
  for (const d of deltas) {
    byType[d.detected_change_type] = (byType[d.detected_change_type] || 0) + 1;
    byRisk[d.risk_level] = (byRisk[d.risk_level] || 0) + 1;
  }

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: args.dryRun,
    warn_only: args.warnOnly,
    strict: args.strict,
    domain_filter: args.domain,
    baseline_version: args.baselineVersion,
    scan_mode: args.scanMode,
    baseline_files_scanned: baselineFileCount,
    new_files_discovered: newScanFiles.size,
    baseline_records: filteredBaseline.length,
    files_scanned: files.length,
    current_strings: current.length,
    delta_count: deltas.length,
    by_change_type: byType,
    by_risk_level: byRisk,
    gate_pass: gate.pass,
    exit_code: gate.exitCode,
    critical_new_changed: gate.criticalNewChanged,
    medium_new_changed: gate.mediumNewChanged,
    unreviewed_critical_introduced: gate.criticalNewChanged > 0,
    deltas,
  };

  return summary;
}

function writeOutputs(summary, dryRun) {
  const outDir = join(ROOT, "reports");
  const jsonPath = join(outDir, "hebrew-copy-delta-summary.json");
  const mdPath = join(outDir, "hebrew-copy-delta-summary.md");

  const md = `# Hebrew Copy Delta Summary

Generated: ${summary.generated_at}

## Gate result

| Metric | Value |
|--------|------:|
| Baseline version | ${summary.baseline_version} |
| Scan mode | ${summary.scan_mode || "hybrid"} |
| Baseline files scanned | ${summary.baseline_files_scanned ?? "n/a"} |
| New files discovered | ${summary.new_files_discovered ?? 0} |
| Baseline records | ${summary.baseline_records} |
| Files scanned | ${summary.files_scanned} |
| Current strings | ${summary.current_strings} |
| **Delta count** | **${summary.delta_count}** |
| Gate pass | ${summary.gate_pass ? "yes" : "no"} |
| Critical new/changed | ${summary.critical_new_changed} |
| Medium new/changed | ${summary.medium_new_changed} |
| Unreviewed critical introduced | ${summary.unreviewed_critical_introduced ? "yes" : "no"} |

## By change type

${Object.entries(summary.by_change_type)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "- (none)"}

## By risk level

${Object.entries(summary.by_risk_level)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "- (none)"}

## Top critical deltas (first 15)

${summary.deltas
  .filter((d) => d.risk_level === "critical")
  .slice(0, 15)
  .map(
    (d, i) =>
      `${i + 1}. **${d.detected_change_type}** — \`${String(d.new_text || d.old_text_if_changed).slice(0, 80)}\` (${d.source_file}:${d.source_line})`
  )
  .join("\n") || "- (none)"}

> Baseline is known-current-state only — not approval. Review workbook: \`reports/hebrew-copy-delta-review.xlsx\`
`;

  if (dryRun) {
    return { jsonPath: relative(ROOT, jsonPath), mdPath: relative(ROOT, mdPath), skipped: true };
  }

  mkdirSync(outDir, { recursive: true });
  const { deltas, ...rest } = summary;
  writeFileSync(jsonPath, JSON.stringify({ ...rest, deltas }, null, 2), "utf8");
  writeFileSync(mdPath, md, "utf8");
  return { jsonPath: relative(ROOT, jsonPath), mdPath: relative(ROOT, mdPath), skipped: false };
}

function main() {
  const args = parseArgs(process.argv);
  let summary;
  try {
    summary = runDeltaGate({
      dryRun: args.dryRun,
      warnOnly: args.warnOnly,
      strict: args.strict,
      domain: args.domain,
      baselineVersion: args.baselineVersion,
      scanMode: args.scanMode,
    });
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }

  const outputs = writeOutputs(summary, args.dryRun);
  console.log(
    JSON.stringify(
      {
        ...outputs,
        delta_count: summary.delta_count,
        gate_pass: summary.gate_pass,
        by_change_type: summary.by_change_type,
        by_risk_level: summary.by_risk_level,
        critical_new_changed: summary.critical_new_changed,
      },
      null,
      2
    )
  );
  process.exit(args.dryRun || args.warnOnly ? 0 : summary.exit_code ?? (summary.gate_pass ? 0 : 1));
}

const isMain = (() => {
  try {
    const self = fileURLToPath(import.meta.url);
    const entry = process.argv[1];
    if (!entry) return false;
    return self === entry.replace(/\\/g, "/") || entry.includes("hebrew-copy-delta-gate.mjs");
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
