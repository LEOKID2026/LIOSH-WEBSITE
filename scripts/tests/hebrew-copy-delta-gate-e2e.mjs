/**
 * End-to-end delta gate test — uses actual runDeltaGate with temp files under scan roots.
 * Run: node scripts/tests/hebrew-copy-delta-gate-e2e.mjs
 */
import assert from "node:assert/strict";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDeltaGate } from "../hebrew-copy-delta-gate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const NEW_FILE = "components/learning/_hebrew-delta-e2e-probe.js";
const CRITICAL_FILE = "utils/parent-report-language/_hebrew-delta-e2e-critical-probe.js";
const NEW_TEXT = "מחרוזת בדיקה לקובץ חדש בדלתא";
const CRITICAL_TEXT = "מומלץ לקדם את הילד לשלב הבא בדיקת דלתא";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL: ${name}`, e.message || e);
  }
}

function cleanup() {
  for (const rel of [NEW_FILE, CRITICAL_FILE]) {
    const abs = join(ROOT, rel);
    if (existsSync(abs)) unlinkSync(abs);
  }
}

function writeProbe(rel, body) {
  writeFileSync(join(ROOT, rel), body, "utf8");
}

try {
  cleanup();

  test("e2e: clean workspace returns delta_count 0", () => {
    const summary = runDeltaGate({ root: ROOT, dryRun: true, warnOnly: true, scanMode: "hybrid" });
    assert.equal(summary.delta_count, 0, `expected 0 deltas, got ${summary.delta_count}`);
    assert.equal(summary.scan_mode, "hybrid");
  });

  test("e2e: new file with one Hebrew string => exactly one new delta", () => {
    writeProbe(NEW_FILE, `export const LABEL = "${NEW_TEXT}";\n`);
    const summary = runDeltaGate({ root: ROOT, dryRun: true, warnOnly: true, scanMode: "hybrid" });
    assert.ok(summary.new_files_discovered >= 1, "expected probe file in hybrid new-file set");
    const news = summary.deltas.filter(
      (d) => d.detected_change_type === "new" && d.source_file === NEW_FILE
    );
    assert.equal(news.length, 1, `expected 1 new delta for probe file, got ${news.length}`);
    assert.equal(news[0].new_text, NEW_TEXT);
  });

  test("e2e: new parent-report file with decision Hebrew => critical pending_owner_review", () => {
    cleanup();
    writeProbe(CRITICAL_FILE, `export const REC = "${CRITICAL_TEXT}";\n`);
    const summary = runDeltaGate({ root: ROOT, dryRun: true, warnOnly: true, scanMode: "hybrid" });
    const hit = summary.deltas.find((d) => d.source_file === CRITICAL_FILE);
    assert.ok(hit, "expected delta for critical probe file");
    assert.equal(hit.detected_change_type, "new");
    assert.equal(hit.risk_level, "critical");
    assert.equal(hit.suggested_status, "pending_owner_review");
  });

  test("e2e: after deleting temp files workspace returns delta_count 0", () => {
    cleanup();
    const summary = runDeltaGate({ root: ROOT, dryRun: true, warnOnly: true, scanMode: "hybrid" });
    assert.equal(summary.delta_count, 0, `expected 0 after cleanup, got ${summary.delta_count}`);
  });
} finally {
  cleanup();
}

console.log(`\nE2E summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
