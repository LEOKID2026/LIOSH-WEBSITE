#!/usr/bin/env node
/** P0 parent report live — short/detailed screenshots + PDF text proof on PORT 3100. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadEnvFiles } from "../truth-gates/lib/env.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
  defaultReportRange,
  assertDevServerReachable,
} from "../truth-gates/lib/live-parent-report.mjs";
import { extractPdfTextFromBuffer } from "../lib/parent-report-pdf-output-verify.mjs";

loadEnvFiles();

if (process.env.E2E_STUDENT_USERNAME === "leo-s01") {
  process.env.E2E_STUDENT_USERNAME = "aaa5";
}

const ORIGIN = (process.env.TRUTH_GATES_BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-final-verification-screenshots");
const JSON_OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-parent-report-live.json");
const FORBIDDEN = [
  /Copilot/u,
  /ParentReportInsight/u,
  /אבחון/u,
  /קושי חוזר/u,
  /המלצת המערכת/u,
  /אמון:/u,
  /confidence/i,
];

mkdirSync(OUT, { recursive: true });

if (!(await assertDevServerReachable(ORIGIN))) {
  console.error(JSON.stringify({ pass: false, reason: `server unreachable at ${ORIGIN}` }));
  process.exit(1);
}

const supabase = getServiceSupabase();
const auth = await resolveParentBearer(ORIGIN);
if (!auth.token) {
  writeFileSync(JSON_OUT, JSON.stringify({ pass: false, reason: auth.reason }, null, 2));
  process.exit(1);
}

const student = await resolveTruthGateStudent(supabase, auth.userId, {
  origin: ORIGIN,
  bearer: auth.token,
  studentUsername: process.env.E2E_STUDENT_USERNAME || "aaa5",
});
if (!student?.id) {
  writeFileSync(JSON_OUT, JSON.stringify({ pass: false, reason: "no student resolved — use aaa1–aaa12 under admin parent" }, null, 2));
  process.exit(1);
}

const email = process.env.E2E_PARENT_EMAIL || process.env.E2E_PARENT_USERNAME || "";
const password = process.env.E2E_PARENT_PASSWORD || "";
const range = defaultReportRange(7);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL", viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

/** @type {Record<string, unknown>} */
const report = {
  origin: ORIGIN,
  studentId: student.id,
  studentUsername: process.env.E2E_STUDENT_USERNAME || "aaa5",
  range,
  pass: false,
};

try {
  await page.goto(`${ORIGIN}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator("form").getByRole("button", { name: "כניסה" }).click();
  await page.waitForURL("**/parent/dashboard", { timeout: 25_000 });

  const shortUrl = `${ORIGIN}/learning/parent-report?source=parent&studentId=${encodeURIComponent(student.id)}&period=custom&start=${range.from}&end=${range.to}`;
  await page.goto(shortUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 90_000 });
  const shortShot = resolve(OUT, "parent-report-short.png");
  await page.screenshot({ path: shortShot, fullPage: true });
  const shortText = await page.locator("body").innerText();
  report.shortReport = {
    screenshot: shortShot.replace(/\\/g, "/"),
    forbiddenHits: FORBIDDEN.filter((re) => re.test(shortText)).map(String),
  };

  const detailedUrl = `${ORIGIN}/learning/parent-report-detailed?source=parent&studentId=${encodeURIComponent(student.id)}&period=custom&start=${range.from}&end=${range.to}`;
  await page.goto(detailedUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("heading", { name: /דוח מפורט/u }).waitFor({ timeout: 90_000 }).catch(async () => {
    await page.getByRole("heading", { name: /דוח/u }).first().waitFor({ timeout: 30_000 });
  });
  const detailedShot = resolve(OUT, "parent-report-detailed.png");
  await page.screenshot({ path: detailedShot, fullPage: true });
  const detailedText = await page.locator("body").innerText();
  report.detailedReport = {
    screenshot: detailedShot.replace(/\\/g, "/"),
    forbiddenHits: FORBIDDEN.filter((re) => re.test(detailedText)).map(String),
  };

  const printRoot = page.locator("#parent-report-pdf").or(page.locator(".parent-report-print-root")).first();
  await printRoot.waitFor({ state: "visible", timeout: 60_000 }).catch(() => null);
  const pdfPath = resolve(OUT, "parent-report-live.pdf");
  const pdfBuffer = await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
  });
  const { text: pdfText, method } = await extractPdfTextFromBuffer(pdfBuffer);
  const pdfTextPath = resolve(OUT, "parent-report-live-pdf-text.txt");
  writeFileSync(pdfTextPath, pdfText, "utf8");
  report.pdf = {
    path: pdfPath.replace(/\\/g, "/"),
    textPath: pdfTextPath.replace(/\\/g, "/"),
    extractMethod: method,
    bytes: pdfBuffer.length,
    forbiddenHits: FORBIDDEN.filter((re) => re.test(pdfText)).map(String),
    textSample: pdfText.slice(0, 1200),
  };

  const uiForbidden = [
    ...(report.shortReport?.forbiddenHits || []),
    ...(report.detailedReport?.forbiddenHits || []),
    ...(report.pdf?.forbiddenHits || []),
  ];
  report.pass = uiForbidden.length === 0 && pdfBuffer.length > 500;
} catch (err) {
  report.error = err?.message || String(err);
  report.pass = false;
} finally {
  await browser.close();
}

writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
