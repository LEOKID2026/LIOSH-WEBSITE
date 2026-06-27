#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import {
  GRADE_HE,
  SUBJECT_PLANS,
  studentForGrade,
  topicsForGrade,
} from "./lib/visual-qa-config.mjs";
import {
  dismissBlockingUi,
  navigateToPlayerShell,
  readMcqAnswers,
  selectPracticeMode,
  selectTopicIfAvailable,
  startQuestionSurface,
  stopActiveGameIfAny,
} from "./lib/visual-qa-surface.mjs";

const BASE = resolveBaseUrl();
const GRADE = 3;
const SUBJECTS = ["math", "geometry", "hebrew", "english", "science"];
const MCQ_PREFIX = {
  geometry: "geometry-mcq-",
  hebrew: "hebrew-mcq-",
  english: "english-mcq-",
  science: "science-mcq-",
};
const CHECK = {
  math: "math-check-answer",
  geometry: "geometry-check-answer",
  hebrew: "hebrew-check-answer",
  english: "english-check-answer",
  science: "science-check-answer",
};
const NUMERIC = { math: "math-text-answer", geometry: "geometry-text-answer" };

async function tryAnswer(page, subject) {
  const prefix = MCQ_PREFIX[subject];
  if (prefix) {
    const btn = page.getByTestId(`${prefix}0`);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      const check = page.getByTestId(CHECK[subject]);
      if (await check.isVisible().catch(() => false) && (await check.isEnabled().catch(() => false))) {
        await check.click();
        await page.waitForTimeout(600);
      }
      return "mcq";
    }
  }
  const numId = NUMERIC[subject];
  if (numId) {
    const input = page.getByTestId(numId);
    if (await input.isVisible().catch(() => false)) {
      await input.fill("42");
      const check = page.getByTestId(CHECK[subject]);
      if (await check.isEnabled().catch(() => false)) await check.click();
      await page.waitForTimeout(600);
      return "numeric";
    }
  }
  return "none";
}

async function smokeSubject(browser, student, subject) {
  const plan = SUBJECT_PLANS[subject];
  const topic = topicsForGrade(plan, GRADE)[0];
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(90_000);
  try {
    await authenticateStudent({ context: ctx, page, account: student, baseUrl: BASE, log: () => {} });
    await navigateToPlayerShell(page, plan, BASE, { log: () => {} });
    await dismissBlockingUi(page);
    await selectTopicIfAvailable(page, plan.topicSelectTestId, topic, () => {});
    await selectPracticeMode(page, `${subject}-master`, plan.startTestId, () => {});
    await startQuestionSurface(page, plan.startTestId, subject, { log: () => {} });

    const prefix = MCQ_PREFIX[subject];
    const answers = prefix ? await readMcqAnswers(page, prefix) : [];
    const body = await page.locator("body").innerText();
    if (/\bBLOCKED\b|\bundefined\b|\bNaN\b|\[object Object\]/i.test(body)) {
      return { pass: false, detail: "blocked or leak in body" };
    }

    const answerMode = await tryAnswer(page, subject);
    const after = await page.locator("body").innerText();
    if (/\bundefined\b|\bNaN\b|\[object Object\]/i.test(after)) {
      return { pass: false, detail: "leak after answer" };
    }

    return {
      pass: answerMode !== "none",
      detail: `answers=${answers.length || "numeric"} click=${answerMode}`,
    };
  } catch (e) {
    return { pass: false, detail: e?.message || String(e) };
  } finally {
    await stopActiveGameIfAny(page).catch(() => {});
    await ctx.close();
  }
}

const student = studentForGrade(GRADE, false);
const browser = await chromium.launch({ headless: true });
const out = {};
for (const s of SUBJECTS) out[s] = await smokeSubject(browser, student, s);
await browser.close();
console.log(JSON.stringify({ student: student.label, baseUrl: BASE, subjects: out }, null, 2));
process.exit(Object.values(out).every((r) => r.pass) ? 0 : 1);
