/**
 * Lite browser smoke — 20 questions × Hebrew/English G1/G2.
 */
import { chromium } from "playwright";

const BASE = (process.env.QA_BASE_URL || "http://localhost:3010").replace(/\/$/, "");
const INTERNAL_RE = [/משפט\s+\d+/u, /בחנה.{0,8}פונולוגית/u];

async function mockStudent(page, gradeLevel) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "lite-smoke",
          full_name: "LiteSmoke",
          grade_level: gradeLevel,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
  await page.route("**/api/student/learning-profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, studentId: "lite-smoke", row: {}, derived: {} }),
    });
  });
  await page.route("**/api/learning/session/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, sessionId: "lite-smoke" }),
    });
  });
}

async function runCase(subject, gradeNum, topicValue) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await mockStudent(page, gradeNum);

  const path =
    subject === "english" ? "/learning/english-master" : "/learning/hebrew-master";
  const topicTestId = `${subject}-topic-select`;
  const startTestId = `${subject}-start-game`;
  const stemTestId = `${subject}-question-stem`;
  const mcqPrefix = `${subject}-mcq`;

  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByText("בודק התחברות תלמיד").waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});
  await page.getByTestId(topicTestId).waitFor({ state: "visible", timeout: 60000 });
  await page.locator("select").first().selectOption(String(gradeNum));
  await page.getByTestId(topicTestId).selectOption(topicValue);
  await page.getByTestId(startTestId).click();

  if (subject === "hebrew" && gradeNum === 1) {
    const cont = page.getByTestId("hebrew-g1-book-first-continue-practice");
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }

  await page.locator(`[data-testid='${stemTestId}']`).first().waitFor({ state: "visible", timeout: 60000 });

  const issues = [];
  for (let i = 0; i < 20; i += 1) {
    const stemText = await page.locator(`[data-testid='${stemTestId}']`).first().innerText();
    const audioVisible =
      subject === "english"
        ? await page.getByTestId("english-phonics-audio-play").isVisible().catch(() => false)
        : await page.getByRole("button", { name: /נגן/ }).first().isVisible().catch(() => false);

    const options = [];
    for (let j = 0; j < 4; j += 1) {
      const btn = page.locator(`[data-testid='${mcqPrefix}-${j}']`);
      if (await btn.isVisible().catch(() => false)) options.push((await btn.innerText()).trim());
    }

    if (!audioVisible) issues.push(`q${i}:no-audio`);
    if (!stemText.trim()) issues.push(`q${i}:no-stem`);
    if (options.length !== 4) issues.push(`q${i}:options-${options.length}`);
    if (INTERNAL_RE.some((re) => re.test(stemText))) issues.push(`q${i}:internal-label`);

    await page.locator(`[data-testid='${mcqPrefix}-0']`).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  await browser.close();
  return { subject, grade: `g${gradeNum}`, checked: 20, issues };
}

const cases = [
  ["english", 1, "phonics"],
  ["english", 2, "phonics"],
  ["hebrew", 1, "reading"],
  ["hebrew", 2, "reading"],
];

const results = [];
for (const [subject, grade, topic] of cases) {
  results.push(await runCase(subject, grade, topic));
}

const pass = results.every((r) => r.issues.length === 0);
console.log(JSON.stringify({ status: pass ? "PASS" : "FAIL", results }, null, 2));
process.exit(pass ? 0 : 1);
