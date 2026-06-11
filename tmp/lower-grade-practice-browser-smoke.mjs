/**
 * Browser smoke — Hebrew + English G1/G2 practice quality on real UI.
 * Uses AAA student login fixture (same as english-phonics-runtime-qa.mjs).
 *
 *   npx next start -p 3110
 *   QA_BASE_URL=http://localhost:3110 node tmp/lower-grade-practice-browser-smoke.mjs
 *
 * Env (defaults): E2E_STUDENT_USERNAME=aaa1, E2E_STUDENT_PIN=1234
 */
import { chromium } from "playwright";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "../scripts/e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE_URL = (process.env.QA_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3110").replace(
  /\/$/,
  ""
);
const INTERNAL_RE = [/משפט\s+\d+/u, /בחנה.{0,8}פונולוגית/u];
const PICTURE_RE = /תמונה/u;
const BROKEN_SLASH = /\/\s+'\s|קרא\s+\/\s+'/u;
const ADVANCE_MS = 8500;

tryLoadE2EStudentEnvFromDotenv();
if (!process.env.E2E_STUDENT_USERNAME && !process.env.E2E_STUDENT_CODE) {
  process.env.E2E_STUDENT_USERNAME = process.env.QA_PHONICS_STUDENT_USERNAME || "aaa1";
}
if (!process.env.E2E_STUDENT_PIN) {
  process.env.E2E_STUDENT_PIN = process.env.QA_STUDENT_PIN || "1234";
}

const STUDENT_FIXTURE =
  process.env.E2E_STUDENT_USERNAME || process.env.E2E_STUDENT_CODE || "aaa1";

async function waitForStudentGate(page) {
  await page
    .getByText("בודק התחברות תלמיד")
    .waitFor({ state: "hidden", timeout: 60000 })
    .catch(() => {});
  await page
    .getByText("יש להתחבר כתלמיד")
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
}

async function readVisibleStem(page, subject) {
  const lead = (await page.locator("[data-testid='student-question-lead']").first().isVisible().catch(() => false))
    ? (await page.locator("[data-testid='student-question-lead']").first().innerText().catch(() => "")).trim()
    : "";
  const body = (await page.locator("[data-testid='student-question-body']").first().isVisible().catch(() => false))
    ? (await page.locator("[data-testid='student-question-body']").first().innerText().catch(() => "")).trim()
    : "";
  const stemTestId = `${subject}-question-stem`;
  const fallback = (await page.locator(`[data-testid='${stemTestId}']`).first().innerText().catch(() => "")).trim();
  return { lead, body, combined: [lead, body, fallback].filter(Boolean).join("\n") };
}

async function readOptions(page, subject) {
  const prefix = `${subject}-mcq`;
  const options = [];
  for (let idx = 0; idx < 4; idx += 1) {
    const btn = page.locator(`[data-testid='${prefix}-${idx}']`);
    if (await btn.isVisible().catch(() => false)) {
      options.push((await btn.innerText()).trim());
    }
  }
  return options;
}

async function clickMcq(page, subject, idx) {
  const testId = `${subject}-mcq-${idx}`;
  await page.locator(`[data-testid='${testId}']`).scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate((id) => {
    document.querySelector(`[data-testid='${id}']`)?.click();
  }, testId);
}

async function waitForNextQuestion(page, subject, previousCombined) {
  const stemTestId = `${subject}-question-stem`;
  const deadline = Date.now() + ADVANCE_MS;
  while (Date.now() < deadline) {
    const stem = await readVisibleStem(page, subject);
    const enabled = await page.locator(`[data-testid='${subject}-mcq-0']`).isEnabled().catch(() => false);
    if (stem.combined && stem.combined !== previousCombined && enabled) return;
    await page.waitForTimeout(250);
  }
}

function detectCopyLeak(stem, options) {
  const surfaces = [stem.lead, stem.body].filter(Boolean);
  for (const surface of surfaces) {
    const s = surface.trim();
    if (!s) continue;
    for (const opt of options) {
      const o = opt.trim();
      if (!o || o.length < 2) continue;
      if (s.toLowerCase() === o.toLowerCase()) return true;
      if (s.includes(o) && o.length >= 3) return true;
      if (/^[\u0590-\u05FF\s'".:—-]+$/u.test(s) && s.includes(o)) return true;
    }
  }
  return false;
}

async function startPractice(page, subject, gradeNum, topicValue) {
  const path = subject === "english" ? "/learning/english-master" : "/learning/hebrew-master";
  const topicTestId = `${subject}-topic-select`;
  const startTestId = `${subject}-start-game`;
  const stemTestId = `${subject}-question-stem`;

  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForStudentGate(page);
  await page.getByTestId(topicTestId).waitFor({ state: "visible", timeout: 60000 });

  await page.locator("select").first().selectOption(String(gradeNum));
  await page.getByTestId(topicTestId).selectOption(topicValue);
  await page.getByTestId(startTestId).click();

  if (subject === "hebrew" && gradeNum === 1) {
    const cont = page.getByTestId("hebrew-g1-book-first-continue-practice");
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }

  await page.locator(`[data-testid='${stemTestId}']`).first().waitFor({ state: "visible", timeout: 60000 });
}

async function sampleQuestions(page, subject, gradeNum, topicValue, count) {
  await startPractice(page, subject, gradeNum, topicValue);

  const issues = [];
  const positions = new Set();
  let audioOk = 0;
  let visibleTextOk = 0;
  let optionsOk = 0;

  for (let i = 0; i < count; i += 1) {
    const stem = await readVisibleStem(page, subject);
    const options = await readOptions(page, subject);

    const audioVisible =
      subject === "english"
        ? await page.getByTestId("english-phonics-audio-play").isVisible().catch(() => false)
        : await page.getByRole("button", { name: /נגן/ }).first().isVisible().catch(() => false);

    if (audioVisible) audioOk += 1;
    else issues.push(`g${gradeNum}:q${i}:no-audio`);

    const hasVisible = Boolean(stem.lead.trim() || stem.body.trim() || stem.combined.trim());
    if (hasVisible) visibleTextOk += 1;
    else issues.push(`g${gradeNum}:q${i}:no-visible-text`);

    if (options.length === 4) optionsOk += 1;
    else issues.push(`g${gradeNum}:q${i}:options-${options.length}`);

    if (INTERNAL_RE.some((re) => re.test(stem.combined))) {
      issues.push(`g${gradeNum}:q${i}:internal-label`);
    }
    if (PICTURE_RE.test(stem.combined)) {
      issues.push(`g${gradeNum}:q${i}:picture-prompt`);
    }
    if (BROKEN_SLASH.test(stem.combined)) {
      issues.push(`g${gradeNum}:q${i}:broken-slash`);
    }
    if (/requiresAudio|requires audio/i.test(stem.combined)) {
      issues.push(`g${gradeNum}:q${i}:requires-audio-text`);
    }
    if (detectCopyLeak(stem, options)) {
      issues.push(`g${gradeNum}:q${i}:answer-leak`);
    }

    if (subject === "english" && options.length >= 2) {
      await clickMcq(page, subject, 0);
      await page.waitForTimeout(500);
      for (let j = 0; j < 4; j += 1) {
        const cls = await page.locator(`[data-testid='english-mcq-${j}']`).getAttribute("class").catch(() => "");
        if (cls && /emerald/i.test(cls)) {
          positions.add(j);
          break;
        }
      }
    } else if (subject === "hebrew" && options.length >= 2) {
      await clickMcq(page, subject, 0);
    }

    const before = stem.combined;
    await page.waitForTimeout(1200);
    await waitForNextQuestion(page, subject, before);
  }

  return {
    grade: `g${gradeNum}`,
    topic: topicValue,
    sampled: count,
    audioOk,
    visibleTextOk,
    optionsOk,
    issues,
    positions: [...positions],
  };
}

async function runSubjectSmoke(context, subject, config) {
  const page = await context.newPage();
  const gradeRuns = [];

  for (const { grade, topic, count } of config) {
    gradeRuns.push(await sampleQuestions(page, subject, grade, topic, count));
  }

  await page.close();

  const allIssues = gradeRuns.flatMap((r) => r.issues);
  const totalSampled = gradeRuns.reduce((n, r) => n + r.sampled, 0);
  const totalAudio = gradeRuns.reduce((n, r) => n + r.audioOk, 0);
  const positions = new Set(gradeRuns.flatMap((r) => r.positions || []));

  return {
    subject,
    totalSampled,
    totalAudio,
    allQuestionsHaveAudio: totalAudio === totalSampled,
    gradeRuns,
    issues: allIssues,
    positionVaries: subject !== "english" || positions.size >= 2,
    pass:
      totalSampled >= 20 &&
      allIssues.length === 0 &&
      totalAudio === totalSampled &&
      (subject !== "english" || positions.size >= 2),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  let loginOk = false;
  let loginError = null;
  try {
    await applyStudentSessionFromLogin(context, BASE_URL);
    loginOk = true;
  } catch (err) {
    loginError = String(err?.message || err);
  }

  if (!loginOk) {
    await browser.close();
    console.log(
      JSON.stringify(
        {
          status: "FAIL",
          reason: "student_login_failed",
          baseUrl: BASE_URL,
          studentFixture: STUDENT_FIXTURE,
          loginError,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const hebrew = await runSubjectSmoke(context, "hebrew", [
    { grade: 1, topic: "reading", count: 10 },
    { grade: 2, topic: "reading", count: 10 },
  ]);

  const english = await runSubjectSmoke(context, "english", [
    { grade: 1, topic: "phonics", count: 10 },
    { grade: 2, topic: "phonics", count: 10 },
  ]);

  await browser.close();

  const pass = hebrew.pass && english.pass;

  console.log(
    JSON.stringify(
      {
        status: pass ? "PASS" : "FAIL",
        baseUrl: BASE_URL,
        studentFixture: STUDENT_FIXTURE,
        loginMethod: "applyStudentSessionFromLogin",
        hebrew,
        english,
        summary: {
          hebrewQuestions: hebrew.totalSampled,
          englishQuestions: english.totalSampled,
          hebrewAudioOnAll: hebrew.allQuestionsHaveAudio,
          englishAudioOnAll: english.allQuestionsHaveAudio,
          hebrewIssues: hebrew.issues.length,
          englishIssues: english.issues.length,
          englishPositionVaries: english.positionVaries,
        },
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
