#!/usr/bin/env node
/**
 * Verify school portal blockers: /school/students report + /school/classes navigation freeze.
 *
 *   node --env-file=.env.local scripts/school-portal/verify-school-blockers.mjs
 */
import { chromium } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  "";

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const STUDENT_ID = process.env.SCHOOL_BLOCKER_STUDENT_ID || "9abd3ec4-56e9-4af6-9ac0-82806a3a664e";

async function supabaseToken(request, email) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password: pw },
  });
  const json = await res.json();
  return json.access_token || null;
}

async function schoolLogin(page) {
  await page.goto(`${base}/teacher/login`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("המייל שלך").fill("school@leo-k.com");
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL(/\/school\/dashboard/u, { timeout: 60_000 });
}

async function main() {
  if (!pw) {
    console.error("Missing DEMO_TEACHER_PASSWORD / SCHOOL_QA_PASSWORD");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  const meCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/school/me")) meCalls.push(Date.now());
  });

  const evidence = {
    commit: null,
    baseUrl: base,
    listCacheDefault: process.env.NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE || "(unset = OFF)",
    reportCacheDefault: process.env.NEXT_PUBLIC_SCHOOL_PORTAL_REPORT_CACHE || "(unset = OFF)",
    classesNavigation: null,
    studentReportApi: null,
    studentReportUi: null,
  };

  try {
    await schoolLogin(page);
    const token = await supabaseToken(page.request, "school@leo-k.com");
    if (!token) throw new Error("Could not obtain school manager token");

    // ── API proof: student report without classId ──
    const apiPath = `/api/school/students/${STUDENT_ID}/report-data?windowDays=30`;
    const apiRes = await page.request.get(`${base}${apiPath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const apiBody = await apiRes.json();
    evidence.studentReportApi = {
      studentId: STUDENT_ID,
      schoolId: DEMO_SCHOOL_ID,
      classId: null,
      path: apiPath,
      status: apiRes.status(),
      summary: apiBody?.summary
        ? {
            totalAnswers: apiBody.summary.totalAnswers,
            totalSessions: apiBody.summary.totalSessions,
            accuracy: apiBody.summary.accuracy,
          }
        : null,
      debug: apiBody?._schoolReportDebug || null,
    };

    // ── /school/classes navigation (freeze check) ──
    meCalls.length = 0;
    const navStart = Date.now();
    await page.goto(`${base}/school/classes`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "כיתה ג׳" }).click({ timeout: 15_000 });
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click({ timeout: 15_000 });
    await page.getByRole("heading", { name: /מקצועות הכיתה/u }).waitFor({ timeout: 15_000 });
    const navMs = Date.now() - navStart;
    const subjectVisible = await page.getByText("מתמטיקה").isVisible();
    const meCallsDuringNav = meCalls.length;

    evidence.classesNavigation = {
      gradeSelected: "כיתה ג׳",
      physicalClassSelected: "כיתה ג׳ 1",
      navigationMs: navMs,
      subjectCardsVisible: subjectVisible,
      repeatedMeCalls: meCallsDuringNav,
      frozen: navMs > 30_000 || meCallsDuringNav > 5,
    };

    // ── /school/students UI report ──
    await page.goto(`${base}/school/students`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "כיתה ג׳" }).click({ timeout: 15_000 });
    await page.getByRole("button", { name: /כיתה ג׳ 1/u }).click({ timeout: 15_000 });
    await page.getByRole("button", { name: "דוח תלמיד" }).first().click({ timeout: 20_000 });
    const studentMain = page.getByTestId("report-hub-student-main");
    await studentMain.waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("report-hub-summary-ready").waitFor({ timeout: 60_000 });
    const studentBody = await studentMain.innerText();
    const hasNonZeroAnswers = /תשובות[\s\S]*?[1-9]\d*/u.test(studentBody);
    const hasNonZeroAccuracy = /דיוק[\s\S]*?[1-9]\d*%/u.test(studentBody);
    const hasNoData = /אין עדיין נתונים/u.test(studentBody);

    evidence.studentReportUi = {
      path: "/school/students → grade → class → דוח תלמיד",
      hasNonZeroAnswers,
      hasNonZeroAccuracy,
      showsNoDataLabel: hasNoData,
      excerpt: studentBody.slice(0, 400),
    };
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(evidence, null, 2));

  const apiOk =
    evidence.studentReportApi?.status === 200 &&
    Number(evidence.studentReportApi?.summary?.totalAnswers || 0) > 0;
  const classesOk = evidence.classesNavigation && !evidence.classesNavigation.frozen;
  const uiOk =
    evidence.studentReportUi?.hasNonZeroAnswers || evidence.studentReportUi?.hasNonZeroAccuracy;

  console.log("\n--- RESULT ---");
  console.log(apiOk ? "PASS" : "FAIL", "Student report API (no classId)");
  console.log(classesOk ? "PASS" : "FAIL", "/school/classes navigation (no freeze)");
  console.log(uiOk ? "PASS" : "FAIL", "/school/students UI student report");

  process.exit(apiOk && classesOk && uiOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
