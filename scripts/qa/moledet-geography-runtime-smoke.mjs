#!/usr/bin/env node
/** Read-only runtime smoke for moledet-geography — grades G2–G6, one sample each. */
import { chromium } from "@playwright/test";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import { studentForGrade } from "./lib/visual-qa-config.mjs";
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
const PLAN = {
  path: "/learning/moledet-geography-master",
  playerTestId: "moledet-player-name",
  gradeSelectTestId: "moledet-grade-select",
  gradeValueKind: "numeric",
  topicSelectTestId: "moledet-topic-select",
  startTestId: "moledet-start-game",
};
const TOPICS = [
  { value: "homeland", label: "מולדet" },
  { value: "community", label: "קהילה" },
  { value: "geography", label: "גאוגרפיה" },
];

async function smokeGrade(browser, gradeNum) {
  const student = studentForGrade(gradeNum, false);
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  const out = { grade: gradeNum, student: student?.label, pass: false, detail: "" };
  try {
    await authenticateStudent({ context: ctx, page, account: student, baseUrl: BASE, log: () => {} });
    await navigateToPlayerShell(page, PLAN, BASE, { log: () => {} });
    await dismissBlockingUi(page);
    await selectTopicIfAvailable(page, PLAN.topicSelectTestId, TOPICS[gradeNum % TOPICS.length], () => {});
    await selectPracticeMode(page, "moledet-geography-master", PLAN.startTestId, () => {});
    await startQuestionSurface(page, PLAN.startTestId, "moledet", { log: () => {} });

    const answers = await readMcqAnswers(page, "moledet-mcq-");
    const stem = await page.getByTestId("moledet-question-stem").innerText().catch(() => "");
    const body = await page.locator("body").innerText();
    const bad =
      /\bBLOCKED\b|\bundefined\b|\bNaN\b|\[object Object\]/i.test(body) ||
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(stem.slice(0, 2000));

    const btn = page.getByTestId("moledet-mcq-0");
    let answered = false;
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      const check = page.getByTestId("moledet-check-answer");
      if (await check.isEnabled().catch(() => false)) {
        await check.click();
        answered = true;
      }
    }

    out.pass = stem.length > 5 && answers.length === 4 && !bad && answered;
    out.detail = `stem=${stem.length > 5} mcq=${answers.length} answered=${answered} bad=${bad}`;
    out.consoleErrors = consoleErrors.slice(0, 3);
  } catch (e) {
    out.detail = e?.message || String(e);
  } finally {
    await stopActiveGameIfAny(page).catch(() => {});
    await ctx.close();
  }
  return out;
}

const browser = await chromium.launch({ headless: true });
const grades = [2, 3, 4, 5, 6];
const results = [];
for (const g of grades) results.push(await smokeGrade(browser, g));
await browser.close();
console.log(JSON.stringify({ baseUrl: BASE, results }, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);
