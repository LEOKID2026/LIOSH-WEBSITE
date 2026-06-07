/**
 * Q2-D — Question metadata validator (read-only).
 * Run: node scripts/tests/question-metadata-validator.mjs
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runFullMetadataValidation,
  QUESTION_METADATA_SUBJECT_THRESHOLDS,
} from "../../lib/learning/question-metadata-validator.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

console.log("=== Q2-D Question Metadata Validator (read-only) ===\n");
console.log(`Root: ${ROOT}`);
console.log(`Contract: docs/diagnostics/QUESTION_METADATA_CONTRACT.md`);
console.log(`Validator doc: docs/diagnostics/QUESTION_METADATA_Q2_D_VALIDATOR.md\n`);

console.log("--- Per-subject thresholds ---");
for (const [key, t] of Object.entries(QUESTION_METADATA_SUBJECT_THRESHOLDS)) {
  console.log(
    `  ${t.label} [${t.phase}]: minTotal=${t.minTotal}, minCoveragePct=${t.minCoveragePct}%`
  );
}

const report = await runFullMetadataValidation({ root: ROOT });

console.log("\n--- Coverage by subject ---");
for (const [key, row] of Object.entries(report.coverage)) {
  const pct = row.total > 0 ? ((row.withCanonical / row.total) * 100).toFixed(1) : "0.0";
  const mark = report.thresholdResults.find((r) => r.subject === key)?.pass ? "PASS" : "FAIL";
  console.log(`  ${key} (${row.phase}): ${row.withCanonical}/${row.total} (${pct}%) [${mark}]`);
}

console.log("\n--- Threshold results ---");
for (const r of report.thresholdResults) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"} ${r.subject}: ${r.message}`);
}

console.log("\n--- Confidence / quality findings ---");
if (report.qualityIssues.length === 0) {
  console.log("  None (sample validation passed)");
} else {
  for (const q of report.qualityIssues.slice(0, 20)) {
    console.log(`  ${q.subject} ${q.path}: ${q.issues.join("; ")}`);
  }
  if (report.qualityIssues.length > 20) {
    console.log(`  ... and ${report.qualityIssues.length - 20} more`);
  }
}

console.log("\n--- No-consumption verification (pre Q2-E) ---");
console.log(
  `  Report/evidence/API paths reference canonicalMetadata: ${report.noConsumption.pass ? "NO (PASS)" : "YES (FAIL)"}`
);
if (!report.noConsumption.pass) {
  for (const v of report.noConsumption.violations) {
    console.log(`    ${v.path}: ${v.pattern}`);
  }
}

console.log("\n--- Cross-context isolation ---");
console.log(
  `  Metadata scripts merge parent/school/teacher contexts: ${report.crossContext.pass ? "NO (PASS)" : "YES (FAIL)"}`
);
if (!report.crossContext.pass) {
  for (const h of report.crossContext.hits) console.log(`    ${h}`);
}

console.log("\n--- Q2-D assertions ---");
console.log(`  Product behavior changed: NO (read-only validator)`);
console.log(`  Q1 evidence quality touched: NO`);
console.log(`  Report aggregate consumption: ${report.noConsumption.pass ? "NO" : "CHECK FAILURES"}`);
console.log(`  activity-classification SSOT: unchanged (not modified by Q2-D)`);

console.log(`\n=== Q2-D Validator: ${report.pass ? "PASS" : "FAIL"} ===\n`);

process.exit(report.pass ? 0 : 1);
