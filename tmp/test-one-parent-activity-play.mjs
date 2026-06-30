#!/usr/bin/env node
/** Run one full parent-activity browser play with step logging. */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PORT = Number(process.argv[2] || 3012);
const BASE = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getParentToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@admin.com",
      password: process.env.E2E_PARENT_PASSWORD || "",
    }),
  });
  return (await res.json()).access_token;
}

async function main() {
  const token = await getParentToken();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
    process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id")
    .eq("login_username", "aaa1")
    .limit(1);
  const studentId = codes[0].student_id;

  const { generateActivityQuestionSetClient } = await import(
    pathToFileURL(join(ROOT, "lib/classroom-activities/generate-activity-questions-client.js")).href
  );
  const questionSet = await generateActivityQuestionSetClient({
    subject: "history",
    gradeLevel: "g6",
    topic: "classical_greece",
    difficulty: "easy",
    count: 10,
  });
  const title = `[ONE PLAY] ${Date.now()}`;
  const createRes = await fetch(`${BASE}/api/parent/activities`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      title,
      subject: "history",
      topic: "classical_greece",
      gradeLevel: "g6",
      difficultyLevel: "easy",
      mode: "guided_practice",
      questionCount: 10,
      questionSet,
    }),
  });
  const { activityId } = await createRes.json();
  console.log("activityId", activityId);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: "he-IL", serviceWorkers: "block" });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("student-login-username").fill("AAA1");
  await page.getByTestId("student-login-pin").fill("1234");
  await Promise.all([
    page.waitForURL("**/student/home**"),
    page.getByTestId("student-login-submit").click(),
  ]);
  console.log("logged in");

  await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded" });
  await page.getByText("פעילויות אישיות", { exact: false }).first().click();
  await sleep(1500);
  await page.getByRole("dialog").getByText(title, { exact: false }).waitFor();
  console.log("dialog ok");

  await page.goto(`${BASE}/student/activity/${activityId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="activity-answer-choices"]', { state: "visible", timeout: 90_000 });
  console.log("choices visible");

  for (let i = 0; i < questionSet.length; i++) {
    const q = questionSet[i];
    const correct = String(q.correctAnswer ?? "").trim();
    console.log(`q${i + 1} correct=${correct.slice(0, 40)}`);
    await page.waitForFunction(
      () => {
        const btns = document.querySelectorAll('[data-testid="activity-answer-choices"] button');
        return btns.length > 0 && !btns[0].disabled;
      },
      { timeout: 60_000 }
    );
    const choices = page.locator('[data-testid="activity-answer-choices"] button');
    const count = await choices.count();
    const choiceList = q.choices.map(String);
    let choiceIndex = choiceList.findIndex((c) => c.trim() === correct);
    if (choiceIndex < 0) {
      choiceIndex = choiceList.findIndex((c) => c.includes(correct) || correct.includes(c.trim()));
    }
    console.log(`  choiceIndex=${choiceIndex} count=${count}`);
    if (choiceIndex >= 0 && choiceIndex < count) {
      await choices.nth(choiceIndex).click();
    } else {
      await choices.filter({ hasText: correct }).first().click();
    }
    const submit = page.getByTestId("activity-submit-answer").first();
    await submit.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="activity-submit-answer"]');
      return btn && !btn.disabled;
    });
    const answerWait = page.waitForResponse(
      (r) => r.url().includes("/answer") && r.request().method() === "POST"
    );
    await submit.click();
    const answerRes = await answerWait;
    console.log(`  answer status=${answerRes.status()}`);
    if (i < questionSet.length - 1) {
      await sleep(2500);
    }
  }

  const finishBtn = page.getByRole("button", { name: /סיום והגשה/ });
  await finishBtn.click();
  await page.getByRole("button", { name: /כן, סיום והגשה/ }).click();
  await page.waitForFunction(() => /הגשת|הושלם|תוצאה|ציון/u.test(document.body?.innerText || ""), {
    timeout: 60_000,
  });
  console.log("DONE pass=true answered=10");
  await browser.close();
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
