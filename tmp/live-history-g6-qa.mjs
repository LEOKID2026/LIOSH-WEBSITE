/**
 * Live QA: History card persistence + home subjects for logged-in student.
 * Usage: node tmp/live-history-g6-qa.mjs [baseUrl] [leoCode] [pin]
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";
import { normalizeGradeLevelToKey } from "../lib/learning-student-defaults.js";
import { isHistoryGradeAllowed } from "../utils/history-curriculum-gates.js";

const base = process.argv[2] || "http://127.0.0.1:3001";
const leoCode = process.argv[3] || "AAA7";
const pin = process.argv[4] || "1234";
const outDir = join(process.cwd(), "tmp", "history-g6-live-qa");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL" });
const page = await context.newPage();

const report = {
  base,
  leoCode,
  gradeFromApi: null,
  gradeKeyNormalized: null,
  historyGateAllowed: null,
  learning: {},
  home: {},
  navigation: {},
};

async function loginStudent() {
  await page.goto(`${base}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 90_000 }).catch(() => {});
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("student-login-username").fill(leoCode);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
  await page.waitForTimeout(2000);
}

async function fetchMe() {
  const me = await page.evaluate(async () => {
    const r = await fetch("/api/student/me", { credentials: "include", cache: "no-store" });
    return r.json().catch(() => ({}));
  });
  report.gradeFromApi = me?.student?.grade_level ?? null;
  report.studentId = me?.student?.id ?? null;
  report.studentName = me?.student?.full_name ?? null;
  report.accountKind = me?.student?.account_kind ?? me?.student?.accountKind ?? null;
  report.gradeKeyNormalized = normalizeGradeLevelToKey(report.gradeFromApi);
  report.historyGateAllowed = isHistoryGradeAllowed(report.gradeFromApi);
  return me;
}

async function historyVisibleOnLearning(waitMs) {
  await page.goto(`${base}/student/learning`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(waitMs);
  const link = page.getByRole("link", { name: "היסטוריה" });
  const visible = await link.isVisible().catch(() => false);
  const href = visible ? await link.getAttribute("href") : null;
  await page.screenshot({ path: join(outDir, `learning-after-${waitMs}ms.png`), fullPage: true });
  return { visible, href };
}

async function historyOnHome() {
  await page.goto(`${base}/student/home`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "הנושאים שלי" }).click();
  await page.waitForTimeout(1500);
  const historyHeading = page.getByRole("heading", { name: "היסטוריה" });
  const hasHistoryLabel = await historyHeading.isVisible().catch(() => false);
  await page.screenshot({ path: join(outDir, "home-subjects-modal.png"), fullPage: true });
  return { hasHistoryLabel, historyLinks: hasHistoryLabel ? 1 : 0 };
}

try {
  await loginStudent();
  await fetchMe();

  report.learning.initial = await historyVisibleOnLearning(500);
  report.learning.after5s = await historyVisibleOnLearning(5000);

  await page.goto(`${base}/student/learning`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  const link = page.getByRole("link", { name: "היסטוריה" });
  report.learning.afterRefresh5s = {
    visible: await link.isVisible().catch(() => false),
    href: (await link.isVisible().catch(() => false)) ? await link.getAttribute("href") : null,
  };
  await page.screenshot({ path: join(outDir, "learning-after-refresh-5s.png"), fullPage: true });

  if (report.learning.afterRefresh5s.visible) {
    await link.click();
    await page.waitForURL("**/learning/history-master**", { timeout: 20_000 });
    report.navigation.toMaster = page.url();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(outDir, "history-master.png"), fullPage: true });
    const back = page.getByRole("link", { name: /חזרה|בית|home/i }).first();
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForTimeout(2000);
      report.navigation.afterBack = page.url();
    }
  } else {
    report.navigation.skipped = "History card not visible — click test skipped";
  }

  report.home = await historyOnHome();

  report.pass =
    report.historyGateAllowed === true &&
    report.learning.after5s.visible === true &&
    report.learning.afterRefresh5s.visible === true &&
    report.home.hasHistoryLabel === true &&
    (report.navigation.toMaster || "").includes("history-master");

  report.gateThatHidCard =
    report.historyGateAllowed === false
      ? `isHistoryGradeAllowed — raw=${JSON.stringify(report.gradeFromApi)} key=${report.gradeKeyNormalized || "(empty)"}`
      : report.learning.after5s.visible === false
        ? "visibleGames filter (unexpected for g6)"
        : null;
} catch (err) {
  report.error = String(err?.message || err);
  report.pass = false;
  await page.screenshot({ path: join(outDir, "error.png"), fullPage: true }).catch(() => {});
} finally {
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

process.exit(report.pass ? 0 : 1);
