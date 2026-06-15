#!/usr/bin/env node
/** PDF_PASS — real PDF bytes; parity with API snapshot; NO print fallback. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { loadEnvFiles, baseUrl, hasLiveParentE2EEnv } from "../lib/env.mjs";
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
  defaultReportRange,
  assertDevServerReachable,
} from "../lib/live-parent-report.mjs";
import { extractPdfTextFromBuffer } from "../../lib/parent-report-pdf-output-verify.mjs";
import {
  extractApiReportSnapshot,
  extractUiSummaryFromPage,
  extractUiLikeSnapshot,
  assertReportSurfaceParity,
  assertNoParentActivitySeparateLabel,
} from "../lib/report-field-extract.mjs";

loadEnvFiles();

if (!hasLiveParentE2EEnv()) {
  skipGate("PDF_PASS", "set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD for PDF_PASS");
}

const origin = baseUrl().replace(/\/$/, "");
if (!(await assertDevServerReachable(origin))) {
  skipGate("PDF_PASS", `dev server unreachable at ${origin}`);
}

const supabase = getServiceSupabase();
const auth = await resolveParentBearer(origin);
if (!auth.token) skipGate("PDF_PASS", auth.reason || "parent auth failed");

const student = await resolveTruthGateStudent(supabase, auth.userId, {
  origin,
  bearer: auth.token,
  studentUsername: process.env.E2E_STUDENT_USERNAME,
});
if (!student?.id) skipGate("PDF_PASS", "no student resolved");

const range = defaultReportRange(7);
const email =
  process.env.E2E_PARENT_EMAIL ||
  process.env.E2E_PARENT_USERNAME ||
  "";
const password =
  process.env.E2E_PARENT_PASSWORD ||
  process.env.SIM_TEACHER_PARENT_PASSWORD ||
  "";

const outDir = path.resolve(process.cwd(), "qa-visual-output/truth-gates");
fs.mkdirSync(outDir, { recursive: true });
const pdfPath = path.join(outDir, `PDF_PASS-${student.id}-${range.from}-${range.to}.pdf`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL" });
const page = await context.newPage();

try {
  await page.goto(`${origin}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator("form").getByRole("button", { name: "כניסה" }).click();
  await page.waitForURL("**/parent/dashboard", { timeout: 25_000 }).catch(() => null);

  const reportUrl = `${origin}/learning/parent-report?source=parent&studentId=${encodeURIComponent(student.id)}&period=custom&start=${range.from}&end=${range.to}`;
  const reportDataPromise = page.waitForResponse(
    (res) =>
      res.url().includes(`/api/parent/students/${student.id}/report-data`) &&
      res.request().method() === "GET" &&
      res.ok(),
    { timeout: 120_000 }
  ).catch((err) => {
    throw new Error(`report-data response not observed: ${err?.message || String(err)}`);
  });
  await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 120_000 });
  const reportDataRes = await reportDataPromise;
  const browserApiBody = await reportDataRes.json();
  const apiSnap = extractApiReportSnapshot(browserApiBody, range);
  await page.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 90_000 });

  await page.waitForFunction(
    (expected) => {
      const cards = Array.from(document.querySelectorAll(".parent-report-print-summary-card"));
      for (const card of cards) {
        const label = card.querySelector(".parent-report-print-summary-label")?.textContent?.trim();
        if (label !== "שאלות") continue;
        const stat = card.querySelector(".parent-report-print-summary-stat")?.textContent?.trim() || "";
        const n = Number(stat.replace(/[^\d]/g, ""));
        return Number.isFinite(n) && (expected <= 0 ? true : n === expected);
      }
      return false;
    },
    apiSnap.totalQuestions,
    { timeout: 90_000 }
  );

  const printRoot = page.locator("#parent-report-pdf");
  await printRoot.waitFor({ state: "visible", timeout: 60_000 });

  const uiText = await printRoot.innerText();
  assertNoParentActivitySeparateLabel(uiText, "PDF_PASS");
  const uiSnap = await extractUiSummaryFromPage(page);

  const pdfBuffer = await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
  });

  if (!pdfBuffer || pdfBuffer.length < 500) {
    failGate("PDF_PASS", "PDF bytes too small or missing", { usesRealPdfBytes: false });
  }

  const { text: pdfText, method } = await extractPdfTextFromBuffer(pdfBuffer);
  assertNoParentActivitySeparateLabel(pdfText, "PDF_PASS");
  const pdfSnap = extractUiLikeSnapshot(pdfText);
  assertReportSurfaceParity(apiSnap, uiSnap, "PDF_PASS (UI before PDF)");
  assertReportSurfaceParity(apiSnap, pdfSnap, "PDF_PASS");

  passGate("PDF_PASS", `real PDF bytes parity via ${method}`, {
    usesRealPdfBytes: true,
    usesLiveApi: true,
    usesLiveUi: true,
    usesLiveDb: true,
    details: { pdfPath, apiSnap, pdfSnap, range, bytes: pdfBuffer.length },
  });
} catch (e) {
  failGate("PDF_PASS", e?.message || String(e), { usesRealPdfBytes: true });
} finally {
  await browser.close();
}
