#!/usr/bin/env node
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const BASE = `http://127.0.0.1:${process.argv[2] || 3012}`;

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

async function studentLogin(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("student-login-username").fill("AAA1");
  await page.getByTestId("student-login-pin").fill("1234");
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

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
const title = `[QA flow] ${Date.now()}`;
const createRes = await fetch(`${BASE}/api/parent/activities`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: codes[0].student_id,
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

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: "he-IL", serviceWorkers: "block" });
const page = await ctx.newPage();
await studentLogin(page);

for (const mode of ["qa", "direct"]) {
  if (mode === "qa") {
    await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByText("פעילויות אישיות", { exact: false }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole("dialog").getByText(title, { exact: false }).waitFor({ timeout: 30_000 });
  }
  await page.goto(`${BASE}/student/activity/${activityId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="activity-answer-choices"]', {
    state: "visible",
    timeout: 90_000,
  });
  const state = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="activity-answer-choices"] button')];
    return {
      count: btns.length,
      disabled: btns.map((b) => b.disabled),
      texts: btns.map((b) => b.innerText.slice(0, 30)),
    };
  });
  console.log(mode, JSON.stringify(state));
}

await browser.close();
