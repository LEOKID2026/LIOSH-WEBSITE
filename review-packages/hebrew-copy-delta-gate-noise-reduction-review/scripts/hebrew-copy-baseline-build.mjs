/**
 * Build Hebrew copy baseline from existing inventory workbooks.
 * Run: node scripts/hebrew-copy-baseline-build.mjs [--dry-run] [--from-reports] [--version v1.0.0] [--allow-partial]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

import {
  INVENTORY_SOURCES,
  computeBaselineKey,
  computeTextHash,
  decodeJsStringLiteral,
  mapBaselineStatus,
  writeJsonl,
} from "./lib/hebrew-copy-scan-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {
    dryRun: false,
    fromReports: true,
    version: "v1.0.1",
    allowPartial: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--from-reports") args.fromReports = true;
    else if (a === "--allow-partial") args.allowPartial = true;
    else if (a === "--version" && argv[i + 1]) args.version = argv[++i];
  }
  return args;
}

function pickText(row, textFields) {
  for (const f of textFields) {
    const v = String(row[f] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function loadApprovedIds() {
  const approved = new Set();
  const ownerDir = join(ROOT, "hebrew-owner-review");
  if (!existsSync(ownerDir)) return approved;
  return approved;
}

function ingestInventory(source, approvedIds) {
  const abs = join(ROOT, source.path);
  if (!existsSync(abs)) {
    return { missing: true, records: [], sheetCounts: {} };
  }
  const wb = XLSX.readFile(abs);
  const records = [];
  const sheetCounts = {};
  const seen = new Set();

  for (const sheetCfg of source.sheets) {
    const sh = wb.Sheets[sheetCfg.name];
    if (!sh) {
      sheetCounts[sheetCfg.name] = 0;
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(sh, { defval: "" });
    sheetCounts[sheetCfg.name] = rows.length;
    for (const row of rows) {
      const raw = decodeJsStringLiteral(pickText(row, sheetCfg.textFields));
      if (!raw || !/[\u0590-\u05FF]/.test(raw)) continue;
      const inventoryId = String(row.id || "").trim();
      const dedupe = `${source.domain}:${inventoryId}:${raw.slice(0, 80)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const isTemplate = Boolean(sheetCfg.isTemplate) || /\$\{/.test(raw);
      const visibility = String(row.visibility || "").replace(/-/g, "_");
      const contentType = String(row.content_type || row.copy_type || row.decision_type || "");
      let status = mapBaselineStatus(row, source.domain, visibility, contentType);
      if (inventoryId && approvedIds.has(inventoryId)) status = "approved";

      const textHash = computeTextHash(raw, isTemplate);
      const record = {
        baseline_key: "",
        domain: source.domain,
        inventory_id: inventoryId,
        normalized_text: raw.replace(/\s+/g, " ").trim(),
        raw_text: raw,
        text_hash: textHash,
        source_file: String(row.file || "").replace(/\\/g, "/"),
        source_line: Number(row.line) || 0,
        source_function: String(row.function || row.function_or_prompt || ""),
        content_type: contentType,
        visibility: visibility || "student_visible",
        is_template: isTemplate,
        template_variables: (raw.match(/\$\{[^}]+\}/g) || []).join(", "),
        status,
        risk_at_baseline: String(row.severity || row.risk || row.risk_level || ""),
        audience: String(row.audience || ""),
        surface: String(row.surface || ""),
        baseline_version: "",
        first_seen_at: new Date().toISOString(),
        inventory_source: source.path,
        inventory_sheet: sheetCfg.name,
      };
      record.baseline_key = computeBaselineKey(record);
      records.push(record);
    }
  }
  return { missing: false, records, sheetCounts };
}

function buildIndexes(records) {
  const baselineIndex = {};
  const fileIndex = {};
  for (const r of records) {
    if (!baselineIndex[r.text_hash]) baselineIndex[r.text_hash] = [];
    baselineIndex[r.text_hash].push(r.baseline_key);
    if (r.source_file) {
      if (!fileIndex[r.source_file]) fileIndex[r.source_file] = [];
      fileIndex[r.source_file].push(r.baseline_key);
    }
  }
  return { baselineIndex, fileIndex };
}

function domainSummary(records) {
  const byDomain = {};
  const byStatus = {};
  for (const r of records) {
    byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  return { byDomain, byStatus };
}

function main() {
  const args = parseArgs(process.argv);
  const outDir = join(ROOT, "data", "hebrew-copy-baseline", args.version);
  const approvedIds = loadApprovedIds();

  const missing = [];
  const allRecords = [];
  const sourceMeta = [];

  for (const source of INVENTORY_SOURCES) {
    const result = ingestInventory(source, approvedIds);
    if (result.missing) {
      missing.push(source.path);
      continue;
    }
    for (const r of result.records) r.baseline_version = args.version;
    allRecords.push(...result.records);
    sourceMeta.push({
      domain: source.domain,
      path: source.path,
      row_count: result.records.length,
      sheets: result.sheetCounts,
    });
  }

  if (missing.length && !args.allowPartial) {
    console.error(
      "hebrew-copy-baseline-build: missing inventory workbook(s):\n" +
        missing.map((p) => `  - ${p}`).join("\n") +
        "\nRun inventory builders first or pass --allow-partial"
    );
    process.exit(1);
  }

  const { baselineIndex, fileIndex } = buildIndexes(allRecords);
  const summary = domainSummary(allRecords);
  const manifest = {
    version: args.version,
    built_at: new Date().toISOString(),
    dry_run: args.dryRun,
    note: "Baseline is known-current-state only — not an approval ledger",
    inventory_sources: sourceMeta,
    total_records: allRecords.length,
    missing_inventories: missing,
    by_domain: summary.byDomain,
    by_status: summary.byStatus,
  };

  const paths = {
    baseline: join(outDir, "baseline.jsonl"),
    baselineIndex: join(outDir, "baseline-index.json"),
    fileIndex: join(outDir, "file-index.json"),
    domainSummary: join(outDir, "domain-summary.json"),
    manifest: join(outDir, "MANIFEST.json"),
  };

  if (!args.dryRun) {
    mkdirSync(outDir, { recursive: true });
    writeJsonl(paths.baseline, allRecords, false);
    writeFileSync(paths.baselineIndex, JSON.stringify(baselineIndex, null, 2), "utf8");
    writeFileSync(paths.fileIndex, JSON.stringify(fileIndex, null, 2), "utf8");
    writeFileSync(paths.domainSummary, JSON.stringify(summary, null, 2), "utf8");
    writeFileSync(paths.manifest, JSON.stringify(manifest, null, 2), "utf8");
  } else {
    writeJsonl(paths.baseline, allRecords, true);
  }

  console.log(JSON.stringify({ ...manifest, output_dir: outDir.replace(/\\/g, "/") }, null, 2));
}

main();
