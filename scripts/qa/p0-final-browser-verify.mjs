#!/usr/bin/env node
/**
 * P0 browser verification on PORT=3100 — answer leak, RTL screenshots, parent report/PDF.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node scripts/qa/p0-final-browser-verify.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadEnvFiles, hasLiveParentE2EEnv } from "../truth-gates/lib/env.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
  defaultReportRange,
  assertDevServerReachable,
} from "../truth-gates/lib/live-parent-report.mjs";
import { extractPdfTextFromBuffer } from "../lib/parent-report-pdf-output-verify.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = resolve(ROOT, "docs/qa/p0-final-verification-screenshots");
const OUT_JSON = resolve(ROOT, "docs/qa/p0-final-verification-browser.json");
const ORIGIN = (
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.TRUTH_GATES_BASE_URL ||
  "http://127.0.0.1:3100"
).replace(/\/$/, "");

const QA_USER = "p0-verify-student";
const LEAK_FORBIDDEN = [
  /Wrong!/i,
  /Correct answer/i,
  /Correct!/i,
  /Game Over!/i,
  /תשובה נכונה:/u,
  /התשובה הנכונה:/u,
];
const DIAG_FORBIDDEN = [
  /אבחון מבוסס נתונים/u,
  /קושי חוזר/u,
  /המלצת המערכת/u,
  /אמון:/u,
  /אין סיבה לדאגה/u,
  /יש סיבה לדאגה/u,
  /ParentReportInsight/u,
  /סיכום חכם/u,
  /תובנה חכמה/u,
];

loadEnvFiles();
mkdirSync(OUT_DIR, { recursive: true });

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-p00000000001",
          full_name: QA_USER,
          grade_level: 3,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
  await page.route("**/api/learning/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.continue();
  });
}

async function confirmMixedModal(page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible().catch(() => false)) await allBtn.click();
    await save.click();
  }
}

async function startMathPractice(page) {
  await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded" });
  await page.locator("select").first().selectOption("3");
  await page.locator("select").nth(1).selectOption("easy");
  const opSel = page.getByTestId("math-operation-select");
  if (await opSel.isVisible().catch(() => false)) {
    const vals = await opSel.evaluate((el) => [...el.options].map((o) => o.value));
    const pick = vals.find((v) => v === "addition") || vals.find((v) => v && v !== "mixed") || vals[0];
    if (pick) await opSel.selectOption(pick);
  }
  await confirmMixedModal(page);
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ state: "visible", timeout: 60_000 });
}

function assertNoLeak(text, label) {
  const hits = LEAK_FORBIDDEN.filter((re) => re.test(text));
  return { label, pass: hits.length === 0, forbiddenMatched: hits.map(String) };
}

async function wrongAnswerLeakCheck(page, masterPath, setupFn, submitWrongFn, screenshotName) {
  await mockStudent(page);
  await setupFn(page);
  await submitWrongFn(page);
  await page.waitForTimeout(1200);
  const bodyText = await page.locator("body").innerText();
  const shot = resolve(OUT_DIR, screenshotName);
  await page.screenshot({ path: shot, fullPage: false });
  return { ...assertNoLeak(bodyText, masterPath), screenshot: shot, feedbackSample: bodyText.slice(0, 400) };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL", viewport: { width: 390, height: 844 } });
const page = await context.newPage();

const results = {
  origin: ORIGIN,
  screenshots: [],
  answerLeak: [],
  rtl: [],
  parentReport: null,
  pdf: null,
};

try {
  if (!(await assertDevServerReachable(ORIGIN))) {
    throw new Error(`Server unreachable at ${ORIGIN}`);
  }

  // 4. Answer leak — math
  results.answerLeak.push(
    await wrongAnswerLeakCheck(
      page,
      "math-master",
      startMathPractice,
      async (p) => {
        const wrongBtn = p.locator('[data-testid="math-answer-surface"] button').first();
        if (await wrongBtn.isVisible().catch(() => false)) {
          await wrongBtn.click();
        } else {
          await p.getByTestId("math-check-answer").click().catch(() => null);
        }
      },
      "math-wrong-feedback.png"
    )
  );

  // geometry
  results.answerLeak.push(
    await wrongAnswerLeakCheck(
      page,
      "geometry-master",
      async (p) => {
        await p.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded" });
        await p.locator("select").first().selectOption("g3");
        await p.locator("select").nth(1).selectOption("easy");
        const topicSel = p.getByTestId("geometry-topic-select");
        const vals = await topicSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
        if (vals[0]) await topicSel.selectOption(vals[0]);
        await confirmMixedModal(p);
        await p.getByTestId("geometry-start-game").click();
        await p.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
      },
      async (p) => {
        const choices = p.locator('[data-testid="geometry-answer-surface"] button, .geometry-choice, button').filter({ hasText: /.+/ });
        const n = await choices.count();
        if (n > 1) await choices.nth(1).click();
      },
      "geometry-wrong-feedback.png"
    )
  );

  // RTL screenshots
  await mockStudent(page);
  await startMathPractice(page);
  const compareOp = page.getByTestId("math-operation-select");
  const cmpVals = await compareOp.evaluate((el) => [...el.options].map((o) => o.value));
  if (cmpVals.includes("compare")) {
    await compareOp.selectOption("compare");
    await page.getByTestId("math-start-game").click().catch(() => null);
    await page.waitForTimeout(1500);
  }
  const mathRtl = resolve(OUT_DIR, "rtl-math-compare.png");
  await page.getByTestId("math-question-surface").screenshot({ path: mathRtl }).catch(async () => {
    await page.screenshot({ path: mathRtl });
  });
  results.rtl.push({ surface: "math-compare", screenshot: mathRtl });

  await page.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded" });
  await page.locator("select").first().selectOption("g3");
  await page.locator("select").nth(1).selectOption("medium");
  const topicSel = page.getByTestId("geometry-topic-select");
  const vals = await topicSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  const area = vals.find((v) => /area|perimeter|volume/i.test(v)) || vals[0];
  if (area) await topicSel.selectOption(area);
  await confirmMixedModal(page);
  await page.getByTestId("geometry-start-game").click();
  await page.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
  const geoRtl = resolve(OUT_DIR, "rtl-geometry-formula.png");
  await page.getByTestId("geometry-question-stem").screenshot({ path: geoRtl });
  results.rtl.push({ surface: "geometry-formula", screenshot: geoRtl });

  results.screenshots = [...results.answerLeak.map((x) => x.screenshot), ...results.rtl.map((x) => x.screenshot)].filter(Boolean);

  // 5+6 Parent report + PDF (live E2E only)
  if (hasLiveParentE2EEnv()) {
    const supabase = getServiceSupabase();
    const auth = await resolveParentBearer(ORIGIN);
    const student = auth.token
      ? await resolveTruthGateStudent(supabase, auth.userId, { origin: ORIGIN, bearer: auth.token })
      : null;
    if (student?.id && auth.token) {
      const range = defaultReportRange(30);
      const email = process.env.E2E_PARENT_EMAIL || process.env.E2E_PARENT_USERNAME || "";
      const password = process.env.E2E_PARENT_PASSWORD || process.env.SIM_TEACHER_PARENT_PASSWORD || "";

      const parentPage = await browser.newPage({ locale: "he-IL" });
      await parentPage.goto(`${ORIGIN}/parent/login`, { waitUntil: "domcontentloaded" });
      await parentPage.getByTestId("parent-login-identifier").fill(email);
      await parentPage.getByTestId("parent-login-secret").fill(password);
      await parentPage.locator("form").getByRole("button", { name: "כניסה" }).click();
      await parentPage.waitForURL("**/parent/dashboard", { timeout: 25_000 }).catch(() => null);

      const shortUrl = `${ORIGIN}/learning/parent-report?source=parent&studentId=${encodeURIComponent(student.id)}&period=custom&start=${range.from}&end=${range.to}`;
      await parentPage.goto(shortUrl, { waitUntil: "networkidle", timeout: 120_000 });
      await parentPage.getByRole("heading", { name: /דוח להורים/u }).waitFor({ timeout: 90_000 });
      const shortText = await parentPage.locator("body").innerText();
      const shortDiag = DIAG_FORBIDDEN.filter((re) => re.test(shortText));
      const shortShot = resolve(OUT_DIR, "parent-report-short.png");
      await parentPage.screenshot({ path: shortShot, fullPage: true });

      const printRoot = parentPage.locator("#parent-report-pdf");
      await printRoot.waitFor({ state: "visible", timeout: 60_000 });
      const printText = await printRoot.innerText();
      const pdfBuffer = await parentPage.pdf({ format: "A4", printBackground: true });
      const { text: pdfText } = await extractPdfTextFromBuffer(pdfBuffer);
      const pdfDiag = DIAG_FORBIDDEN.filter((re) => re.test(pdfText));
      const pdfAi = [/ParentReportInsight/i, /Copilot/i, /סיכום חכם/u, /תובנה חכמה/u].filter((re) => re.test(pdfText));

      results.parentReport = {
        pass: shortDiag.length === 0,
        diagnosticHits: shortDiag.map(String),
        screenshot: shortShot,
        hasPracticeFraming: /לפי השאלות|מהתרגול|מוקדם להסיק/u.test(shortText),
      };
      results.pdf = {
        pass: pdfDiag.length === 0 && pdfAi.length === 0,
        diagnosticHits: pdfDiag.map(String),
        aiHits: pdfAi.map(String),
        printAreaHasAi: DIAG_FORBIDDEN.some((re) => re.test(printText)),
        pdfTextSample: pdfText.slice(0, 1200),
        printTextSample: printText.slice(0, 800),
      };
      results.screenshots.push(shortShot);
      await parentPage.close();
    } else {
      results.parentReport = { skipped: true, reason: "no student/auth" };
      results.pdf = { skipped: true, reason: "no student/auth" };
    }
  } else {
    results.parentReport = { skipped: true, reason: "E2E_PARENT_EMAIL/PASSWORD not set" };
    results.pdf = { skipped: true, reason: "E2E_PARENT_EMAIL/PASSWORD not set" };
  }
} finally {
  await browser.close();
}

results.answerLeakPass = results.answerLeak.every((x) => x.pass);
results.verdict = {
  answerLeak: results.answerLeakPass ? "PASS" : "FAIL",
  rtl: results.rtl.length >= 2 ? "PASS" : "PARTIAL",
  parentReport: results.parentReport?.pass ? "PASS" : results.parentReport?.skipped ? "SKIP" : "FAIL",
  pdf: results.pdf?.pass ? "PASS" : results.pdf?.skipped ? "SKIP" : "FAIL",
};

writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.verdict, null, 2));
console.log(`Wrote ${OUT_JSON}`);
