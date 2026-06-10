/**
 * Browser smoke — English G1/G2 phonics practice audio button presence.
 * Run: node tmp/english-phonics-audio-browser-smoke.mjs
 */
import { chromium } from "playwright";
import { countRuntimeEligiblePhonicsItems } from "../data/english-questions/index.js";

const BASE_URL = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function mockStudentSession(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "phonics-audio-smoke",
          full_name: "AudioSmoke",
          grade_level: 1,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
  await page.route("**/api/student/learning-profile", async (route) => {
    const m = route.request().method();
    if (m === "GET" || m === "PATCH" || m === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          studentId: "phonics-audio-smoke",
          row: { subjects: { english: {} }, monthly: {}, challenges: {}, streaks: {}, achievements: {}, profile: {}, updated_at: new Date().toISOString() },
          derived: { bySubject: {} },
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.route("**/api/learning/session/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, sessionId: "phonics-audio-smoke-session" }),
    });
  });
}

async function runGradePhonicsAudioSmoke(page, gradeNum) {
  await page.goto(`${BASE_URL}/learning/english-master`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.getByText("בודק התחברות תלמיד").waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});
  await page.getByTestId("english-topic-select").waitFor({ state: "visible", timeout: 60000 });
  await page.locator("select").first().selectOption(String(gradeNum));
  await page.getByTestId("english-topic-select").selectOption("phonics");
  await page.getByTestId("english-start-game").click();
  await page.locator("[data-testid='english-question-stem']").first().waitFor({ state: "visible", timeout: 60000 });

  const audioBtn = page.getByTestId("english-phonics-audio-play");
  await audioBtn.waitFor({ state: "visible", timeout: 15000 });
  const label = (await audioBtn.innerText()).trim();
  await audioBtn.click();
  await page.waitForTimeout(800);

  return {
    grade: `g${gradeNum}`,
    audioButtonVisible: await audioBtn.isVisible(),
    audioButtonLabel: label,
    clickOk: true,
  };
}

async function main() {
  const counts = countRuntimeEligiblePhonicsItems();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await mockStudentSession(page);

  const g1 = await runGradePhonicsAudioSmoke(page, 1);
  const g2 = await runGradePhonicsAudioSmoke(page, 2);

  await browser.close();

  const pass =
    counts.total === 42 &&
    g1.audioButtonVisible &&
    g2.audioButtonVisible &&
    /האזנה|🔊/.test(g1.audioButtonLabel);

  console.log(
    JSON.stringify(
      {
        status: pass ? "PASS" : "FAIL",
        runtimeCounts: counts,
        g1,
        g2,
        requiresAudioReenabled: false,
      },
      null,
      2
    )
  );
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
