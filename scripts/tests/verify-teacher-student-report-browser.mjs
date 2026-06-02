#!/usr/bin/env node
/**
 * Focused browser verification: school admin vs teacher student report data parity.
 * Run: node --env-file=.env.local scripts/tests/verify-teacher-student-report-browser.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createServiceRole, findAuthUserByEmail, requireEnv } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
  "";

async function getAccessTokenViaPassword(page, email) {
  if (!pw) return null;
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await page.request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password: pw },
  });
  const json = await res.json();
  return json.access_token || null;
}

async function getAccessTokenViaAdmin(email) {
  const admin = createServiceRole();
  const user = await findAuthUserByEmail(admin, email);
  if (!user?.id) return null;
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/auth/v1/admin/users/${user.id}/tokens`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expires_in: 3600 }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}

async function getAccessToken(page, email) {
  return (await getAccessTokenViaPassword(page, email)) || (await getAccessTokenViaAdmin(email));
}

/** @type {Array<{ step: string, pass: boolean, detail: string }>} */
const results = [];

function record(step, pass, detail = "") {
  results.push({ step, pass, detail });
  console.log(pass ? "PASS" : "FAIL", step, detail ? `— ${detail}` : "");
}

async function teacherLogin(page, email) {
  const token = await getAccessToken(page, email);
  assert.ok(token, `auth token for ${email}`);
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  await page.goto(`${base}/teacher/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ url, anonKey, token }) => {
      const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "",
          user: null,
        })
      );
    },
    { url, anonKey, token }
  );
  await page.goto(`${base}/teacher/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/(teacher\/dashboard|school\/dashboard)/u, { timeout: 60_000 });
}

function pickSummary(body) {
  const s = body?.summary || {};
  const subjects = body?.subjects || {};
  const subjectKeys = Object.keys(subjects).filter((k) => Number(subjects[k]?.answers || 0) > 0);
  const guidance = body?.teacherGuidanceBlock || {};
  return {
    totalSessions: Number(s.totalSessions || 0),
    totalAnswers: Number(s.totalAnswers || 0),
    accuracy: s.accuracy ?? null,
    subjectKeys,
    insufficientData: guidance.insufficientData === true,
    hasFocus: Array.isArray(guidance.nextPracticeFocus) && guidance.nextPracticeFocus.length > 0,
  };
}

async function main() {
  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(dan?.id, "Dan Cohen auth user");

  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus, grade_level")
    .eq("teacher_id", dan.id)
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(cls?.id, `geometry class ${targetName}`);

  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id, students(full_name)")
    .eq("class_id", cls.id)
    .is("removed_at", null)
    .limit(30);
  assert.ok(roster?.length, "roster students");

  let activeStudent = null;
  let emptyStudent = null;
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);

  for (const row of roster) {
    const studentId = row.student_id;
    const { data: acts } = await admin
      .from("classroom_activities")
      .select("id")
      .eq("class_id", cls.id)
      .neq("status", "archived");
    const actIds = (acts || []).map((a) => a.id);
    let answers = 0;
    if (actIds.length) {
      const { data: st } = await admin
        .from("classroom_activity_student_status")
        .select("answers_count")
        .in("activity_id", actIds)
        .eq("student_id", studentId);
      answers = (st || []).reduce((s, r) => s + Number(r.answers_count || 0), 0);
    }
    if (!activeStudent && answers > 0) {
      activeStudent = {
        studentId,
        studentName: row.students?.full_name || "",
        classroomAnswers: answers,
      };
    }
    if (!emptyStudent && answers === 0) {
      emptyStudent = { studentId, studentName: row.students?.full_name || "" };
    }
    if (activeStudent && emptyStudent) break;
  }
  assert.ok(activeStudent?.studentId, "student with classroom activity");

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  try {
    const schoolToken = await getAccessToken(page, "school@leo-k.com");
    const teacherToken = await getAccessToken(page, "dan@leo-k.com");
    assert.ok(schoolToken, "school manager token");
    assert.ok(teacherToken, "teacher token");

    const q = `studentId=${activeStudent.studentId}&windowDays=30&gradeLevel=${encodeURIComponent(cls.grade_level || "g1")}&physicalClassName=${encodeURIComponent(cls.name)}`;
    const schoolRes = await page.request.get(
      `${base}/api/school/students/${activeStudent.studentId}/report-data?${q}`,
      { headers: { Authorization: `Bearer ${schoolToken}` } }
    );
    const schoolBody = await schoolRes.json();
    const schoolSummary = pickSummary(schoolBody);
    record(
      "1. School admin API — student has real activity data",
      schoolRes.status() === 200 && schoolSummary.totalAnswers > 0,
      `answers=${schoolSummary.totalAnswers}, sessions=${schoolSummary.totalSessions}, subjects=${schoolSummary.subjectKeys.join(",") || "none"}`
    );

    const teacherApiRes = await page.request.get(
      `${base}/api/teacher/students/${activeStudent.studentId}/report-data?studentId=${activeStudent.studentId}&windowDays=30`,
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );
    const teacherBody = await teacherApiRes.json();
    const teacherSummary = pickSummary(teacherBody);
    record(
      "2. Teacher API — non-zero data for same student",
      teacherApiRes.status() === 200 && teacherSummary.totalAnswers > 0,
      `answers=${teacherSummary.totalAnswers}, sessions=${teacherSummary.totalSessions}`
    );

    record(
      "3. Teacher vs school admin summary parity",
      teacherSummary.totalAnswers === schoolSummary.totalAnswers &&
        teacherSummary.totalSessions === schoolSummary.totalSessions,
      `school=${schoolSummary.totalAnswers}/${schoolSummary.totalSessions}, teacher=${teacherSummary.totalAnswers}/${teacherSummary.totalSessions}`
    );

    await teacherLogin(page, "dan@leo-k.com");
    await page.goto(`${base}/teacher/student/${activeStudent.studentId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByTestId("teacher-student-report-root").waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForFunction(
      () => {
        const root = document.querySelector('[data-testid="teacher-student-report-root"]');
        return root?.getAttribute("data-state") === "ready";
      },
      { timeout: 60_000 }
    );

    const pageText = await page.getByTestId("teacher-student-report-root").innerText();
    const sessionsMatch = pageText.match(/מפגשי תרגול[\s\S]*?(\d+)/);
    const answersMatch = pageText.match(/תשובות[\s\S]*?(\d+)/);
    const pageSessions = sessionsMatch ? Number(sessionsMatch[1]) : 0;
    const pageAnswers = answersMatch ? Number(answersMatch[1]) : 0;

    record(
      "4. Teacher browser page — summary shows non-zero data",
      pageSessions > 0 && pageAnswers > 0,
      `page sessions=${pageSessions}, answers=${pageAnswers}`
    );

    const hasSubjectSection =
      !pageText.includes("אין מספיק נתונים לפי מקצוע") ||
      pageText.includes("גאומטריה") ||
      pageText.includes("מתמטיקה");
    record(
      "5. Teacher browser page — subject performance visible",
      hasSubjectSection && !pageText.includes("אין מספיק נתונים לפי מקצוע"),
      hasSubjectSection ? "subject cards present" : "no subject cards"
    );

    const recommendationsOk =
      !teacherSummary.insufficientData ||
      pageText.includes("על מה להתמקד") ||
      pageText.includes("אותות אזהרה");
    record(
      "6. Teacher browser page — recommendations/guidance section renders",
      recommendationsOk && !pageText.includes("אין מספיק נתונים לניתוח"),
      teacherSummary.insufficientData ? "insufficient flag set" : "guidance populated"
    );

    const hebrewMarkers = ["דוח תלמיד", "סיכום", "מפגשי תרגול", "ביצועים לפי מקצוע", "המלצות לי כמורה"];
    record(
      "7. Hebrew UI text unchanged",
      hebrewMarkers.every((m) => pageText.includes(m)),
      hebrewMarkers.filter((m) => !pageText.includes(m)).join(", ") || "all markers present"
    );

    if (emptyStudent?.studentId) {
      const emptyRes = await page.request.get(
        `${base}/api/teacher/students/${emptyStudent.studentId}/report-data?studentId=${emptyStudent.studentId}&windowDays=30`,
        { headers: { Authorization: `Bearer ${teacherToken}` } }
      );
      const emptyBody = await emptyRes.json();
      const emptySummary = pickSummary(emptyBody);
      await page.goto(`${base}/teacher/student/${emptyStudent.studentId}`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByTestId("teacher-student-report-root").waitFor({ state: "visible", timeout: 60_000 });
      await page.waitForFunction(
        () => document.querySelector('[data-testid="teacher-student-report-root"]')?.getAttribute("data-state") === "ready",
        { timeout: 60_000 }
      );
      const emptyText = await page.getByTestId("teacher-student-report-root").innerText();
      record(
        "8. No-activity student — empty state still normal",
        emptySummary.totalAnswers === 0 &&
          emptySummary.totalSessions === 0 &&
          (emptyText.includes("אין מספיק נתונים") || emptyText.includes("0")),
        `student=${emptyStudent.studentName || emptyStudent.studentId}, answers=${emptySummary.totalAnswers}`
      );
    } else {
      record("8. No-activity student — empty state still normal", true, "skipped (no zero-activity roster student in sample class)");
    }
  } finally {
    await browser.close();
  }

  const allPass = results.every((r) => r.pass);
  console.log("\n" + JSON.stringify({ allPass, studentWithData: activeStudent, results }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
