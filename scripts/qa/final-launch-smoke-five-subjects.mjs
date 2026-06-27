#!/usr/bin/env node
/**
 * Final launch smoke — 5 subjects + parent report + student activity list.
 * Read-only on content; uses live dev server + real Supabase auth.
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import {
  GRADE_HE,
  SUBJECT_PLANS,
  studentForGrade,
  topicsForGrade,
} from "./lib/visual-qa-config.mjs";
import { sampleHasIssues } from "./lib/visual-qa-analyze.mjs";
import {
  captureQuestionSample,
  dismissBlockingUi,
  navigateToPlayerShell,
  readMcqAnswers,
  selectPracticeMode,
  selectTopicIfAvailable,
  startQuestionSurface,
  stopActiveGameIfAny,
} from "./lib/visual-qa-surface.mjs";
import { attachPageDiagnostics } from "./lib/visual-qa-timeout-artifacts.mjs";

const BASE = resolveBaseUrl();
const GRADE = 3;
const SUBJECTS = ["math", "geometry", "hebrew", "english", "science"];
const MCQ_PREFIX = {
  math: "math-mcq-",
  geometry: "geometry-mcq-",
  hebrew: "hebrew-mcq-",
  english: "english-mcq-",
  science: "science-mcq-",
};
const CHECK_TESTID = {
  math: "math-check-answer",
  geometry: "geometry-check-answer",
  hebrew: "hebrew-check-answer",
  english: "english-check-answer",
  science: "science-check-answer",
};

const consoleErrors = [];
const results = {};

function record(key, pass, detail = "") {
  results[key] = { pass, detail };
}

async function tryAnswer(page, subject) {
  const prefix = MCQ_PREFIX[subject];
  if (prefix) {
    const btn = page.getByTestId(`${prefix}0`);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      const checkId = CHECK_TESTID[subject];
      const check = checkId ? page.getByTestId(checkId) : null;
      if (check && (await check.isVisible().catch(() => false))) {
        if (await check.isEnabled().catch(() => false)) {
          await check.click();
          await page.waitForTimeout(800);
          return "mcq+check";
        }
      }
      await page.waitForTimeout(400);
      return "mcq-only";
    }
  }
  const checkId = CHECK_TESTID[subject];
  if (checkId) {
    const check = page.getByTestId(checkId);
    if (await check.isVisible().catch(() => false) && (await check.isEnabled().catch(() => false))) {
      await check.click();
      return "check-only";
    }
  }
  return "no-op";
}

async function runSubjectSmoke(browser, student, subject) {
  const plan = SUBJECT_PLANS[subject];
  const topics = topicsForGrade(plan, GRADE);
  const topic = topics[0];
  const context = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await context.newPage();
  const diag = attachPageDiagnostics(page);
  page.setDefaultTimeout(90_000);

  try {
    await authenticateStudent({
      context,
      page,
      account: student,
      baseUrl: BASE,
      log: () => {},
    });
    record("student_login", true, student.label);

    await navigateToPlayerShell(page, plan, BASE);
    await dismissBlockingUi(page);
    await selectPracticeMode(page, plan);
    await selectTopicIfAvailable(page, plan, topic?.value);
    await startQuestionSurface(page, plan);

    const sample = await captureQuestionSample(page, {
      subject,
      grade: GRADE,
      gradeDisplay: GRADE_HE[GRADE],
      gradeNumber: GRADE,
      studentLabel: student.label,
      topic: topic?.value,
      topicDisplay: topic?.label,
      url: `${BASE}${plan.path}`,
      mode: "final-smoke",
    });

    const prefix = MCQ_PREFIX[subject];
    const answers = prefix ? await readMcqAnswers(page, prefix) : sample.answersDisplayed;
    const isMcq = sample.inputType === "mcq";
    const mcqOk = !isMcq || answers.length === 4;

    if (sampleHasIssues(sample) || !sample.questionText?.trim()) {
      return {
        pass: false,
        detail: `issues=${JSON.stringify(sample.issues?.details || [])} q=${Boolean(sample.questionText)}`,
        diag,
      };
    }
    if (isMcq && !mcqOk) {
      return { pass: false, detail: `mcq_count=${answers.length}`, diag };
    }

    const answerMode = await tryAnswer(page, subject);
    const bodyAfter = await page.locator("body").innerText().catch(() => "");
    if (/\bundefined\b|\bNaN\b|\[object Object\]/i.test(bodyAfter)) {
      return { pass: false, detail: "undefined/null visible after answer", diag };
    }

    return { pass: true, detail: `${isMcq ? "mcq×4" : sample.inputType} answer=${answerMode}`, diag };
  } catch (e) {
    return { pass: false, detail: e?.message || String(e), diag };
  } finally {
    await stopActiveGameIfAny(page).catch(() => {});
    await context.close();
  }
}

async function smokeParentReport(browser) {
  const email = process.env.E2E_PARENT_EMAIL || "";
  const password = process.env.E2E_PARENT_PASSWORD || "";
  if (!email || !password) {
    return { pass: false, detail: "missing E2E_PARENT_EMAIL/PASSWORD", notRun: true };
  }

  const context = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await context.newPage();
  const diag = attachPageDiagnostics(page);
  try {
    await page.goto("/parent/login", { waitUntil: "domcontentloaded" });
    await page.getByTestId("parent-login-identifier").fill(email);
    await page.getByTestId("parent-login-secret").fill(password);
    await page.getByRole("button", { name: /כניסה|התחבר/i }).click();
    await page.waitForURL(/\/(parent|learning)/, { timeout: 60_000 });

    await page.goto("/learning/parent-report", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);

    const root = page.getByTestId("parent-report-parent-sections");
    const visible = await root.isVisible().catch(() => false);
    const text = await page.locator("body").innerText().catch(() => "");
    const bad =
      /\bundefined\b|\bNaN\b|\[object Object\]/i.test(text) ||
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(text.slice(0, 4000));

    if (!visible && !text.includes("דוח")) {
      return { pass: false, detail: "parent report surface not visible" };
    }
    if (bad) {
      return { pass: false, detail: "leak/undefined in parent report body" };
    }
    return { pass: true, detail: visible ? "sections testid visible" : "report text loaded" };
  } catch (e) {
    return { pass: false, detail: e?.message || String(e) };
  } finally {
    await context.close();
  }
}

async function smokeStudentActivities(browser, student) {
  const context = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await context.newPage();
  try {
    await authenticateStudent({
      context,
      page,
      account: student,
      baseUrl: BASE,
      log: () => {},
    });
    const res = await page.request.get("/api/student/activities");
    if (!res.ok()) {
      return { pass: false, detail: `status=${res.status()}`, notRun: false };
    }
    const body = await res.json();
    const list = body?.activities || body?.data?.activities || [];
    const text = JSON.stringify(body);
    if (/\bundefined\b|\[object Object\]/i.test(text)) {
      return { pass: false, detail: "bad payload" };
    }
    return {
      pass: true,
      detail: `activities=${Array.isArray(list) ? list.length : 0}`,
      notRun: false,
    };
  } catch (e) {
    return { pass: false, detail: e?.message || String(e), notRun: true };
  } finally {
    await context.close();
  }
}

async function main() {
  const probe = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(10_000) }).catch(
    () => null
  );
  if (!probe?.ok) {
    console.error(`final-launch-smoke: server not ready at ${BASE}`);
    process.exit(2);
  }

  const student = studentForGrade(GRADE, false);
  if (!student) {
    console.error("no AAA student for grade 3");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  let loginOk = false;
  for (const subject of SUBJECTS) {
    const r = await runSubjectSmoke(browser, student, subject);
    if (r.diag?.consoleErrors?.length) consoleErrors.push(...r.diag.consoleErrors);
    if (r.diag?.pageErrors?.length) consoleErrors.push(...r.diag.pageErrors);
    delete r.diag;
    if (subject === SUBJECTS[0] && results.student_login?.pass) loginOk = true;
    results[`${subject}_smoke`] = r;
  }
  if (!loginOk && results.student_login?.pass) loginOk = true;
  record("student_login", loginOk || results.student_login?.pass === true, student.label);

  results.parent_report = await smokeParentReport(browser);
  results.parent_activity = await smokeStudentActivities(browser, student);

  await browser.close();

  const subjectFails = SUBJECTS.filter((s) => !results[`${s}_smoke`]?.pass);
  const blocked = subjectFails.length > 0 || !results.parent_report?.pass;
  const verdict = blocked ? (subjectFails.length === SUBJECTS.length ? "BLOCKED" : "ISSUES_FOUND") : "PASS";

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    grade: GRADE,
    student: student.label,
    results,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 8),
    verdict,
  };

  console.log(JSON.stringify(out, null, 2));

  const lines = [
    ["Student login", results.student_login?.pass ? "PASS" : "FAIL"],
    ...SUBJECTS.map((s) => [
      `${s[0].toUpperCase()}${s.slice(1)} smoke`,
      results[`${s}_smoke`]?.pass ? "PASS" : "FAIL",
    ]),
    [
      "Parent report loads",
      results.parent_report?.pass ? "PASS" : results.parent_report?.notRun ? "NOT_RUN" : "FAIL",
    ],
    [
      "Parent activity smoke",
      results.parent_activity?.pass
        ? "PASS"
        : results.parent_activity?.notRun
          ? "NOT_RUN"
          : "FAIL",
    ],
    ["Console/server errors", consoleErrors.length ? "כן" : "לא"],
    ["Final verdict", verdict],
  ];
  console.log("\n--- SUMMARY ---");
  for (const [a, b] of lines) console.log(`${a}: ${b}`);

  process.exit(verdict === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
