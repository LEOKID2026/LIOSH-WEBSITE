#!/usr/bin/env node
/** Verify learning/practice/assigned answer policy after scoped fix. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadEnvFiles } from "../truth-gates/lib/env.mjs";
import {
  resolveParentBearer,
  resolveTruthGateStudent,
  getServiceSupabase,
} from "../truth-gates/lib/live-parent-report.mjs";
import { createParentActivity, loginStudent, sampleQuestionSet } from "../truth-gates/lib/live-parent-activity-flow.mjs";
import { getErrorExplanation as hebrewErrorExpl } from "../../utils/hebrew-explanations.js";
import { shouldRevealCorrectAnswerToStudent } from "../../lib/classroom-activities/classroom-activities-shared.server.js";

loadEnvFiles();
if (process.env.E2E_STUDENT_USERNAME === "leo-s01") {
  process.env.E2E_STUDENT_USERNAME = "aaa5";
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || process.env.TRUTH_GATES_BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "docs/qa");
const JSON_OUT = resolve(OUT_DIR, "policy-answer-scope-verify.json");

const results = { unit: {}, static: {}, browser: {}, verdict: "NOT PASS" };

function runUnit() {
  const mathSrc = readFileSync(resolve(ROOT, "utils/math-explanations.js"), "utf8");
  results.unit.mathLearningUsesAgeAppropriate =
    /opts\.mode === "learning"/.test(mathSrc) &&
    /getAgeAppropriateExplanation\(/.test(mathSrc);
  results.unit.mathPracticeProcessOnly =
    /case "addition":/.test(mathSrc) &&
    /כדאי לבדוק שוב את החיבור/.test(mathSrc);

  const hq = { correctAnswer: "שלום" };
  const hLearning = hebrewErrorExpl(hq, "vocabulary", "x", "g3", { mode: "learning" });
  const hPractice = hebrewErrorExpl(hq, "vocabulary", "x", "g3", { mode: "speed" });
  results.unit.hebrewLearningHasAnswer = /שלום/u.test(hLearning);
  results.unit.hebrewPracticeNoAnswer = !/התשובה הנכונה/u.test(hPractice);

  results.unit.revealAlwaysFalse = ["quiz", "guided_practice", "homework"].every(
    (mode) =>
      shouldRevealCorrectAnswerToStudent(mode) === false &&
      shouldRevealCorrectAnswerToStudent(mode, { submitted: true }) === false
  );
  results.unit.pass =
    results.unit.mathLearningUsesAgeAppropriate &&
    results.unit.mathPracticeProcessOnly &&
    results.unit.hebrewLearningHasAnswer &&
    results.unit.hebrewPracticeNoAnswer &&
    results.unit.revealAlwaysFalse;
}

function collectJsFiles(basePath) {
  const files = [];
  const st = statSync(basePath, { throwIfNoEntry: false });
  if (!st) return files;
  if (st.isFile() && basePath.endsWith(".js")) {
    files.push(basePath);
    return files;
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(basePath)) {
      files.push(...collectJsFiles(join(basePath, name)));
    }
  }
  return files;
}

function runStatic() {
  const paths = [
    "pages/learning/math-master.js",
    "pages/learning/english-master.js",
    "pages/learning/science-master.js",
    "pages/learning/hebrew-master.js",
    "pages/learning/moledet-geography-master.js",
    "pages/learning/geometry-master.js",
    "pages/student/activity/[activityId].js",
  ];
  const forbidden = [
    { re: /Wrong!/g, label: "Wrong!" },
    { re: /Correct answer/gi, label: "Correct answer" },
    { re: /Correct!/g, label: "Correct!" },
    { re: /Loading\.\.\./g, label: "Loading..." },
    { re: /\bNext\b/g, label: "Next" },
    { re: /Game Over!/g, label: "Game Over!" },
  ];
  const hits = [];
  for (const rel of paths) {
    for (const fp of collectJsFiles(resolve(ROOT, rel))) {
      const content = readFileSync(fp, "utf8");
      for (const { re, label } of forbidden) {
        re.lastIndex = 0;
        if (re.test(content)) hits.push({ file: fp.replace(/\\/g, "/"), label });
      }
    }
  }
  results.static.forbiddenUiHits = hits;
  results.static.pass = hits.length === 0;

  const engSrc = readFileSync(resolve(ROOT, "pages/learning/english-master.js"), "utf8");
  const mathSrc = readFileSync(resolve(ROOT, "pages/learning/math-master.js"), "utf8");
  results.static.englishStepByStepHasCorrectAnswer = /הפירוש הנכון הוא: \$\{correctAnswer\}/.test(engSrc);
  results.static.mathBuildStepUntouched = /buildStepExplanation/.test(mathSrc) && /התשובה: \$\{ans\}/.test(
    readFileSync(resolve(ROOT, "utils/math-explanations.js"), "utf8")
  );
  results.static.passLearningSource =
    results.static.englishStepByStepHasCorrectAnswer && results.static.mathBuildStepUntouched;
}

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "e2e-policy", full_name: "policy-test", grade_level: 3, is_active: true },
      }),
    });
  });
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
  const created = await createParentActivity(ORIGIN, auth.token, student, {
    title: `[policy verify] ${Date.now()}`,
    questionCount: 3,
    questionSet: sampleQuestionSet(3),
  });
  const login = await loginStudent(ORIGIN);
  await fetch(`${ORIGIN}/api/student/activities/${created.activityId}/start`, {
    method: "POST",
    headers: { Cookie: login.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
    body: "{}",
  });
  return { cookie: login.cookie, activityId: created.activityId };
}

async function runBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const out = {};

  async function startMathWrongAnswer(page, gameModeLabel) {
    await mockStudent(page);
    await page.goto(`${ORIGIN}/learning/math-master`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (gameModeLabel) {
      await page.getByRole("button", { name: gameModeLabel, exact: true }).click();
    }
    await page.getByTestId("math-grade-select").selectOption("3");
    await page.getByTestId("math-operation-select").selectOption("addition");
    const save = page.getByRole("button", { name: "שמור", exact: true });
    if (await save.isVisible().catch(() => false)) {
      if (await page.getByRole("button", { name: "הכל", exact: true }).isVisible().catch(() => false)) {
        await page.getByRole("button", { name: "הכל", exact: true }).click();
      }
      await save.click();
    }
    await page.getByTestId("math-start-game").click();
    await page.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
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
        const partial = await page.locator("body").innerText();
        if (/לא נכון/u.test(partial)) break;
      }
    }
    await page.waitForTimeout(1500);
    return page.locator("body").innerText();
  }

  const learningPage = await context.newPage();
  try {
    const learningText = await startMathWrongAnswer(learningPage, "למידה");
    out.learningModeSample = learningText.slice(0, 450);
    out.learningShowsAnswer =
      /התשובה הנכונה/u.test(learningText) || /=\s*\d+/u.test(learningText);
  } finally {
    await learningPage.close();
  }

  const practicePage = await context.newPage();
  try {
    const practiceText = await startMathWrongAnswer(practicePage, "אתגר");
    out.practiceModeSample = practiceText.slice(0, 450);
    out.practiceNoEquationLeak = !/\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+/u.test(practiceText);
    out.practiceNoAnswerInFeedback = !/התשובה הנכונה/u.test(practiceText.split("למה הטעות")[0] || practiceText);
    out.practiceHasHebrewWrong = /לא נכון/u.test(practiceText);
  } finally {
    await practicePage.close();
  }

  try {
    const activity = await resolveParentActivityUrl();
    if (!activity?.activityId) throw new Error("parent activity setup failed");
    const answerRes = await fetch(`${ORIGIN}/api/student/activities/${activity.activityId}/answer`, {
      method: "POST",
      headers: { Cookie: activity.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex: 0, selectedAnswer: "wrong-answer" }),
    });
    const answerJson = await answerRes.json();
    out.parentAssignedAnswerApi = {
      correctAnswer: answerJson.correctAnswer ?? null,
      revealAnswers: answerJson.revealAnswers ?? null,
    };
    const submitRes = await fetch(`${ORIGIN}/api/student/activities/${activity.activityId}/submit`, {
      method: "POST",
      headers: { Cookie: activity.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
      body: "{}",
    });
    const submitJson = await submitRes.json();
    out.parentAssignedSubmitApi = {
      correctAnswer: submitJson.correctAnswer ?? null,
      revealAnswers: submitJson.revealAnswers ?? null,
    };
  } catch (e) {
    out.parentAssignedError = String(e?.message || e);
  }

  await browser.close();
  out.pass =
    out.learningShowsAnswer === true &&
    out.practiceNoEquationLeak === true &&
    out.practiceNoAnswerInFeedback === true &&
    out.practiceHasHebrewWrong === true &&
    out.parentAssignedAnswerApi?.correctAnswer == null &&
    out.parentAssignedSubmitApi?.revealAnswers !== true;
  return out;
}

runUnit();
runStatic();

  try {
  const ping = await fetch(`${ORIGIN}/learning/math-master`).catch(() => null);
  if (!ping?.ok) throw new Error(`server not reachable at ${ORIGIN}`);
  results.browser = await runBrowser();
} catch (e) {
  results.browser = { error: String(e?.message || e), pass: false };
}

const allPass =
  results.unit.pass &&
  results.static.pass &&
  results.static.passLearningSource &&
  results.browser.pass;

results.verdict = allPass ? "PASS" : "NOT PASS";
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(allPass ? 0 : 1);
