#!/usr/bin/env node
/**
 * Classroom Activities API simulation (isolated from daily classroom sim).
 * Requires migration 024 applied and a running Next dev server (HTTP, like Playwright).
 *
 *   npx next dev -H 127.0.0.1 -p 3001
 *   npm run teacher:activity-sim
 *
 * Env (see .env.e2e.local):
 *   ACTIVITY_SIM_BASE_URL — default http://127.0.0.1:3001
 *   TEACHER_PORTAL_VERIFY_EMAIL / TEACHER_PORTAL_VERIFY_PASSWORD
 *   E2E_STUDENT_USERNAME or ACTIVITY_SIM_STUDENT_USER
 *   E2E_STUDENT_PIN or ACTIVITY_SIM_STUDENT_PIN
 */
import { createClient } from "@supabase/supabase-js";
import { bootstrapTeacherDbWriteGuard } from "./lib/teacher-db-write-guard.mjs";

const BASE =
  process.env.ACTIVITY_SIM_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:3001";

const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "747975";
/** Use ACTIVITY_SIM_* only so .env.local E2E_STUDENT_* (help/QA) does not override class member. */
const STUDENT_USER = process.env.ACTIVITY_SIM_STUDENT_USER || "leo-s01";
const STUDENT_PIN = process.env.ACTIVITY_SIM_STUDENT_PIN || "1234";

const SERVER_READY_PATH = process.env.ACTIVITY_SIM_READY_PATH || "/parent/login";
const SERVER_WAIT_MS = Number(process.env.ACTIVITY_SIM_SERVER_WAIT_MS || 120_000);

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function waitForServer() {
  const deadline = Date.now() + SERVER_WAIT_MS;
  const url = `${BASE.replace(/\/$/, "")}${SERVER_READY_PATH}`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/**
 * @param {string} path
 * @param {{ method?: string, headers?: Record<string, string>, body?: unknown }} [opts]
 */
async function apiFetch(path, opts = {}) {
  const method = opts.method || "GET";
  const headers = { Accept: "application/json", ...opts.headers };
  let body;
  if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE.replace(/\/$/, "")}${path}`, { method, headers, body });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text.slice(0, 300) };
  }
  return { status: res.status, headers: res.headers, body: json, text };
}

async function signInTeacher() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
  });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || "teacher sign-in failed");
  }
  return data.session.access_token;
}

function parseStudentCookie(headers) {
  const raw = headers.get("set-cookie") || "";
  const match = raw.match(/liosh_student_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sampleQuestionSet(n) {
  const qs = [];
  for (let i = 0; i < n; i += 1) {
    const a = 2 + i;
    const b = 3;
    qs.push({
      question: `${a} + ${b} = __`,
      correctAnswer: String(a + b),
      subject: "math",
      topic: "addition",
    });
  }
  return qs;
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapTeacherDbWriteGuard(
    "teacher-portal/teacher-activity-sim",
    "TEACHER_ACTIVITY_SIM",
    argv
  );
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: simulation writes skipped (pass --write)");
    guard.printEndSummary();
    return;
  }
  const ready = await waitForServer();
  if (!ready) {
    console.error(
      `Dev server not reachable at ${BASE}${SERVER_READY_PATH} within ${SERVER_WAIT_MS}ms.\n` +
        "Start: npx next dev -H 127.0.0.1 -p 3001"
    );
    process.exit(2);
  }
  record("dev_server_ready", true, BASE);

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: schemaProbe, error: schemaErr } = await admin
    .from("classroom_activities")
    .select("id")
    .limit(1);

  if (schemaErr) {
    console.error("Migration 024 not applied:", schemaErr.message);
    process.exit(2);
  }
  void schemaProbe;
  record("migration_024_schema", true, "classroom_activities");

  const teacherToken = await signInTeacher();
  const teacherAuth = {
    Authorization: `Bearer ${teacherToken}`,
    Origin: BASE,
  };

  const classesRes = await apiFetch("/api/teacher/classes", { headers: teacherAuth });
  const classes = classesRes.body?.data?.classes || [];
  const cls =
    classes.find((c) => (c.memberCount ?? c.activeMemberCount ?? 0) >= 1) || classes[0];
  if (!cls?.classId) {
    record("pick_class", false, "no class with members");
    printSummary();
    process.exit(1);
  }
  record("pick_class", true, cls.classId);

  const questionSet = sampleQuestionSet(5);
  const createRes = await apiFetch("/api/teacher/activities", {
    method: "POST",
    headers: teacherAuth,
    body: {
      classId: cls.classId,
      title: `Sim Activity ${new Date().toISOString().slice(0, 16)}`,
      subject: "math",
      topic: "addition",
      mode: "guided_practice",
      questionSelection: "same_exact",
      difficultyLevel: "medium",
      questionCount: 5,
      questionSet,
    },
  });
  const activityId = createRes.body?.data?.activityId;
  record("create_activity", createRes.status === 201 && !!activityId, String(createRes.status));

  if (!activityId) {
    printSummary();
    process.exit(1);
  }

  const activateRes = await apiFetch(`/api/teacher/activities/${activityId}/status`, {
    method: "PATCH",
    headers: teacherAuth,
    body: { action: "activate" },
  });
  record("activate", activateRes.status === 200, activateRes.body?.data?.status);

  const loginRes = await apiFetch("/api/student/login", {
    method: "POST",
    headers: { Origin: BASE },
    body: { username: STUDENT_USER, pin: STUDENT_PIN },
  });
  const studentCookie = parseStudentCookie(loginRes.headers);
  record(
    "student_login",
    loginRes.status === 200 && !!studentCookie,
    `${loginRes.status} user=${STUDENT_USER}`
  );

  if (!studentCookie) {
    printSummary();
    process.exit(1);
  }

  const studentHeaders = {
    Cookie: `liosh_student_session=${studentCookie}`,
    Origin: BASE,
  };

  const startRes = await apiFetch(`/api/student/activities/${activityId}/start`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  const startText = startRes.text || "";
  record(
    "start_strips_answers",
    startRes.status === 200 &&
      !startText.includes("correctAnswer") &&
      !startText.includes("correct_answer"),
    String(startRes.status)
  );
  record(
    "start_in_progress",
    startRes.body?.studentStatus === "in_progress",
    startRes.body?.studentStatus || ""
  );

  for (let i = 0; i < 5; i += 1) {
    const ansRes = await apiFetch(`/api/student/activities/${activityId}/answer`, {
      method: "POST",
      headers: studentHeaders,
      body: {
        questionIndex: i,
        selectedAnswer: String(questionSet[i].correctAnswer),
        timeSpentMs: 1000,
      },
    });
    if (i === 0) {
      record("answer_correct", ansRes.body?.isCorrect === true, String(ansRes.body?.isCorrect));
    }
  }

  const tamperRes = await apiFetch(`/api/student/activities/${activityId}/answer`, {
    method: "POST",
    headers: studentHeaders,
    body: {
      questionIndex: 0,
      selectedAnswer: "wrong",
      is_correct: true,
      correct_answer: "wrong",
    },
  });
  record(
    "tamper_ignored",
    tamperRes.body?.isCorrect === false,
    `isCorrect=${tamperRes.body?.isCorrect}`
  );

  const submitRes = await apiFetch(`/api/student/activities/${activityId}/submit`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  record("submit", submitRes.status === 200 && submitRes.body?.ok === true, String(submitRes.status));

  const restartRes = await apiFetch(`/api/student/activities/${activityId}/start`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  record(
    "submitted_not_downgraded",
    restartRes.status === 200 &&
      restartRes.body?.alreadyCompleted === true &&
      restartRes.body?.studentStatus === "submitted",
    restartRes.body?.studentStatus || ""
  );

  const monitorRes = await apiFetch(`/api/teacher/activities/${activityId}/monitor`, {
    headers: teacherAuth,
  });
  record(
    "monitor",
    monitorRes.status === 200 && Array.isArray(monitorRes.body?.data?.students),
    `students=${monitorRes.body?.data?.students?.length}`
  );

  await apiFetch(`/api/teacher/activities/${activityId}/status`, {
    method: "PATCH",
    headers: teacherAuth,
    body: { action: "close" },
  });

  const reportRes = await apiFetch(`/api/teacher/activities/${activityId}/report`, {
    headers: teacherAuth,
  });
  record(
    "report",
    reportRes.status === 200 && reportRes.body?.data?.perQuestion?.length === 5,
    `pq=${reportRes.body?.data?.perQuestion?.length}`
  );

  const variantsRes = await apiFetch("/api/teacher/activities", {
    method: "POST",
    headers: teacherAuth,
    body: {
      classId: cls.classId,
      title: "Variants blocked",
      subject: "math",
      topic: "x",
      mode: "guided_practice",
      questionSelection: "controlled_variants",
      questionCount: 3,
      questionSet: sampleQuestionSet(3),
    },
  });
  record("controlled_variants_501", variantsRes.status === 501, String(variantsRes.status));

  printSummary();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  console.log("\n--- teacher-activity-sim ---");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
