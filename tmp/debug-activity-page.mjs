#!/usr/bin/env node
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 3012);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, "tmp", "debug-activity-page");
mkdirSync(OUT, { recursive: true });

async function getParentToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.E2E_PARENT_EMAIL || "admin@admin.com",
      password: process.env.E2E_PARENT_PASSWORD || "",
    }),
  });
  const json = await res.json();
  return json.access_token;
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
  const studentId = codes?.[0]?.student_id;

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
  console.log("q0 choices:", questionSet[0]?.choices?.length, "subject:", questionSet[0]?.subject);

  const title = `[DEBUG] classical_greece ${Date.now()}`;
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
  const created = await createRes.json();
  console.log("create:", createRes.status, created?.activityId, created?.error);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  page.on("response", (r) => {
    if (r.url().includes("/api/student/activities/") && r.status() >= 400) {
      logs.push(`[HTTP ${r.status()}] ${r.url()}`);
    }
  });

  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("student-login-username").fill("AAA1");
  await page.getByTestId("student-login-pin").fill("1234");
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);

  const activityId = created.activityId;
  const startPromise = page.waitForResponse(
    (r) => r.url().includes(`/start`) && r.request().method() === "POST",
    { timeout: 120_000 }
  );
  await page.goto(`${BASE}/student/activity/${activityId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  const startRes = await startPromise.catch(() => null);
  let startBody = null;
  if (startRes) {
    startBody = await startRes.json().catch(() => ({}));
    console.log("start status:", startRes.status(), "ok:", startBody?.ok, "phase:", startBody?.error);
    console.log("q0 from start:", startBody?.questionSet?.[0]?.choices?.length);
  }

  await page.waitForTimeout(5000);
  const hasChoices = await page.locator('[data-testid="activity-answer-choices"]').count();
  const hasSubmit = await page.locator('[data-testid="activity-submit-answer"]').count();
  const hasLoading = await page.getByText("טוען").count();
  const bodyText = (await page.locator("body").innerText()).slice(0, 2000);
  await page.screenshot({ path: join(OUT, "activity-page.png"), fullPage: true });
  writeFileSync(
    join(OUT, "debug.json"),
    JSON.stringify(
      {
        activityId,
        startStatus: startRes?.status(),
        startBody: startBody
          ? {
              ok: startBody.ok,
              error: startBody.error,
              alreadyCompleted: startBody.alreadyCompleted,
              questionCount: startBody.questionSet?.length,
              firstQ: startBody.questionSet?.[0],
            }
          : null,
        dom: { hasChoices, hasSubmit, hasLoading },
        bodyText,
        logs: logs.slice(-40),
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ hasChoices, hasSubmit, hasLoading, bodyPreview: bodyText.slice(0, 400) }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
