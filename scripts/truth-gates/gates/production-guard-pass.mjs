#!/usr/bin/env node
/** PRODUCTION_GUARD_PASS — product truth guards + production DB-write script guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passGate, failGate } from "../lib/gate-result.mjs";
import { runNodeScript } from "../lib/run-child.mjs";
import { TRUTH_GATES_ROOT } from "../lib/env.mjs";
import { PARENT_REPORT_PORTAL_GATE } from "../../../lib/parent-report-server-truth.js";

const pages = ["pages/learning/parent-report.js", "pages/learning/parent-report-detailed.js"];

try {
  // Parent-facing copy no longer uses the technical term "localStorage" — verify
  // the hint still forbids building reports from browser-local device data.
  assert.match(
    PARENT_REPORT_PORTAL_GATE.hintHe,
    /דפדפן|מכשיר|מקומי|נתונים שמורים/
  );
  for (const rel of pages) {
    const src = readFileSync(join(TRUTH_GATES_ROOT, rel), "utf8");
    assert.ok(src.includes("PARENT_REPORT_PORTAL_GATE"), `${rel} renders portal gate`);
    assert.ok(!src.includes('localStorage.getItem("mleo_'), `${rel} must not read mleo_*`);
    assert.ok(!src.includes("buildLocalParentReports"), `${rel} must not build local reports`);
    assert.doesNotMatch(
      src,
      /API.*fail[\s\S]{0,400}localStorage|localStorage[\s\S]{0,400}fallback/i,
      `${rel} must not fallback to localStorage on API failure`
    );
  }

  const bridgeSrc = readFileSync(
    join(TRUTH_GATES_ROOT, "lib/learning-supabase/parent-report-from-api-payload.js"),
    "utf8"
  );
  assert.match(bridgeSrc, /runWithIsolatedReportStorage/);
  assert.doesNotMatch(bridgeSrc, /window\.localStorage\.setItem/);

  const scriptGuardCode = runNodeScript("scripts/tests/production-script-guard-selftest.mjs");
  assert.equal(scriptGuardCode, 0, "production script guard selftest must pass");

  passGate(
    "PRODUCTION_GUARD_PASS",
    "portal gate + isolated API bridge + production DB-write script guards passed",
    { layer: "source-and-script-guard" }
  );
} catch (e) {
  failGate("PRODUCTION_GUARD_PASS", e?.message || String(e), { layer: "source-and-script-guard" });
}
