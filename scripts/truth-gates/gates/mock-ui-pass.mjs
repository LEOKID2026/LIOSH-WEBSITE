#!/usr/bin/env node
/**
 * MOCK_UI_PASS — Playwright parent report with mocked API (NOT product truth).
 * Renamed from misleading "real-ui-load".
 */
import { runTsxScript } from "../lib/run-child.mjs";
import { passGate, failGate } from "../lib/gate-result.mjs";

const bridge = runTsxScript("scripts/parent-report-bridge-load-selftest.mjs");
if (bridge !== 0) {
  failGate("MOCK_UI_PASS", "bridge selftest failed before mocked Playwright", { usesMock: true });
}

const env = {
  PLAYWRIGHT_WEB_SERVER: process.env.PLAYWRIGHT_WEB_SERVER || "npm run dev:run-button",
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3002",
};
const pw = runTsxScript("scripts/truth-gates/lib/run-playwright-mock-ui.mjs", [], { env });
if (pw !== 0) {
  failGate("MOCK_UI_PASS", "mocked Playwright parent-report spec failed", { usesMock: true });
}

passGate(
  "MOCK_UI_PASS",
  "UI shell loads with mocked report-data API — not E2E_TRUTH_PASS",
  { usesMock: true, usesLiveApi: false, usesLiveUi: false }
);
