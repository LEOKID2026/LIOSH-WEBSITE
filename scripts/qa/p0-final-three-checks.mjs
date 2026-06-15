#!/usr/bin/env node
/** Policy-aware final checks: learning vs practice vs parent-assigned on PORT 3100. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadEnvFiles } from "../truth-gates/lib/env.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
} from "../truth-gates/lib/live-parent-report.mjs";
import { createParentActivity, loginStudent, sampleQuestionSet } from "../truth-gates/lib/live-parent-activity-flow.mjs";

loadEnvFiles();
if (process.env.E2E_STUDENT_USERNAME === "leo-s01") {
  process.env.E2E_STUDENT_USERNAME = "aaa5";
}

const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || process.env.TRUTH_GATES_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-final-verification-screenshots");
const JSON_OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-final-three-checks.json");

/** English / legacy UI strings forbidden in all child surfaces. */
const ENGLISH_UI_FORBIDDEN = [
  /Wrong!/i,
  /Correct!/i,
  /Correct answer/i,
  /Game Over!/i,
  /Loading\.\.\./i,
  /\bNext\b/,
  /Hint:/i,
  /רמז:/u,
  /עד\s*\d+\s*!/u,
];

/** Must NOT appear in practice/challenge live feedback (before error popup body). */
const PRACTICE_FEEDBACK_FORBIDDEN = [
  /התשובה הנכונה/u,
  /תשובה נכונה:/u,
  /הפירוש הנכון/u,
  /התרגום הנכון/u,
  /\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+/u,
];

/** Must NOT appear in parent/teacher assigned activity UI or API. */
const ASSIGNED_UI_FORBIDDEN = [
  ...PRACTICE_FEEDBACK_FORBIDDEN,
  /revealAnswers\s*:\s*true/i,
];

mkdirSync(OUT, { recursive: true });

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "e2e-final", full_name: "final-test", grade_level: 3, is_active: true },
      }),
    });
  });
}

async function confirmMixed(page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    if (await page.getByRole("button", { name: "הכל", exact: true }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "הכל", exact: true }).click();
    }
    await save.click();
  }
}

async function selectGradeAndLevel(page, { gradeTestId, gradeValue, levelValue = "easy" } = {}) {
  const gradeSel = gradeTestId ? page.getByTestId(gradeTestId) : page.locator("select").first();
  await gradeSel.waitFor({ state: "visible", timeout: 30_000 });
  const gradeVals = await gradeSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
  const gradePick =
    gradeValue && gradeVals.includes(String(gradeValue))
      ? String(gradeValue)
      : gradeVals.find((v) => v === "3" || v === "g3") || gradeVals[0];
  await gradeSel.selectOption(gradePick);
  const levelSel = page.locator("select").nth(1);
  if (await levelSel.isVisible().catch(() => false)) {
    const levelVals = await levelSel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
    const levelPick = levelVals.includes(levelValue) ? levelValue : levelVals[0];
    if (levelPick) await levelSel.selectOption(levelPick);
  }
}

function collectLeaks(text, patterns) {
  return patterns.filter((re) => re.test(text)).map(String);
}

function feedbackPrefix(text) {
  const idx = text.indexOf("למה הטעות");
  return idx >= 0 ? text.slice(0, idx) : text;
}

function evaluateLearning(text, extraForbidden = []) {
  const englishLeaks = collectLeaks(text, [...ENGLISH_UI_FORBIDDEN, ...extraForbidden]);
  const hasWrongFeedback = /לא נכון/u.test(text);
  const hasAnswerReveal = /התשובה הנכונה/u.test(text) || /\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+/u.test(text);
  const hasExplanation = /למה הטעות/u.test(text) || /💡/u.test(text);
  return {
    englishLeaks,
    hasWrongFeedback,
    hasAnswerReveal,
    hasExplanation,
    pass: englishLeaks.length === 0 && hasWrongFeedback && hasAnswerReveal && hasExplanation,
  };
}

function evaluatePractice(text, extraForbidden = []) {
  const prefix = feedbackPrefix(text);
  const englishLeaks = collectLeaks(text, [...ENGLISH_UI_FORBIDDEN, ...extraForbidden]);
  const feedbackLeaks = collectLeaks(prefix, PRACTICE_FEEDBACK_FORBIDDEN);
  const hasWrongFeedback = /לא נכון/u.test(text);
  return {
    englishLeaks,
    feedbackLeaks,
    hasWrongFeedback,
    pass: englishLeaks.length === 0 && feedbackLeaks.length === 0 && hasWrongFeedback,
  };
}

function evaluateAssigned(text) {
  const englishLeaks = collectLeaks(text, ENGLISH_UI_FORBIDDEN);
  const assignedLeaks = collectLeaks(text, ASSIGNED_UI_FORBIDDEN);
  const hasBinaryFeedback = /לא נכון/u.test(text) || /נכון!/u.test(text);
  return {
    englishLeaks,
    assignedLeaks,
    hasBinaryFeedback,
    pass: englishLeaks.length === 0 && assignedLeaks.length === 0 && hasBinaryFeedback,
  };
}

async function submitWrongMathAnswer(page) {
  const input = page.locator(
    '[data-testid="math-answer-surface"] input, [data-testid="math-answer-surface"] textarea'
  ).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("0");
    await page.getByTestId("math-check-answer").click();
  } else {
    const buttons = page.locator('[data-testid="math-answer-surface"] button');
    const count = await buttons.count();
    for (let i = 0; i < count; i += 1) {
      await buttons.nth(i).click();
      await page.waitForTimeout(800);
      if (/לא נכון/u.test(await page.locator("body").innerText())) break;
    }
  }
}

async function startMathWrong(page, modeLabel) {
  await mockStudent(page);
  await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (modeLabel) {
    await page.getByRole("button", { name: modeLabel, exact: true }).click();
  }
  await selectGradeAndLevel(page, { gradeTestId: "math-grade-select", gradeValue: "3" });
  const op = page.getByTestId("math-operation-select");
  const vals = await op.evaluate((el) => [...el.options].map((o) => o.value));
  await op.selectOption(vals.find((v) => v === "addition") || vals[0]);
  await confirmMixed(page);
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
  await submitWrongMathAnswer(page);
  await page.waitForTimeout(2000);
  return page.locator("body").innerText();
}

async function checkMathLearning(context) {
  const page = await context.newPage();
  try {
    const text = await startMathWrong(page, "למידה");
    const shot = resolve(OUT, "math-learning-wrong-feedback.png");
    await page.screenshot({ path: shot, fullPage: true });
    const evalResult = evaluateLearning(text);
    return {
      surface: "math-learning",
      policy: "learning",
      ...evalResult,
      screenshot: shot.replace(/\\/g, "/"),
      sample: text.slice(0, 450),
    };
  } finally {
    await page.close();
  }
}

async function checkMathPractice(context) {
  const page = await context.newPage();
  try {
    const text = await startMathWrong(page, "אתגר");
    const shot = resolve(OUT, "math-challenge-wrong-feedback.png");
    await page.screenshot({ path: shot, fullPage: true });
    const evalResult = evaluatePractice(text);
    return {
      surface: "math-challenge",
      policy: "practice",
      ...evalResult,
      screenshot: shot.replace(/\\/g, "/"),
      sample: text.slice(0, 450),
    };
  } finally {
    await page.close();
  }
}

async function checkGeometry(context, { modeLabel, policy, surface, shotName }) {
  const page = await context.newPage();
  try {
    await mockStudent(page);
    await page.goto(`${ORIGIN}/learning/geometry-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (modeLabel) {
      await page.getByRole("button", { name: modeLabel, exact: true }).click();
    }
    await selectGradeAndLevel(page, { gradeValue: "g3" });
    const sel = page.getByTestId("geometry-topic-select");
    const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
    await sel.selectOption(vals[0]);
    await confirmMixed(page);
    await page.getByTestId("geometry-start-game").click();
    await page.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
    if (/תוכנית הלימודים באתר/u.test(await page.locator("body").innerText())) {
      throw new Error("geometry still on curriculum surface — game not reached");
    }
    const mcq = page.locator('[data-testid^="geometry-mcq-"]').first();
    if (await mcq.isVisible().catch(() => false)) {
      const buttons = page.locator('[data-testid^="geometry-mcq-"]');
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        await buttons.nth(i).click();
        await page.waitForTimeout(800);
        if (/לא נכון/u.test(await page.locator("body").innerText())) break;
      }
    } else {
      const input = page
        .locator('[data-testid="geometry-answer-surface"] input, input[type="text"], input[type="number"]')
        .first();
      await input.waitFor({ state: "visible", timeout: 15_000 });
      await input.fill("0");
      const check = page.getByTestId("geometry-check-answer").or(page.getByRole("button", { name: "בדוק" }));
      await check.first().click();
    }
    await page.waitForTimeout(2000);
    const text = await page.locator("body").innerText();
    const shot = resolve(OUT, shotName);
    await page.screenshot({ path: shot, fullPage: true });
    const evalResult =
      policy === "learning"
        ? evaluateLearning(text, [/תוכנית הלימודים באתר/u])
        : evaluatePractice(text, [/תוכנית הלימודים באתר/u]);
    return {
      surface,
      policy,
      ...evalResult,
      onCurriculum: /תוכנית הלימודים באתר/u.test(text),
      screenshot: shot.replace(/\\/g, "/"),
      sample: text.slice(0, 450),
    };
  } finally {
    await page.close();
  }
}

async function resolveParentActivityUrl() {
  const supabase = getServiceSupabase();
  if (!supabase) return null;
  const auth = await resolveParentBearer(ORIGIN);
  if (!auth.token) return null;
  const student = await resolveTruthGateStudent(supabase, auth.userId, {
    origin: ORIGIN,
    bearer: auth.token,
    studentUsername: process.env.E2E_STUDENT_USERNAME || "aaa5",
  });
  if (!student?.id) return null;
  process.env.E2E_STUDENT_USERNAME = String(student.login_username || "aaa5").trim();
  const created = await createParentActivity(ORIGIN, auth.token, student, {
    title: `[P0 final] ${Date.now()}`,
    questionCount: 3,
    questionSet: sampleQuestionSet(3),
  });
  const login = await loginStudent(ORIGIN);
  await fetch(`${ORIGIN}/api/student/activities/${created.activityId}/start`, {
    method: "POST",
    headers: { Cookie: login.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
    body: "{}",
  });
  return { url: `${ORIGIN}/student/activity/${created.activityId}`, cookie: login.cookie, activityId: created.activityId };
}

async function checkParentAssigned(context) {
  const activity = await resolveParentActivityUrl();
  if (!activity?.url) {
    return { surface: "parent-assigned-activity", policy: "assigned", pass: false, englishLeaks: ["fixture unresolved"], screenshot: null, sample: "" };
  }
  const page = await context.newPage();
  let answerJson = null;
  let submitJson = null;
  try {
    await page.context().addCookies([
      { name: "liosh_student_session", value: activity.cookie.replace(/^liosh_student_session=/, ""), url: ORIGIN },
    ]);
    await page.goto(activity.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByPlaceholder("הקלידו תשובה").or(page.getByTestId("activity-answer-choices")).first().waitFor({ timeout: 60_000 });
    const choices = page.locator('[data-testid="activity-answer-choices"] button');
    if ((await choices.count()) > 0) {
      await choices.first().click();
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("/answer") && res.request().method() === "POST" && res.ok(),
        { timeout: 15_000 }
      );
      await page.getByRole("button", { name: "שליחת תשובה" }).first().click();
      answerJson = await (await responsePromise).json();
    } else {
      const numeric = page.getByTestId("activity-math-numeric-answer").or(page.getByTestId("activity-geometry-numeric-answer"));
      await numeric.first().click();
      const vk0 = page.getByTestId("virtual-key-0");
      if (await vk0.isVisible().catch(() => false)) {
        await vk0.click();
      } else {
        await numeric.first().fill("0");
      }
      await page.waitForTimeout(400);
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("/answer") && res.request().method() === "POST" && res.ok(),
        { timeout: 15_000 }
      );
      await page.getByRole("button", { name: "שליחת תשובה" }).first().click();
      answerJson = await (await responsePromise).json();
    }
    await page.getByText("לא נכון").waitFor({ timeout: 3_000 }).catch(() => null);
    await page.waitForTimeout(300);
    const text = await page.locator("body").innerText();
    const shot = resolve(OUT, "parent-assigned-activity-wrong-feedback.png");
    await page.screenshot({ path: shot, fullPage: true });
    const evalResult = evaluateAssigned(text);
    const submitRes = await fetch(`${ORIGIN}/api/student/activities/${activity.activityId}/submit`, {
      method: "POST",
      headers: { Cookie: activity.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
      body: "{}",
    });
    submitJson = await submitRes.json().catch(() => ({}));
    const apiPass =
      answerJson?.isCorrect === false &&
      answerJson?.correctAnswer == null &&
      submitJson?.revealAnswers !== true &&
      submitJson?.correctAnswer == null;
    return {
      surface: "parent-assigned-activity",
      policy: "assigned",
      ...evalResult,
      pass: evalResult.pass && apiPass,
      apiCorrectAnswerLeaked: answerJson?.correctAnswer ?? null,
      apiRevealAnswers: answerJson?.revealAnswers ?? null,
      submitRevealAnswers: submitJson?.revealAnswers ?? null,
      submitCorrectAnswer: submitJson?.correctAnswer ?? null,
      screenshot: shot.replace(/\\/g, "/"),
      sample: text.slice(0, 450),
      activityId: activity.activityId,
    };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL", viewport: { width: 390, height: 844 } });
const results = [];

try {
  results.push(await checkMathLearning(context));
  results.push(await checkMathPractice(context));
  results.push(
    await checkGeometry(context, {
      modeLabel: "למידה",
      policy: "learning",
      surface: "geometry-learning",
      shotName: "geometry-learning-wrong-feedback.png",
    })
  );
  results.push(
    await checkGeometry(context, {
      modeLabel: "אתגר",
      policy: "practice",
      surface: "geometry-challenge",
      shotName: "geometry-challenge-wrong-feedback.png",
    })
  );
  results.push(await checkParentAssigned(context));
} finally {
  await browser.close();
}

const out = {
  origin: ORIGIN,
  generatedAt: new Date().toISOString(),
  policyNotes: {
    learning: "expects wrong feedback + answer reveal + explanation popup",
    practice: "expects Hebrew wrong feedback without answer in live feedback prefix",
    assigned: "expects binary feedback only; API correctAnswer null; revealAnswers never true",
  },
  results,
  pass: results.every((r) => r.pass),
};
writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(out.pass ? 0 : 1);
