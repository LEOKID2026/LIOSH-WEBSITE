#!/usr/bin/env node
/**
 * After batches A–D, list manifest gaps and write CAPTURE-BLOCKER-REPORT.json if incomplete.
 */
import { listManifestGaps, writeBlockerReport } from "./capture-help-screenshots.mjs";

const gaps = listManifestGaps();
console.log(`Manifest coverage: ${gaps.required - gaps.missing.length}/${gaps.required}`);

if (gaps.missing.length > 0) {
  writeBlockerReport(gaps);
  console.error(`${gaps.missing.length} job(s) still missing or failing quality gate`);
  process.exit(1);
}

console.log("All manifest screenshots present and pass inline quality checks.");
