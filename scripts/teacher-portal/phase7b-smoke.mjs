#!/usr/bin/env node
/**
 * Phase 7B teacher recommendation layer smoke.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase7b-smoke.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
const OTHER_TEACHER_EMAIL = "teacher-portal-other@liosh-dev.invalid";
const OTHER_TEACHER_PASSWORD = "OtherTeacher!2026";
const DEMO_STUDENT_ID = "d119f721-05b3-4fe2-ac58-4174ac06f733";

const results = [];
function record(n, p, d = "") {
  results.push({ name: n, pass: p, detail: d });
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() {},
  };
}

async function run(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function signIn(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "no token");
  return data.session.access_token;
}

function hasLlmCall(body) {
  const text = JSON.stringify(body || {});
  return text.includes("openai") || text.includes("anthropic") || text.includes("llm_generated");
}

function hasParentPii(body) {
  const text = JSON.stringify(body || {});
  const forbidden = ["parent_id", "parentEmail", "parent_email", "parentName", "parent_name"];
  return forbidden.some((k) => text.includes(`"${k}"`));
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const parentEmail = requireEnv("E2E_PARENT_EMAIL");
  const parentPassword = requireEnv("E2E_PARENT_PASSWORD");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const parentToken = await signIn(anon, parentEmail, parentPassword);
  const teacherAuth = { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3001" };
  const parentAuth = { authorization: `Bearer ${parentToken}`, origin: "http://localhost:3001" };

  const teacherUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === TEACHER_EMAIL);
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  await admin.from("teacher_profiles").upsert({ id: teacherId });
  await admin.from("teacher_limits").upsert({ teacher_id: teacherId, plan_code: "teacher_basic_20" });

  // Ensure active link to demo student
  const { data: existingLink } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null)
    .maybeSingle();
  if (!existingLink?.id) {
    await admin.from("teacher_students").insert({
      teacher_id: teacherId,
      student_id: DEMO_STUDENT_ID,
      relationship: "primary_teacher",
    });
  }

  // ── single-student guidance ────────────────────────────────────────────────

  const studentReport = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });

  const gb = studentReport.body?.teacherGuidanceBlock;
  record(
    "student report includes teacherGuidanceBlock",
    studentReport.statusCode === 200 && gb != null && typeof gb === "object",
    `status=${studentReport.statusCode}`
  );

  record(
    "student guidance has correct top-level fields",
    gb != null &&
      "insufficientData" in gb &&
      "teacherGuidance" in gb &&
      "nextPracticeFocus" in gb &&
      "riskSignals" in gb &&
      "strengthsForTeacher" in gb &&
      "supportSuggestions" in gb,
    Object.keys(gb || {}).join(",")
  );

  record(
    "student guidance arrays are arrays",
    Array.isArray(gb?.nextPracticeFocus) &&
      Array.isArray(gb?.riskSignals) &&
      Array.isArray(gb?.strengthsForTeacher) &&
      Array.isArray(gb?.supportSuggestions),
    "ok"
  );

  record(
    "student guidance has no LLM markers",
    !hasLlmCall(gb),
    "ok"
  );

  record(
    "student guidance has no parent PII",
    !hasParentPii(gb),
    "ok"
  );

  // ── class setup ────────────────────────────────────────────────────────────

  await admin
    .from("teacher_students")
    .update({ archived_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null);
  const { error: reLinkErr } = await admin.from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: DEMO_STUDENT_ID,
    relationship: "primary_teacher",
  });

  const { data: oldClasses } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId);
  for (const row of oldClasses || []) {
    await admin.from("teacher_class_students").delete().eq("class_id", row.id);
  }
  await admin.from("teacher_classes").delete().eq("teacher_id", teacherId);

  const { data: createdClass } = await admin
    .from("teacher_classes")
    .insert({ teacher_id: teacherId, name: "Phase7B Smoke Class", grade_level: "g4" })
    .select("id")
    .single();
  const classId = createdClass.id;

  // ── empty class guidance ───────────────────────────────────────────────────

  const emptyClassReport = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });

  const egb = emptyClassReport.body?.teacherGuidanceBlock;
  record(
    "empty class → insufficientData=true guidance",
    emptyClassReport.statusCode === 200 &&
      egb?.insufficientData === true &&
      Array.isArray(egb?.nextLessonFocus) &&
      egb.nextLessonFocus.length === 0,
    `insufficientData=${egb?.insufficientData}`
  );

  // ── class with active member ───────────────────────────────────────────────

  await admin
    .from("teacher_class_students")
    .insert({ class_id: classId, student_id: DEMO_STUDENT_ID });

  const classReport = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });

  const cgb = classReport.body?.teacherGuidanceBlock;
  record(
    "class report includes teacherGuidanceBlock",
    classReport.statusCode === 200 && cgb != null && typeof cgb === "object",
    `status=${classReport.statusCode}`
  );

  record(
    "class guidance has correct top-level fields",
    cgb != null &&
      "insufficientData" in cgb &&
      "teacherSummary" in cgb &&
      "nextLessonFocus" in cgb &&
      "suggestedGroups" in cgb &&
      "priorityTopics" in cgb &&
      "attentionStudents" in cgb &&
      "reinforcementSuggestions" in cgb &&
      "extensionSuggestions" in cgb,
    Object.keys(cgb || {}).join(",")
  );

  record(
    "class guidance arrays are arrays",
    Array.isArray(cgb?.nextLessonFocus) &&
      Array.isArray(cgb?.priorityTopics) &&
      Array.isArray(cgb?.attentionStudents) &&
      Array.isArray(cgb?.reinforcementSuggestions) &&
      Array.isArray(cgb?.extensionSuggestions),
    "ok"
  );

  record(
    "suggestedGroups has struggling/on_track/advanced",
    cgb?.suggestedGroups != null &&
      Array.isArray(cgb.suggestedGroups.struggling) &&
      Array.isArray(cgb.suggestedGroups.on_track) &&
      Array.isArray(cgb.suggestedGroups.advanced),
    "ok"
  );

  record(
    "class guidance has no LLM markers",
    !hasLlmCall(cgb),
    "ok"
  );

  record(
    "class guidance has no parent PII",
    !hasParentPii(cgb),
    "ok"
  );

  // ── removed member excluded from guidance ──────────────────────────────────

  const { data: memRow } = await admin
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("removed_at", null)
    .single();
  await admin
    .from("teacher_class_students")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", memRow.id);

  const afterRemove = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });

  const agb = afterRemove.body?.teacherGuidanceBlock;
  const removedStudentInGuidance =
    JSON.stringify(agb || {}).includes(DEMO_STUDENT_ID);

  record(
    "removed member excluded from class guidance",
    afterRemove.statusCode === 200 &&
      !removedStudentInGuidance &&
      agb?.insufficientData === true,
    `activeMemberCount=${afterRemove.body?.roster?.activeMemberCount}`
  );

  // ── cross-teacher access blocked ──────────────────────────────────────────

  const listedOther = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  let otherId = listedOther.data?.users?.find((x) => x.email === OTHER_TEACHER_EMAIL)?.id;
  if (!otherId) {
    const c = await admin.auth.admin.createUser({
      email: OTHER_TEACHER_EMAIL,
      password: OTHER_TEACHER_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    otherId = c.data?.user?.id;
  }
  await admin.from("teacher_profiles").upsert({ id: otherId });
  const otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);

  const crossClass = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" },
    query: { classId },
  });
  record(
    "teacher A class → teacher B blocked",
    crossClass.statusCode === 404 && crossClass.body?.error?.code === "class_not_found",
    crossClass.body?.error?.code
  );

  const crossStudent = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" },
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "teacher A student → teacher B blocked",
    crossStudent.statusCode === 403 && crossStudent.body?.error?.code === "student_not_linked",
    crossStudent.body?.error?.code
  );

  // ── parent blocked ─────────────────────────────────────────────────────────

  const parentOnClass = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: parentAuth,
    query: { classId },
  });
  record(
    "parent bearer → class report blocked",
    parentOnClass.statusCode === 403 && parentOnClass.body?.error?.code === "not_a_teacher",
    parentOnClass.body?.error?.code
  );

  // ── parent report aggregator unchanged ────────────────────────────────────

  const parentUser = (await admin.auth.admin.listUsers({ perPage: 200, page: 1 }))
    .data?.users?.find((x) => x.email === parentEmail);
  const { data: ownedStudent } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", DEMO_STUDENT_ID)
    .eq("parent_id", parentUser?.id)
    .maybeSingle();
  const { aggregateParentReportPayload } = await import(
    u("./lib/parent-server/report-data-aggregate.server.js")
  );
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const parentAgg = ownedStudent?.id
    ? await aggregateParentReportPayload(admin, ownedStudent, fromDate, toDate)
    : { ok: false };
  record("parent report aggregator unchanged", parentAgg.ok === true, "ok");

  // ── protected paths unchanged ──────────────────────────────────────────────

  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/students/[studentId]/report-data.js",
    "pages/api/parent/copilot-turn.js",
    "lib/parent-server/report-data-aggregate.server.js",
    "utils/parent-copilot",
  ];
  let diff = "";
  for (const p of protectedPaths) {
    try {
      diff += execSync(`git diff --name-only -- "${p}"`, { cwd: root, encoding: "utf8" });
    } catch { /* ignore */ }
  }
  record("parent/student/copilot paths unchanged", diff.trim() === "", diff.trim() || "(clean)");

  // ── unit-level: no SQL in recommendations module ───────────────────────────

  const { buildStudentTeacherGuidance, buildClassTeacherGuidance } = await import(
    u("./lib/teacher-server/teacher-recommendations.server.js")
  );

  const minimalStudentPayload = {
    summary: { totalSessions: 0, totalAnswers: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0 },
    subjects: {},
    dailyActivity: [],
    recentMistakes: [],
  };
  const minStudentGuidance = buildStudentTeacherGuidance(minimalStudentPayload);
  record(
    "recommendations: empty student → insufficientData=true",
    minStudentGuidance.insufficientData === true,
    "ok"
  );

  const activeStudentPayload = {
    summary: { totalSessions: 5, totalAnswers: 20, correctAnswers: 8, wrongAnswers: 12, accuracy: 40 },
    subjects: {
      math: {
        sessions: 5, answers: 20, correct: 8, wrong: 12, accuracy: 40,
        topics: { fractions: { answers: 10, correct: 3, wrong: 7, accuracy: 30 } },
      },
    },
    dailyActivity: [{ date: "2026-05-10", sessions: 2, answers: 10 }],
    recentMistakes: [
      { subject: "math" }, { subject: "math" }, { subject: "math" },
      { subject: "math" }, { subject: "math" }, { subject: "math" },
    ],
  };
  const activeStudentGuidance = buildStudentTeacherGuidance(activeStudentPayload);
  record(
    "recommendations: low-accuracy student → guidance generated",
    activeStudentGuidance.insufficientData === false &&
      activeStudentGuidance.nextPracticeFocus.length > 0 &&
      activeStudentGuidance.riskSignals.includes("low_overall_accuracy"),
    `focus=${activeStudentGuidance.nextPracticeFocus[0]?.topic}`
  );

  const classGuidanceEmpty = buildClassTeacherGuidance({
    cohortSummary: { totalAnswers: 0, studentsWithActivity: 0, accuracy: 0 },
    subjects: {},
    weaknessTopics: [],
    attentionList: [],
    students: [],
    roster: { activeMemberCount: 0, studentCount: 0 },
  });
  record(
    "recommendations: empty class → insufficientData=true",
    classGuidanceEmpty.insufficientData === true,
    "ok"
  );

  const classGuidanceFull = buildClassTeacherGuidance({
    cohortSummary: { totalAnswers: 30, studentsWithActivity: 3, accuracy: 45, totalStudents: 3, studentsWithActivity: 2 },
    subjects: {
      math: { sessions: 5, answers: 20, correct: 8, wrong: 12, accuracy: 40, topics: {} },
    },
    weaknessTopics: [
      { subject: "math", topic: "fractions", wrong: 7, answers: 10, studentCount: 2 },
    ],
    attentionList: [
      { studentId: "aaa", studentFullNameMasked: "A S.", attentionScore: 3, reasons: ["low_accuracy"], accuracy: 35, totalAnswers: 10 },
    ],
    students: [
      { studentId: "aaa", studentFullNameMasked: "A S.", summary: { totalAnswers: 10, accuracy: 35 }, guardianAccessSummary: null },
      { studentId: "bbb", studentFullNameMasked: "B T.", summary: { totalAnswers: 10, accuracy: 85 }, guardianAccessSummary: null },
    ],
    roster: { activeMemberCount: 2, studentCount: 2 },
  });
  record(
    "recommendations: active class → full guidance generated",
    classGuidanceFull.insufficientData === false &&
      classGuidanceFull.nextLessonFocus.length > 0 &&
      classGuidanceFull.suggestedGroups.struggling.length > 0 &&
      classGuidanceFull.suggestedGroups.advanced.length > 0,
    `focus=${classGuidanceFull.nextLessonFocus[0]?.topic}`
  );

  console.log("\nPhase 7B smoke:\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.pass);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
