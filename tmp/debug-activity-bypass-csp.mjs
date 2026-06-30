#!/usr/bin/env node
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const BASE = `http://127.0.0.1:${process.argv[2] || 3012}`;

async function apiLogin(username) {
  const res = await fetch(`${BASE}/api/student/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      Referer: `${BASE}/student/login`,
    },
    body: JSON.stringify({ username, pin: "1234" }),
  });
  const m = (res.headers.get("set-cookie") || "").match(/liosh_student_session=([^;]+)/);
  return decodeURIComponent(m[1]);
}

const { generateActivityQuestionSetClient } = await import(
  pathToFileURL(join(ROOT, "lib/classroom-activities/generate-activity-questions-client.js")).href
);
const qs = await generateActivityQuestionSetClient({
  subject: "history",
  gradeLevel: "g6",
  topic: "classical_greece",
  difficulty: "easy",
  count: 10,
});

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@admin.com",
    password: process.env.E2E_PARENT_PASSWORD || "",
  }),
});
const { access_token } = await authRes.json();
const supabase = createClient(url, process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: codes } = await supabase
  .from("student_access_codes")
  .select("student_id")
  .eq("login_username", "aaa1")
  .limit(1);
const createRes = await fetch(`${BASE}/api/parent/activities`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    studentId: codes[0].student_id,
    title: `[bypassCSP] ${Date.now()}`,
    subject: "history",
    topic: "classical_greece",
    gradeLevel: "g6",
    difficultyLevel: "easy",
    mode: "guided_practice",
    questionCount: 10,
    questionSet: qs,
  }),
});
const { activityId } = await createRes.json();
const cookieVal = await apiLogin("aaa1");

for (const bypass of [false, true]) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: "he-IL",
    serviceWorkers: "block",
    bypassCSP: bypass,
  });
  await ctx.addCookies([
    { name: "liosh_student_session", value: cookieVal, url: `${BASE}/` },
  ]);
  const page = await ctx.newPage();
  const errs = [];
  const failed = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 150)));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 150)}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text().slice(0, 150));
  });
  await page.goto(`${BASE}/student/activity/${activityId}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  }).catch(() => null);
  await page.waitForTimeout(15000);
  const choices = await page.locator('[data-testid="activity-answer-choices"]').count();
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 120);
  console.log("bypassCSP=", bypass, "choices=", choices, "text=", text, "errs=", errs.slice(0, 3).join(" | "));
  console.log("failed=", failed.slice(0, 8).join("\n  ") || "(none)");
  await browser.close();
}
