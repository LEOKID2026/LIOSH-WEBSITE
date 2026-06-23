#!/usr/bin/env node
/** UI_PASS — live parent login + report page reflects the same report-data the browser fetched. */
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
import {
  extractApiReportSnapshot,
  extractUiSummaryFromPage,
  assertReportSurfaceParity,
  assertNoParentActivitySeparateLabel,
} from "../lib/report-field-extract.mjs";

loadEnvFiles();

if (!hasLiveParentE2EEnv()) {
  skipGate("UI_PASS", "set E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD for live UI_PASS");
}

const origin = baseUrl().replace(/\/$/, "");
if (!(await assertDevServerReachable(origin))) {
  skipGate("UI_PASS", `dev server unreachable at ${origin}`);
}

const supabase = getServiceSupabase();
const auth = await resolveParentBearer(origin);
if (!auth.token) {
  skipGate("UI_PASS", auth.reason || "parent auth failed");
}

const student = await resolveTruthGateStudent(supabase, auth.userId, {
  origin,
  bearer: auth.token,
  studentUsername: process.env.E2E_STUDENT_USERNAME,
});
if (!student?.id) {
  skipGate("UI_PASS", "no student resolved for UI_PASS");
}

const range = defaultReportRange(7);
const email =
  process.env.E2E_PARENT_EMAIL ||
  process.env.E2E_PARENT_USERNAME ||
  process.env.TRUTH_GATES_PARENT_EMAIL ||
  "";
const password =
  process.env.E2E_PARENT_PASSWORD ||
  process.env.SIM_TEACHER_PARENT_PASSWORD ||
  "";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL" });
const page = await context.newPage();

try {
  await page.goto(`${origin}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator("form").getByRole("button", { name: "כניסה" }).click();
  await page.waitForURL("**/parent/dashboard", { timeout: 25_000 }).catch(() => null);

  const policyApprove = page.getByRole("button", { name: "אישור והמשך" });
  if (await policyApprove.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole("checkbox").check({ force: true });
    await policyApprove.click();
  }

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

  await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const reportDataRes = await reportDataPromise;
  const browserApiBody = await reportDataRes.json();

  await page.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 90_000 });
  await page.getByText(/טוען דוח/u).waitFor({ state: "hidden", timeout: 90_000 }).catch(() => null);

  const apiSnap = extractApiReportSnapshot(browserApiBody, range);
  await page.getByText(/טוען דוח/u).waitFor({ state: "hidden", timeout: 90_000 }).catch(() => null);
  await page.locator("#parent-report-pdf").waitFor({ state: "visible", timeout: 60_000 });

  const uiText = await page.locator("#parent-report-pdf").innerText();
  assertNoParentActivitySeparateLabel(uiText, "UI_PASS");
  const uiSnap = await extractUiSummaryFromPage(page);
  assertReportSurfaceParity(apiSnap, uiSnap, "UI_PASS");

  passGate("UI_PASS", `UI matches browser report-data for student ${student.id}`, {
    usesLiveUi: true,
    usesLiveApi: true,
    usesLiveDb: true,
    details: { apiSnap, uiSnap, range },
  });
} catch (e) {
  failGate("UI_PASS", e?.message || String(e), {
    usesLiveUi: true,
    usesLiveApi: true,
    details: { hint: "If API totalAnswers > 0 but UI summary shows 0, file product bridge bug" },
  });
} finally {
  await browser.close();
}
