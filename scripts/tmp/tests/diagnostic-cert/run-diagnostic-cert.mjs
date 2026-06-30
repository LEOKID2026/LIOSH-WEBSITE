#!/usr/bin/env node
/**
 * Diagnostic Engine + Parent Report — cert simulation pack (23 scenarios).
 *
 * Dual-engine: DE2 (production) + V3 (internal, fields optional until payload final).
 * Aggregation scenarios 9–11 test parent-report evidence gates.
 *
 * Run: npm run test:diagnostic-cert
 * Output: reports/diagnostic-cert/latest.json + console Hebrew table
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runAllScenarios } from "./lib/scenarios.mjs";
import { buildHebrewTable, buildSummaryJson, collectFailures } from "./lib/format-he.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT_DIR = join(ROOT, "reports", "diagnostic-cert");
const OUT_JSON = join(OUT_DIR, "latest.json");

async function main() {
  console.log("=== Diagnostic Cert Pack — DE2 + V3 + Parent Evidence ===\n");

  const scenarioResults = await runAllScenarios();
  const summary = buildSummaryJson(scenarioResults, {
    engines: ["diagnosticEngineV2", "diagnosticEngineV3", "report-data-aggregate"],
    scenarioCount: scenarioResults.length,
    note: "V3 checks marked skip when internal fields not yet present — not counted as failure.",
  });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(buildHebrewTable(scenarioResults));
  console.log("\n--- סיכום ---");
  console.log(`עבר: ${summary.totals.pass || 0} | חלקי: ${summary.totals.partial || 0} | נכשל: ${summary.totals.fail || 0}`);
  console.log(
    `בדיקות: ${summary.totals.checks.pass} pass / ${summary.totals.checks.fail} fail / ${summary.totals.checks.skip} skip`,
  );
  console.log(`JSON: ${OUT_JSON}`);

  const failures = collectFailures(scenarioResults);
  if (failures.length > 0) {
    console.log("\n--- כשלים ---");
    for (const f of failures) console.log(`• ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\n✅ כל התרחישים הנדרשים עברו (דילוגי V3 אופציונליים לא נספרים ככשל).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
