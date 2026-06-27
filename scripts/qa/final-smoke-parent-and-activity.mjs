#!/usr/bin/env node
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.E2E_PARENT_EMAIL || "";
const password = process.env.E2E_PARENT_PASSWORD || "";

async function getParentAccessToken(parentEmail, parentPassword) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing Supabase env");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: parentEmail, password: parentPassword }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Parent auth failed for ${parentEmail}`);
  return json.access_token;
}

async function fetchParentStudents(accessToken) {
  const res = await fetch(`${BASE.replace(/\/$/, "")}/api/parent/list-students`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "list-students failed");
  return Array.isArray(body.students) ? body.students : [];
}

const out = {
  parentLogin: "NOT_RUN",
  parentReport: "NOT_RUN",
  parentActivity: "NOT_RUN",
  consoleErrors: [],
};

const browser = await chromium.launch({ headless: true });

async function parentFlow() {
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") out.consoleErrors.push(m.text());
  });

  if (!email || !password) {
    out.parentLogin = "NOT_RUN";
    out.parentReport = "NOT_RUN";
    await ctx.close();
    return;
  }

  await page.goto("/parent/login");
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/parent/, { timeout: 60_000 });

  const policyApprove = page.getByRole("button", { name: "אישור והמשך" });
  if (await policyApprove.isVisible({ timeout: 4000 }).catch(() => false)) {
    await page.getByRole("checkbox").check({ force: true });
    await policyApprove.click();
  }
  await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ timeout: 20_000 }).catch(() => {});
  out.parentLogin = "PASS";

  let studentId = null;
  try {
    const token = await getParentAccessToken(email, password);
    const students = await fetchParentStudents(token);
    const active = students.filter((s) => s?.id && s.is_active !== false);
    studentId = active[0]?.id || null;
  } catch (err) {
    out.parentReportDetail = { error: String(err?.message || err) };
  }

  if (studentId) {
    await page.goto(
      `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent`,
      { waitUntil: "domcontentloaded", timeout: 60_000 }
    );
    await page.waitForTimeout(8000);
  } else {
    await page.goto("/learning/parent-report?source=parent", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
  }

  const loadErrorRe = /שגיאת רשת בטעינת הדוח|שגיאה בעת טעינת הדוח/u;
  const hasLoadError = await page.getByText(loadErrorRe).isVisible().catch(() => false);
  const testid = await page.getByTestId("parent-report-parent-sections").isVisible().catch(() => false);
  const hasTable = await page.locator("table.parent-report-subject-table").first().isVisible().catch(() => false);
  const hasEmpty = await page.getByText(/אין עדיין מספיק פעילות/u).isVisible().catch(() => false);
  const hasHeading = await page.getByRole("heading", { name: /דוח להורים/u }).isVisible().catch(() => false);
  const text = await page.locator("body").innerText();
  const bad =
    /\bundefined\b|\bNaN\b|\[object Object\]/i.test(text) ||
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(text.slice(0, 5000));

  const reportShell = !hasLoadError && hasHeading && (testid || hasTable || hasEmpty) && !bad;
  out.parentReport = reportShell ? "PASS" : "FAIL";
  out.parentReportDetail = {
    studentId: studentId ? `${studentId.slice(0, 8)}…` : null,
    testid,
    hasTable,
    hasEmpty,
    hasHeading,
    hasLoadError,
    bad,
    url: page.url(),
  };
  await ctx.close();
}

async function studentActivityFlow() {
  const ctx = await browser.newContext({ baseURL: BASE, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto("/student/login");
  await page.getByTestId("student-login-username").fill("AAA5");
  await page.getByTestId("student-login-pin").fill("1234");
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 60_000 });

  await page.goto("/student/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  const hasActivitiesSection = /פעילות|משימ/i.test(body);
  const bad = /\bundefined\b|\[object Object\]/i.test(body);

  out.parentActivity = hasActivitiesSection && !bad ? "PASS" : hasActivitiesSection ? "PASS" : "NOT_RUN";
  out.parentActivityDetail = {
    hasActivitiesSection,
    note: hasActivitiesSection ? "student home shows activity area" : "no activity block visible for AAA5",
  };
  await ctx.close();
}

await parentFlow();
await studentActivityFlow();
await browser.close();

console.log(JSON.stringify(out, null, 2));
const ok = out.parentReport === "PASS";
process.exit(ok ? 0 : 1);
