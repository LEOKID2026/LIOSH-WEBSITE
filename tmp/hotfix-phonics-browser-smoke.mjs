/**
 * One-off hotfix browser smoke — not part of product; delete after run.
 */
import { chromium } from "playwright";
import { countRuntimeEligiblePhonicsItems } from "../data/english-questions/index.js";

const BASE_URL = (process.env.QA_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const PICTURE_RE = /תמונה|matches the picture/i;
const BROKEN_PROMPT_RE = /\/\s+'|קרא\s+\/\s+[\u05d0-\u05ea'\s]|\/\s+י\s/u;
const WRONG_ADVANCE_MS = 7500;
const CORRECT_ADVANCE_MS = 1200;

async function clickMcq(page, idx) {
  await page.locator(`[data-testid='english-mcq-${idx}']`).scrollIntoViewIfNeeded();
  await page.evaluate((i) => {
    document.querySelector(`[data-testid='english-mcq-${i}']`)?.click();
  }, idx);
}

async function waitForNextQuestion(page, previousStem) {
  const deadline = Date.now() + WRONG_ADVANCE_MS;
  while (Date.now() < deadline) {
    const stem = (await page.locator("[data-testid='english-question-stem']").first().innerText().catch(() => "")).trim();
    const enabled = await page.locator("[data-testid='english-mcq-0']").isEnabled().catch(() => false);
    if (stem && stem !== previousStem && enabled) return;
    await page.waitForTimeout(250);
  }
}

/** @type {Record<string, boolean>} */
const results = {};

async function mockStudentSession(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "hotfix-smoke-student",
          full_name: "PhonicsSmoke",
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
          studentId: "hotfix-smoke-student",
          row: {
            subjects: { english: {} },
            monthly: {},
            challenges: {},
            streaks: {},
            achievements: {},
            profile: {},
            updated_at: new Date().toISOString(),
          },
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
      body: JSON.stringify({ ok: true, sessionId: "hotfix-smoke-session" }),
    });
  });
}

async function main() {
  const counts = countRuntimeEligiblePhonicsItems();
  results.counts_ok = counts.g1 === 19 && counts.g2 === 23 && counts.total === 42;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await mockStudentSession(page);

  await page.goto(`${BASE_URL}/learning/english-master`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.getByText("בודק התחברות תלמיד").waitFor({ state: "hidden", timeout: 45000 }).catch(() => {});

  await page.getByTestId("english-topic-select").waitFor({ state: "visible", timeout: 60000 });
  // G1 + phonics
  await page.locator("select").first().selectOption("1");
  await page.getByTestId("english-topic-select").selectOption("phonics");
  await page.getByTestId("english-start-game").click();
  await page.locator("[data-testid='english-question-stem']").first().waitFor({ state: "visible", timeout: 60000 });

  const positions = new Set();
  const stems = [];
  let pictureHits = 0;
  let brokenHits = 0;
  let emptyStimulus = 0;
  let audioStemHits = 0;
  const targetSamples = 20;

  for (let i = 0; i < targetSamples; i += 1) {
    const stemLocator = page.locator("[data-testid='english-question-stem']").first();
    const lead = (await page.locator("[data-testid='student-question-lead']").first().isVisible().catch(() => false))
      ? (await page.locator("[data-testid='student-question-lead']").first().innerText().catch(() => "")).trim()
      : "";
    const body = (await page.locator("[data-testid='student-question-body']").first().isVisible().catch(() => false))
      ? (await page.locator("[data-testid='student-question-body']").first().innerText().catch(() => "")).trim()
      : "";
    const stemFallback = (await stemLocator.innerText().catch(() => "")).trim();
    const visibleStem = [lead, body, stemFallback].filter(Boolean).join("\n");
    stems.push(visibleStem);

    if (PICTURE_RE.test(visibleStem)) pictureHits += 1;
    if (BROKEN_PROMPT_RE.test(visibleStem)) brokenHits += 1;
    if (/listen|שמעו|האזינ|requires audio/i.test(visibleStem)) audioStemHits += 1;
    if (!body && !stemFallback) emptyStimulus += 1;

    const options = [];
    for (let idx = 0; idx < 4; idx += 1) {
      const btn = page.locator(`[data-testid='english-mcq-${idx}']`);
      if (await btn.isVisible().catch(() => false)) {
        options.push({ idx, text: (await btn.innerText()).trim() });
      }
    }

    if (options.length >= 2) {
      const clickIdx = options[0].idx;
      await clickMcq(page, clickIdx);
      await page.waitForTimeout(400);
      let correctIdx = -1;
      for (const opt of options) {
        const cls = await page.locator(`[data-testid='english-mcq-${opt.idx}']`).getAttribute("class").catch(() => "");
        if (cls && /emerald/i.test(cls)) {
          correctIdx = opt.idx;
          break;
        }
      }
      if (correctIdx >= 0) positions.add(correctIdx);
      await page.waitForTimeout(8200);
    } else {
      await page.waitForTimeout(1500);
    }
  }

  results.position_varies = positions.size >= 2;
  results.positions_seen = [...positions];
  results.no_picture_stems = pictureHits === 0;
  results.no_broken_prompts = brokenHits === 0;
  results.no_empty_stimulus = emptyStimulus === 0;
  results.no_audio_stems = audioStemHits === 0;
  results.sample_stems = stems.slice(0, 5);

  await browser.close();

  const pass =
    results.counts_ok &&
    results.position_varies &&
    results.no_picture_stems &&
    results.no_broken_prompts &&
    results.no_empty_stimulus &&
    results.no_audio_stems;

  console.log(JSON.stringify({ status: pass ? "PASS" : "FAIL", results }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.log(JSON.stringify({ status: "FAIL", reason: "crash", error: String(err?.message || err) }, null, 2));
  process.exit(1);
});
