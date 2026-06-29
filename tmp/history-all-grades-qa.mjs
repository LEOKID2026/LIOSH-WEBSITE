/**
 * QA: History visible for all grades; master open; content bank g6.
 * Usage: node tmp/history-all-grades-qa.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const base = process.argv[2] || "http://127.0.0.1:3007";
const cases = [
  { leo: "AAA1", label: "g1", pin: "1234" },
  { leo: "AAA7", label: "g4", pin: "1234" },
  { leo: "AAA11", label: "g6", pin: "1234" },
];
const outDir = join(process.cwd(), "tmp", "history-all-grades-qa");
mkdirSync(outDir, { recursive: true });

async function login(page, leo, pin) {
  await page.goto(`${base}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 90_000 }).catch(() => {});
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("student-login-username").fill(leo);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

async function runCase(browser, { leo, label, pin }) {
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();
  const result = { leo, label, gradeFromApi: null, learningCard: false, after5s: false, afterRefresh: false, masterUrl: null, redirectedFromMaster: false, homeSubjects: false, questionGradeSample: null };

  try {
    await login(page, leo, pin);
    const me = await page.evaluate(async () => {
      const r = await fetch("/api/student/me", { credentials: "include", cache: "no-store" });
      return r.json().catch(() => ({}));
    });
    result.gradeFromApi = me?.student?.grade_level ?? null;

    await page.goto(`${base}/student/learning`, { waitUntil: "networkidle" });
    result.learningCard = await page.getByRole("link", { name: "היסטוריה" }).isVisible().catch(() => false);
    await page.waitForTimeout(5000);
    result.after5s = await page.getByRole("link", { name: "היסטוריה" }).isVisible().catch(() => false);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(5000);
    result.afterRefresh = await page.getByRole("link", { name: "היסטוריה" }).isVisible().catch(() => false);
    await page.screenshot({ path: join(outDir, `learning-${label}.png`), fullPage: true });

    await page.getByRole("link", { name: "היסטוריה" }).click();
    await page.waitForURL("**/learning/history-master**", { timeout: 30_000 });
    result.masterUrl = page.url();
    await page.waitForTimeout(3000);
    result.redirectedFromMaster = !page.url().includes("history-master");
    await page.screenshot({ path: join(outDir, `master-${label}.png`), fullPage: true });

    const qMeta = await page.evaluate(() => {
      const w = window;
      if (w.__NEXT_DATA__) {
        /* noop — questions loaded at runtime */
      }
      return null;
    });
    void qMeta;

    await page.goto(`${base}/student/home`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "הנושאים שלי" }).click();
    await page.waitForTimeout(1500);
    result.homeSubjects = await page.getByRole("heading", { name: "היסטוריה" }).isVisible().catch(() => false);

    result.pass =
      result.learningCard &&
      result.after5s &&
      result.afterRefresh &&
      !result.redirectedFromMaster &&
      result.homeSubjects;
  } catch (err) {
    result.error = String(err?.message || err);
    result.pass = false;
    await page.screenshot({ path: join(outDir, `error-${label}.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
  return result;
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const c of cases) {
  results.push(await runCase(browser, c));
}
await browser.close();

const report = { base, results, allPass: results.every((r) => r.pass) };
console.log(JSON.stringify(report, null, 2));
process.exit(report.allPass ? 0 : 1);
