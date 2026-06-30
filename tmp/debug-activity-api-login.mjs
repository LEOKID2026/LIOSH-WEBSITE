#!/usr/bin/env node
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const BASE = `http://127.0.0.1:${process.argv[2] || 3012}`;
const ORIGIN = BASE;

async function apiLogin(username) {
  const res = await fetch(`${ORIGIN}/api/student/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/student/login`,
    },
    body: JSON.stringify({ username, pin: "1234" }),
  });
  const body = await res.json();
  const setCookie = res.headers.get("set-cookie") || "";
  const m = setCookie.match(/liosh_student_session=([^;]+)/);
  if (!m) throw new Error(`no cookie ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return decodeURIComponent(m[1]);
}

async function main() {
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
      email: process.env.E2E_PARENT_EMAIL || "admin@admin.com",
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
  const studentId = codes[0].student_id;
  const title = `[API debug] ${Date.now()}`;
  const createRes = await fetch(`${BASE}/api/parent/activities`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId,
      title,
      subject: "history",
      topic: "classical_greece",
      gradeLevel: "g6",
      difficultyLevel: "easy",
      mode: "guided_practice",
      questionCount: 10,
      questionSet: qs,
    }),
  });
  const created = await createRes.json();
  const activityId = created.activityId;
  console.log("activity", activityId);

  const cookieVal = await apiLogin("aaa1");
  const startRes = await fetch(`${BASE}/api/student/activities/${activityId}/start`, {
    method: "POST",
    headers: {
      Cookie: `liosh_student_session=${cookieVal}`,
      Origin: ORIGIN,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const startBody = await startRes.json();
  console.log(
    "start",
    startRes.status,
    startBody.ok,
    startBody.error,
    "q",
    startBody.questionSet?.length
  );

  for (const sw of ["allow", "block"]) {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ locale: "he-IL", serviceWorkers: sw });
    await ctx.addCookies([
      { name: "liosh_student_session", value: cookieVal, url: `${ORIGIN}/` },
    ]);
    const page = await ctx.newPage();
    const logs = [];
    page.on("pageerror", (e) => logs.push(e.message.slice(0, 120)));
    await page.goto(`${BASE}/student/activity/${activityId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForTimeout(8000);
    const hasChoices = await page.locator('[data-testid="activity-answer-choices"]').count();
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200);
    console.log("sw=", sw, "choices=", hasChoices, "text=", text, "errors=", logs.join("|"));
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
