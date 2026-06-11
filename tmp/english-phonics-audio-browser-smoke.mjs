/**
 * Browser smoke — English G1/G2 phonics visible question + additive audio.
 * Run: node tmp/english-phonics-audio-browser-smoke.mjs
 */
import { chromium } from "playwright";
import { countRuntimeEligiblePhonicsItems } from "../data/english-questions/index.js";

const BASE_URL = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PICTURE_RE = /תמונה/u;
const BROKEN_PROMPT_RE = /\/\s+'|קרא\s+\/\s+[\u05d0-\u05ea'\s]|\/\s+י\s/u;

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

async function readVisibleStem(page) {
  const lead = (await page.locator("[data-testid='student-question-lead']").first().isVisible().catch(() => false))
    ? (await page.locator("[data-testid='student-question-lead']").first().innerText().catch(() => "")).trim()
    : "";
  const body = (await page.locator("[data-testid='student-question-body']").first().isVisible().catch(() => false))
    ? (await page.locator("[data-testid='student-question-body']").first().innerText().catch(() => "")).trim()
    : "";
  const fallback = (await page.locator("[data-testid='english-question-stem']").first().innerText().catch(() => "")).trim();
  return { lead, body, combined: [lead, body, fallback].filter(Boolean).join("\n") };
}

async function readOptions(page) {
  const options = [];
  for (let idx = 0; idx < 4; idx += 1) {
    const btn = page.locator(`[data-testid='english-mcq-${idx}']`);
    if (await btn.isVisible().catch(() => false)) {
      options.push((await btn.innerText()).trim());
    }
  }
  return options;
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

  const beforeStem = await readVisibleStem(page);
  const optionsBefore = await readOptions(page);

  const audioBtn = page.getByTestId("english-phonics-audio-play");
  await audioBtn.waitFor({ state: "visible", timeout: 15000 });
  const audioLabel = (await audioBtn.innerText()).trim();
  await audioBtn.click();
  await page.waitForTimeout(900);

  const afterStem = await readVisibleStem(page);
  const optionsAfter = await readOptions(page);

  return {
    grade: `g${gradeNum}`,
    audioButtonVisible: await audioBtn.isVisible(),
    audioButtonLabel: audioLabel,
    leadVisible: Boolean(beforeStem.lead),
    bodyVisible: Boolean(beforeStem.body),
    optionsCount: optionsBefore.length,
    stemUnchangedAfterAudio:
      beforeStem.lead === afterStem.lead &&
      beforeStem.body === afterStem.body &&
      JSON.stringify(optionsBefore) === JSON.stringify(optionsAfter),
    noPicturePrompt: !PICTURE_RE.test(beforeStem.combined),
    noBrokenPrompt: !BROKEN_PROMPT_RE.test(beforeStem.combined),
    sampleLead: beforeStem.lead.slice(0, 80),
    sampleBody: beforeStem.body.slice(0, 40),
    sampleOptions: optionsBefore,
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
    counts.total === 24 &&
    g1.audioButtonVisible &&
    g2.audioButtonVisible &&
    g1.leadVisible &&
    g2.leadVisible &&
    g1.bodyVisible &&
    g2.bodyVisible &&
    g1.optionsCount === 4 &&
    g2.optionsCount === 4 &&
    g1.stemUnchangedAfterAudio &&
    g2.stemUnchangedAfterAudio &&
    g1.noPicturePrompt &&
    g2.noPicturePrompt &&
    g1.noBrokenPrompt &&
    g2.noBrokenPrompt;

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
