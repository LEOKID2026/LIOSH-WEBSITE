#!/usr/bin/env node
/** NO_LOCALSTORAGE_REPORT_PASS — official routes must not use mleo_* localStorage. */
import { runTsxScript } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const code = runTsxScript("scripts/parent-report-server-truth-phase1-selftest.mjs");
if (code !== 0) {
  failGate("NO_LOCALSTORAGE_REPORT_PASS", "parent-report-server-truth-phase1-selftest failed", {
    layer: "source-guard",
  });
}

passGate(
  "NO_LOCALSTORAGE_REPORT_PASS",
  "product parent-report pages blocked from mleo_* localStorage; API bridge only",
  { layer: "source-guard" }
);
