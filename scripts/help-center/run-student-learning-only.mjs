#!/usr/bin/env node
/**
 * Student-only learning (no parent UI) — reuses Virtual Student QA subject drivers.
 *   node scripts/help-center/run-student-learning-only.mjs moledet-geography-average
 */
import { chromium } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { loadAccounts, selectAccount } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { launchBrowser, newStudentContext, attachLearningNetworkObserver } from "../virtual-student-qa/lib/browser.mjs";
import { PHASE_C_SCENARIOS_BY_ID } from "../virtual-student-qa/scenarios/phase-c-suite.mjs";
import { runMathScenario } from "../virtual-student-qa/lib/subject-drivers/math-master.mjs";
import { runGeometryScenario } from "../virtual-student-qa/lib/subject-drivers/geometry-master.mjs";
import { runHebrewScenario } from "../virtual-student-qa/lib/subject-drivers/hebrew-master.mjs";
import { runEnglishScenario } from "../virtual-student-qa/lib/subject-drivers/english-master.mjs";
import { runScienceScenario } from "../virtual-student-qa/lib/subject-drivers/science-master.mjs";
import { runMoledetGeographyScenario } from "../virtual-student-qa/lib/subject-drivers/moledet-geography-master.mjs";

const DRIVER = {
  math: runMathScenario,
  geometry: runGeometryScenario,
  hebrew: runHebrewScenario,
  english: runEnglishScenario,
  science: runScienceScenario,
  "moledet-geography": runMoledetGeographyScenario,
};

const scenarioId = process.argv[2];
if (!scenarioId || !PHASE_C_SCENARIOS_BY_ID[scenarioId]) {
  console.error(`Usage: node scripts/help-center/run-student-learning-only.mjs <phase-c-scenario-id>`);
  process.exit(2);
}

const scenario = PHASE_C_SCENARIOS_BY_ID[scenarioId];
const driver = DRIVER[scenario.subject];
if (!driver) {
  console.error(`No driver for subject ${scenario.subject}`);
  process.exit(2);
}

const baseUrl = resolveBaseUrl(process.argv.find((a) => a.startsWith("--base-url="))?.slice(11));
const accounts = loadAccounts();
const account = selectAccount(accounts, "help-demo", null);
const log = (line) => console.log(`[help-learning] ${line}`);

const browser = await launchBrowser({ headed: false });
const context = await newStudentContext(browser);
const page = await context.newPage();
attachLearningNetworkObserver(page);

await page.goto(new URL("/student/login", baseUrl).toString(), { waitUntil: "domcontentloaded" });
await authenticateStudent({ context, page, account, baseUrl, mode: "ui", log });

const noopShot = async () => {};
const result = await driver({ page, baseUrl, scenario, log, screenshotter: noopShot });
await browser.close();

console.log(`Done ${scenarioId}:`, JSON.stringify({ ok: result?.ok !== false }));
process.exit(result?.ok === false ? 1 : 0);
