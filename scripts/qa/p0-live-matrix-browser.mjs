#!/usr/bin/env node
/** P0 live wrong-answer matrix — Hebrew only, no answer leak, no hints. */
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

const ORIGIN = (process.env.PLAYWRIGHT_BASE_URL || process.env.TRUTH_GATES_BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-final-verification-screenshots");
const JSON_OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/p0-live-matrix-browser.json");

const FORBIDDEN = [
  /Wrong!/i,
  /Correct!/i,
  /Correct answer/i,
  /Game Over!/i,
  /Loading\.\.\./i,
  /\bNext\b/,
  /Hint:/i,
  /רמז:/u,
  /תשובה נכונה:/u,
  /התשובה הנכונה/u,
  /הפירוש הנכון/u,
  /התרגום הנכון/u,
];

mkdirSync(OUT, { recursive: true });

async function mockStudent(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: { id: "e2e-matrix", full_name: "matrix-test", grade_level: 3, is_active: true },
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

async function pickFirstMcq(page, prefix) {
  const mcq = page.locator(`[data-testid^="${prefix}-mcq-"]`).first();
  if (await mcq.isVisible().catch(() => false)) {
    await mcq.click();
    return true;
  }
  return false;
}

async function pickWrongGeneric(page, surface) {
  if (surface === "math" || (await page.getByTestId("math-answer-surface").isVisible().catch(() => false))) {
    const input = page.locator('[data-testid="math-answer-surface"] input, [data-testid="math-answer-surface"] textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("0");
      const check = page.getByTestId("math-check-answer");
      if (await check.isEnabled().catch(() => false)) {
        await check.click();
        return;
      }
    }
  }
  for (const prefix of ["math", "geometry", "english", "science", "hebrew", "moledet"]) {
    if (await pickFirstMcq(page, prefix)) return;
  }
  const check = page.getByTestId("geometry-check-answer");
  if (await check.isVisible().catch(() => false) && (await check.isEnabled().catch(() => false))) {
    await check.click();
    return;
  }
  const btns = page.locator("button").filter({ hasNotText: /התחל|שמור|הכל|דף|סיום|הגדר|סגור|חזור/i });
  const n = await btns.count();
  for (let i = 0; i < Math.min(n, 12); i++) {
    const t = (await btns.nth(i).innerText().catch(() => "")).trim();
    if (t && t.length < 48) {
      await btns.nth(i).click();
      return;
    }
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

async function checkSurface(context, name, setup) {
  const page = await context.newPage();
  try {
    await mockStudent(page);
    await setup(page);
    await pickWrongGeneric(page, name);
    await page.waitForTimeout(1800);
    const text = await page.locator("body").innerText();
    const leaks = FORBIDDEN.filter((re) => re.test(text));
    const shot = resolve(OUT, `${name}-wrong-feedback.png`);
    await page.screenshot({ path: shot, fullPage: true });
    return {
      surface: name,
      pass: leaks.length === 0,
      leaks: leaks.map(String),
      screenshot: shot.replace(/\\/g, "/"),
      sample: text.slice(0, 400),
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
  const loginUsername = String(student.login_username || process.env.E2E_STUDENT_USERNAME || "aaa5").trim();
  process.env.E2E_STUDENT_USERNAME = loginUsername;
  const created = await createParentActivity(ORIGIN, auth.token, student, {
    title: `[P0 matrix] ${Date.now()}`,
    questionCount: 3,
    questionSet: sampleQuestionSet(3),
  });
  const login = await loginStudent(ORIGIN);
  await fetch(`${ORIGIN}/api/student/activities/${created.activityId}/start`, {
    method: "POST",
    headers: { Cookie: login.cookie, Origin: ORIGIN, "Content-Type": "application/json" },
    body: "{}",
  });
  return {
    url: `${ORIGIN}/student/activity/${created.activityId}`,
    cookie: login.cookie,
    activityId: created.activityId,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL", viewport: { width: 390, height: 844 } });
const results = [];

try {
  results.push(
    await checkSurface(context, "math", async (p) => {
      await p.goto(`${ORIGIN}/learning/math-master`);
      await selectGradeAndLevel(p, { gradeTestId: "math-grade-select", gradeValue: "3" });
      const op = p.getByTestId("math-operation-select");
      const vals = await op.evaluate((el) => [...el.options].map((o) => o.value));
      await op.selectOption(vals.find((v) => v === "addition") || vals[0]);
      await confirmMixed(p);
      await p.getByTestId("math-start-game").click();
      await p.getByTestId("math-question-surface").waitFor({ timeout: 60_000 });
    })
  );

  results.push(
    await checkSurface(context, "geometry", async (p) => {
      await p.goto(`${ORIGIN}/learning/geometry-master`);
      await selectGradeAndLevel(p, { gradeValue: "g3" });
      const closeCurriculum = p.getByRole("button", { name: /סגירה|סגור|✖/u }).first();
      if (await closeCurriculum.isVisible().catch(() => false)) await closeCurriculum.click();
      const sel = p.getByTestId("geometry-topic-select");
      const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
      await sel.selectOption(vals[0]);
      await confirmMixed(p);
      await p.getByTestId("geometry-start-game").click();
      await p.getByTestId("geometry-question-stem").waitFor({ timeout: 60_000 });
    })
  );

  results.push(
    await checkSurface(context, "english", async (p) => {
      await p.goto(`${ORIGIN}/learning/english-master`);
      await selectGradeAndLevel(p, { gradeValue: "3" });
      const sel = p.getByTestId("english-topic-select");
      const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
      await sel.selectOption(vals.find((v) => v === "vocabulary") || vals[0]);
      await confirmMixed(p);
      await p.getByTestId("english-start-game").click();
      await p.locator('[data-testid^="english-mcq-"]').first().waitFor({ timeout: 60_000 });
    })
  );

  results.push(
    await checkSurface(context, "science", async (p) => {
      await p.goto(`${ORIGIN}/learning/science-master`);
      await selectGradeAndLevel(p, { gradeValue: "3" });
      const sel = p.getByTestId("science-topic-select");
      const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
      await sel.selectOption(vals[0]);
      await confirmMixed(p);
      await p.getByTestId("science-start-game").click();
      await p.locator('[data-testid^="science-mcq-"]').first().waitFor({ timeout: 60_000 });
    })
  );

  results.push(
    await checkSurface(context, "hebrew", async (p) => {
      await p.goto(`${ORIGIN}/learning/hebrew-master`);
      await selectGradeAndLevel(p, { gradeValue: "3" });
      const sel = p.getByTestId("hebrew-topic-select");
      const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
      await sel.selectOption(vals[0]);
      await confirmMixed(p);
      await p.getByTestId("hebrew-start-game").click();
      await p.getByTestId("hebrew-question-stem").waitFor({ timeout: 60_000 });
    })
  );

  results.push(
    await checkSurface(context, "moledet", async (p) => {
      await p.goto(`${ORIGIN}/learning/moledet-geography-master`);
      await selectGradeAndLevel(p, { gradeTestId: "moledet-grade-select", gradeValue: "3" });
      const sel = p.getByTestId("moledet-topic-select");
      const vals = await sel.evaluate((el) => [...el.options].map((o) => o.value).filter(Boolean));
      await sel.selectOption(vals[0]);
      await confirmMixed(p);
      await p.getByTestId("moledet-start-game").click();
      await p.getByTestId("moledet-question-stem").waitFor({ timeout: 60_000 });
    })
  );

  const activity = await resolveParentActivityUrl();
  if (activity?.url) {
    const page = await context.newPage();
    try {
      await page.context().addCookies([
        {
          name: "liosh_student_session",
          value: activity.cookie.replace(/^liosh_student_session=/, ""),
          url: ORIGIN,
        },
      ]);
      await page.goto(activity.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page
        .getByTestId("activity-answer-choices")
        .or(page.getByTestId("activity-submit-answer"))
        .first()
        .waitFor({ timeout: 60_000 });
      const choices = page.locator('[data-testid="activity-answer-choices"] button');
      if ((await choices.count()) > 0) {
        await choices.first().click();
      } else {
        const input = page.locator('input[type="text"], input[type="number"]').first();
        if (await input.isVisible().catch(() => false)) {
          await input.fill("0");
          await page.getByTestId("activity-submit-answer").first().click();
        }
      }
      await page.waitForTimeout(1800);
      const text = await page.locator("body").innerText();
      const leaks = FORBIDDEN.filter((re) => re.test(text));
      const shot = resolve(OUT, "parent-assigned-activity-wrong-feedback.png");
      await page.screenshot({ path: shot, fullPage: true });
      results.push({
        surface: "parent-assigned-activity",
        pass: leaks.length === 0,
        leaks: leaks.map(String),
        screenshot: shot.replace(/\\/g, "/"),
        sample: text.slice(0, 400),
        activityId: activity.activityId,
      });
    } catch (err) {
      const shot = resolve(OUT, "parent-assigned-activity-wrong-feedback.png");
      await page.screenshot({ path: shot, fullPage: true }).catch(() => null);
      results.push({
        surface: "parent-assigned-activity",
        pass: false,
        leaks: [err?.message || String(err)],
        screenshot: shot.replace(/\\/g, "/"),
        sample: (await page.locator("body").innerText().catch(() => "")).slice(0, 400),
        activityId: activity.activityId,
      });
    } finally {
      await page.close();
    }
  } else {
    results.push({
      surface: "parent-assigned-activity",
      pass: false,
      leaks: ["fixture: could not resolve parent-linked student / activity"],
      screenshot: null,
      sample: "",
    });
  }
} finally {
  await browser.close();
}

const out = { origin: ORIGIN, generatedAt: new Date().toISOString(), results, pass: results.every((r) => r.pass) };
writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
