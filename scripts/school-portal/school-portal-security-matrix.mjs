#!/usr/bin/env node
/**
 * School Managed Portal — IDOR + subject permission matrix (API handlers).
 *
 *   SCHOOL_SECURITY_TEST_PASSWORD=... node --env-file=.env.local scripts/school-portal/school-portal-security-matrix.mjs
 *
 * Provisions two schools + roles (idempotent), runs tests, prints PASS/FAIL.
 * Password is never stored in repo.
 */
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const PASSWORD_ENV = "SCHOOL_SECURITY_TEST_PASSWORD";
/** Throwaway QA accounts only — never use demo school @leo-k.com identities. */
const EMAILS = {
  managerA: "school-qa-a@leo.com",
  managerB: "school-b@leo.com",
  mathTeacher: "school-math-teacher@leo.com",
  privateTeacher: "school-private@leo.com",
};
const PROTECTED_DEMO_EMAILS = new Set([
  "school@leo-k.com",
  "dan@leo-k.com",
  "vered@leo-k.com",
  "noam@leo-k.com",
  "sara@leo-k.com",
  "michal@leo-k.com",
  "alon@leo-k.com",
  "rachel@leo-k.com",
  "yael@leo-k.com",
  "david@leo-k.com",
  "liron@leo-k.com",
  "tamar@leo-k.com",
  "demofamily@leo-k.com",
]);
const SCHOOL_A_NAME = "בית ספר ניסיון LEO";
const SCHOOL_B_NAME = "בית ספר QA B";

const results = [];

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    stopped: false,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader() {},
  };
}

async function runHandler(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 15; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === email);
    if (match) return match;
    if (!data?.users?.length) break;
  }
  return null;
}

async function ensureAuthUser(admin, email, password, role) {
  const existing = await findUserByEmail(admin, email);
  if (existing?.id) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { role },
    });
    if (error) throw error;
    return data.user?.id || existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) throw error;
  return data.user.id;
}

async function ensureTeacherProfile(admin, teacherId, displayName) {
  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();
  if (!profile) {
    await admin.from("teacher_profiles").insert({
      id: teacherId,
      display_name: displayName,
      preferred_language: "he",
      is_active: true,
    });
  }
  const { data: limits } = await admin
    .from("teacher_limits")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!limits) {
    await admin.from("teacher_limits").insert({ teacher_id: teacherId, plan_code: "teacher_basic_20" });
  }
}

async function signIn(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw error || new Error(`signIn failed: ${email}`);
  return { token: data.session.access_token, userId: data.user.id, role: data.user.app_metadata?.role };
}

async function findOrCreateSchool(admin, name) {
  const { data: existing } = await admin
    .from("school_accounts")
    .select("id, name")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await admin
    .from("school_accounts")
    .insert({ name, is_active: true, city: "QA" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function provisionFixtures(admin, password) {
  for (const email of Object.values(EMAILS)) {
    if (PROTECTED_DEMO_EMAILS.has(String(email).toLowerCase())) {
      throw new Error(
        `Security matrix must not use demo account ${email}. Use throwaway school-qa-a@leo.com fixtures only.`
      );
    }
  }

  const { assignSchoolManager, assignTeacherToSchool } = await import(
    u("lib/admin-server/admin-schools.server.js")
  );
  const { grantSchoolTeacherSubject } = await import(u("lib/school-server/school-subjects.server.js"));

  const schoolAId = await findOrCreateSchool(admin, SCHOOL_A_NAME);
  const schoolBId = await findOrCreateSchool(admin, SCHOOL_B_NAME);

  async function ensureSchoolStaffCode(schoolId, code) {
    const { data } = await admin
      .from("school_accounts")
      .select("school_code")
      .eq("id", schoolId)
      .maybeSingle();
    const existing = data?.school_code ? String(data.school_code).trim().toLowerCase() : "";
    if (/^[a-z]{3,4}$/.test(existing)) return;
    const { error } = await admin.from("school_accounts").update({ school_code: code }).eq("id", schoolId);
    if (error) throw new Error(`ensureSchoolStaffCode ${code}: ${error.message}`);
  }

  await ensureSchoolStaffCode(schoolAId, "qaa");
  await ensureSchoolStaffCode(schoolBId, "qab");

  const managerAId = await ensureAuthUser(admin, EMAILS.managerA, password, "teacher");
  const managerBId = await ensureAuthUser(admin, EMAILS.managerB, password, "teacher");
  const mathTeacherId = await ensureAuthUser(admin, EMAILS.mathTeacher, password, "teacher");
  const privateTeacherId = await ensureAuthUser(admin, EMAILS.privateTeacher, password, "teacher");

  await ensureTeacherProfile(admin, managerAId, "QA מנהל A");
  await ensureTeacherProfile(admin, managerBId, "QA מנהל B");
  await ensureTeacherProfile(admin, mathTeacherId, "QA מורה מתמטיקה");
  await ensureTeacherProfile(admin, privateTeacherId, "QA מורה פרטי");

  await assignSchoolManager(admin, schoolAId, managerAId);
  await assignSchoolManager(admin, schoolBId, managerBId);

  await assignTeacherToSchool(admin, schoolAId, mathTeacherId, { force: true });
  await admin.from("school_teacher_subjects").delete().eq("school_id", schoolAId).eq("teacher_id", mathTeacherId);
  const granted = await grantSchoolTeacherSubject(admin, {
    schoolId: schoolAId,
    teacherId: mathTeacherId,
    subject: "math",
    grantedBy: managerAId,
  });
  if (!granted.ok && granted.code !== "subject_already_granted") {
    throw new Error(`grant math failed: ${granted.code}`);
  }

  const { data: otherMembership } = await admin
    .from("school_teacher_memberships")
    .select("id")
    .eq("teacher_id", privateTeacherId)
    .maybeSingle();
  if (otherMembership) {
    await admin.from("school_teacher_memberships").delete().eq("teacher_id", privateTeacherId);
  }

  async function ensureClass(schoolId, teacherId, name, subjectFocus) {
    const { data: existing } = await admin
      .from("teacher_classes")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("name", name)
      .maybeSingle();
    if (existing?.id) {
      await admin
        .from("teacher_classes")
        .update({ school_id: schoolId, subject_focus: subjectFocus })
        .eq("id", existing.id);
      return existing.id;
    }
    const { data, error } = await admin
      .from("teacher_classes")
      .insert({
        teacher_id: teacherId,
        name,
        grade_level: "g3",
        subject_focus: subjectFocus,
        school_id: schoolId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  const classAId = await ensureClass(schoolAId, managerAId, "QA כיתה A", "math");
  const mathClassId = await ensureClass(schoolAId, mathTeacherId, "QA Math Teacher Class", "math");
  const classBId = await ensureClass(schoolBId, managerBId, "QA כיתה B", "english");

  const { data: sampleStudents } = await admin.from("students").select("id").limit(2);
  if (!sampleStudents?.length) {
    throw new Error("No students in DB — need at least one for enrollment IDOR tests");
  }
  const studentAId = sampleStudents[0].id;
  const studentBId = sampleStudents[1]?.id || sampleStudents[0].id;

  async function ensureEnrollment(schoolId, studentId, enrolledBy) {
    const { data: existing } = await admin
      .from("school_student_enrollments")
      .select("id")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .is("unenrolled_at", null)
      .maybeSingle();
    if (existing) return;
    await admin.from("school_student_enrollments").insert({
      school_id: schoolId,
      student_id: studentId,
      enrolled_by: enrolledBy,
    });
  }

  await ensureEnrollment(schoolAId, studentAId, managerAId);
  if (studentBId !== studentAId) {
    await ensureEnrollment(schoolBId, studentBId, managerBId);
  }

  const minimalQuestionSet = [{ id: "q1", prompt: "1+1", correct_answer: "2" }];

  async function ensureClosedActivity(table, row) {
    const { data: existing } = await admin
      .from(table)
      .select("id, subject")
      .eq("teacher_id", row.teacher_id)
      .eq("title", row.title)
      .maybeSingle();
    if (existing?.id) {
      await admin
        .from(table)
        .update({ status: "closed", closed_at: new Date().toISOString(), school_id: row.school_id })
        .eq("id", existing.id);
      return { id: existing.id, subject: existing.subject };
    }
    const { data, error } = await admin
      .from(table)
      .insert({ ...row, status: "closed", closed_at: new Date().toISOString(), question_set: minimalQuestionSet })
      .select("id, subject")
      .single();
    if (error) throw error;
    return data;
  }

  const classroomEnglish = await ensureClosedActivity("classroom_activities", {
    teacher_id: mathTeacherId,
    class_id: mathClassId,
    title: "QA Security English Class Activity",
    subject: "english",
    topic: "test",
    mode: "quiz",
    question_selection: "same_exact",
    question_count: 1,
    school_id: schoolAId,
  });

  const classroomMath = await ensureClosedActivity("classroom_activities", {
    teacher_id: mathTeacherId,
    class_id: mathClassId,
    title: "QA Security Math Class Activity",
    subject: "math",
    topic: "test",
    mode: "quiz",
    question_selection: "same_exact",
    question_count: 1,
    school_id: schoolAId,
  });

  async function ensureTeacherStudentLink(teacherId, studentId) {
    const { data: row } = await admin
      .from("teacher_students")
      .select("id, archived_at")
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (row?.id) {
      if (row.archived_at) {
        await admin.from("teacher_students").update({ archived_at: null }).eq("id", row.id);
      }
      return;
    }
    const { error } = await admin.from("teacher_students").insert({
      teacher_id: teacherId,
      student_id: studentId,
      relationship: "primary_teacher",
    });
    if (error) throw error;
  }

  for (const tid of [managerAId, mathTeacherId]) {
    await ensureTeacherStudentLink(tid, studentAId);
  }

  async function ensureClassMember(classId, studentId) {
    const { data: existing } = await admin
      .from("teacher_class_students")
      .select("id")
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .is("removed_at", null)
      .maybeSingle();
    if (!existing) {
      await admin.from("teacher_class_students").insert({ class_id: classId, student_id: studentId });
    }
  }
  await ensureClassMember(mathClassId, studentAId);

  const individualEnglish = await ensureClosedActivity("student_activities", {
    teacher_id: mathTeacherId,
    student_id: studentAId,
    title: "QA Security English Individual",
    subject: "english",
    topic: "test",
    mode: "quiz",
    question_selection: "same_exact",
    question_count: 1,
    school_id: schoolAId,
  });

  return {
    schoolAId,
    schoolBId,
    managerAId,
    managerBId,
    mathTeacherId,
    privateTeacherId,
    classAId,
    mathClassId,
    classBId,
    studentAId,
    studentBId,
    classroomEnglishId: classroomEnglish.id,
    classroomMathId: classroomMath.id,
    individualEnglishId: individualEnglish.id,
  };
}

const ACTIVITY_CREATE_BODY = {
  topic: "test",
  mode: "quiz",
  questionSelection: "same_exact",
  questionCount: 1,
  timeLimitSeconds: 300,
  gradeLevel: "g3",
  questionSet: [{ id: "q1", prompt: "1+1", correct_answer: "2" }],
};

async function runMatrix(admin, anon, password, fx) {
  const managerA = await signIn(anon, EMAILS.managerA, password);
  const managerB = await signIn(anon, EMAILS.managerB, password);
  const mathT = await signIn(anon, EMAILS.mathTeacher, password);
  const privateT = await signIn(anon, EMAILS.privateTeacher, password);

  record("manager A role=teacher", String(managerA.role).toLowerCase() === "teacher", managerA.role);
  record("manager B role=teacher", String(managerB.role).toLowerCase() === "teacher", managerB.role);
  record("math teacher role=teacher", String(mathT.role).toLowerCase() === "teacher", mathT.role);
  record("private teacher role=teacher", String(privateT.role).toLowerCase() === "teacher", privateT.role);

  const adminListA = await runHandler("pages/api/admin/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerA.token}` },
  });
  record("manager A not admin (admin/teachers)", adminListA.statusCode === 403, `status=${adminListA.statusCode}`);

  const adminListMath = await runHandler("pages/api/admin/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
  });
  record("math teacher not admin", adminListMath.statusCode === 403, `status=${adminListMath.statusCode}`);

  const schoolMeA = await runHandler("pages/api/school/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerA.token}` },
  });
  record("manager A school/me", schoolMeA.statusCode === 200, `status=${schoolMeA.statusCode}`);

  const schoolMeB = await runHandler("pages/api/school/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record("private teacher school/me forbidden", schoolMeB.statusCode === 403, `status=${schoolMeB.statusCode}`);

  const schoolMeMath = await runHandler("pages/api/school/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
  });
  record("school teacher (math) school/me forbidden", schoolMeMath.statusCode === 403, `status=${schoolMeMath.statusCode}`);

  const crossClass = await runHandler("pages/api/school/classes/[classId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerA.token}` },
    query: { classId: fx.classBId, windowDays: "30" },
  });
  record(
    "manager A cannot access school B class report",
    crossClass.statusCode === 403 || crossClass.statusCode === 404,
    `status=${crossClass.statusCode}`
  );

  const crossStudent = await runHandler("pages/api/school/students/[studentId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerA.token}` },
    query: { studentId: fx.studentBId, windowDays: "30" },
  });
  record(
    "manager A cannot access school B student report",
    crossStudent.statusCode === 403 || crossStudent.statusCode === 404,
    `status=${crossStudent.statusCode}`
  );

  const crossTeacher = await runHandler("pages/api/school/teachers/[teacherId].js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerA.token}` },
    query: { teacherId: fx.managerBId },
  });
  record(
    "manager A cannot view school B teacher detail",
    crossTeacher.statusCode === 403,
    `status=${crossTeacher.statusCode}`
  );

  const bCrossClass = await runHandler("pages/api/school/classes/[classId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${managerB.token}` },
    query: { classId: fx.classAId, windowDays: "30" },
  });
  record(
    "manager B cannot access school A class report",
    bCrossClass.statusCode === 403 || bCrossClass.statusCode === 404,
    `status=${bCrossClass.statusCode}`
  );

  const mePrivate = await runHandler("pages/api/teacher/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record(
    "private teacher me has no school manager redirect",
    mePrivate.statusCode === 200 && !mePrivate.body?.data?.schoolMembership?.isSchoolManager,
    JSON.stringify(mePrivate.body?.data?.schoolMembership)
  );

  const dashPrivate = await runHandler("pages/api/teacher/dashboard.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record("private teacher dashboard", dashPrivate.statusCode === 200, `status=${dashPrivate.statusCode}`);

  const privateStudents = await runHandler("pages/api/teacher/students.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record(
    "private teacher can list linked students",
    privateStudents.statusCode === 200,
    `status=${privateStudents.statusCode}`
  );

  const privateSchoolDash = await runHandler("pages/api/school/dashboard.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record(
    "private teacher school/dashboard forbidden",
    privateSchoolDash.statusCode === 403,
    `status=${privateSchoolDash.statusCode}`
  );

  const privateSchoolTeachers = await runHandler("pages/api/school/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${privateT.token}` },
  });
  record(
    "private teacher school/teachers forbidden",
    privateSchoolTeachers.statusCode === 403,
    `status=${privateSchoolTeachers.statusCode}`
  );

  const mathSchoolDash = await runHandler("pages/api/school/dashboard.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
  });
  record(
    "school teacher school/dashboard forbidden",
    mathSchoolDash.statusCode === 403,
    `status=${mathSchoolDash.statusCode}`
  );

  const createEnglishClass = await runHandler("pages/api/teacher/activities/index.js", {
    method: "POST",
    headers: {
      authorization: `Bearer ${mathT.token}`,
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: {
      ...ACTIVITY_CREATE_BODY,
      classId: fx.mathClassId,
      title: "blocked english",
      subject: "english",
      questionSet: [{ id: "q1", prompt: "2+2", correct_answer: "4" }],
    },
  });
  record(
    "math-only cannot create english classroom activity",
    createEnglishClass.statusCode === 403 &&
      (createEnglishClass.body?.error?.code === "subject_not_permitted" ||
        createEnglishClass.body?.error?.code === "subject_mismatch"),
    `status=${createEnglishClass.statusCode} code=${createEnglishClass.body?.error?.code}`
  );

  const createMathClass = await runHandler("pages/api/teacher/activities/index.js", {
    method: "POST",
    headers: {
      authorization: `Bearer ${mathT.token}`,
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: {
      ...ACTIVITY_CREATE_BODY,
      classId: fx.mathClassId,
      title: `QA math create ${randomUUID().slice(0, 8)}`,
      subject: "math",
    },
  });
  record(
    "math-only can create math classroom activity",
    createMathClass.statusCode === 201,
    `status=${createMathClass.statusCode}`
  );

  const createIndivEnglish = await runHandler("pages/api/teacher/student-activities/index.js", {
    method: "POST",
    headers: {
      authorization: `Bearer ${mathT.token}`,
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: {
      ...ACTIVITY_CREATE_BODY,
      studentId: fx.studentAId,
      title: "blocked indiv english",
      subject: "english",
      questionSet: [{ id: "q1", prompt: "2+2", correct_answer: "4" }],
    },
  });
  record(
    "math-only cannot create english individual activity",
    createIndivEnglish.statusCode === 403 &&
      createIndivEnglish.body?.error?.code === "subject_not_permitted",
    `status=${createIndivEnglish.statusCode} code=${createIndivEnglish.body?.error?.code}`
  );

  const reportEnglishClass = await runHandler("pages/api/teacher/activities/[activityId]/report.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
    query: { activityId: fx.classroomEnglishId },
  });
  record(
    "math-only cannot view english classroom activity report",
    reportEnglishClass.statusCode === 403,
    `status=${reportEnglishClass.statusCode}`
  );

  const reportMathClass = await runHandler("pages/api/teacher/activities/[activityId]/report.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
    query: { activityId: fx.classroomMathId },
  });
  record(
    "math-only can view math classroom activity report",
    reportMathClass.statusCode === 200,
    `status=${reportMathClass.statusCode}`
  );

  const reportIndivEnglish = await runHandler(
    "pages/api/teacher/student-activities/[activityId]/report.js",
    {
      method: "GET",
      headers: { authorization: `Bearer ${mathT.token}` },
      query: { activityId: fx.individualEnglishId },
    }
  );
  record(
    "math-only cannot view english individual activity report",
    reportIndivEnglish.statusCode === 403,
    `status=${reportIndivEnglish.statusCode}`
  );

  const studentReport = await runHandler("pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${mathT.token}` },
    query: { studentId: fx.studentAId, windowDays: "30" },
  });
  let reportFilterOk = false;
  let reportFilterDetail = `status=${studentReport.statusCode}`;
  if (studentReport.statusCode === 200) {
    const subjects = studentReport.body?.subjects || {};
    const mistakes = studentReport.body?.recentMistakes || [];
    const probeBySubject = studentReport.body?.probeEvidence?.bySubject || {};
    const keys = Object.keys(subjects);
    const mistakeSubjects = [...new Set(mistakes.map((m) => m?.subject).filter(Boolean))];
    const probeKeys = Object.keys(probeBySubject);
    reportFilterOk =
      !keys.includes("english") &&
      !keys.includes("hebrew") &&
      !keys.includes("science") &&
      !mistakeSubjects.some((s) => s !== "math") &&
      !probeKeys.some((s) => s !== "math");
    reportFilterDetail = `subjects=${keys.join(",")} mistakes=${mistakeSubjects.join(",")} probe=${probeKeys.join(",")}`;
  } else if (studentReport.statusCode === 403) {
    reportFilterDetail = `code=${studentReport.body?.error?.code || "forbidden"}`;
  }
  record("math-only student report strips non-math subjects", reportFilterOk, reportFilterDetail);

  const { TEACHER_REPORT_SUBJECT_FILTER_KEYS } = await import(
    u("lib/school-server/school-subjects.server.js")
  );
  record(
    "report filter documents subject keys only",
    TEACHER_REPORT_SUBJECT_FILTER_KEYS.includes("subjects"),
    TEACHER_REPORT_SUBJECT_FILTER_KEYS.join(",")
  );

  return {
    tokens: { managerA, managerB, mathT, privateT },
    failures: results.filter((r) => !r.pass).length,
  };
}

async function main() {
  const password = requireEnv(PASSWORD_ENV);
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  console.log("=== Provisioning security fixtures ===");
  const fx = await provisionFixtures(admin, password);
  console.log(JSON.stringify(fx, null, 2));

  console.log("\n=== Security matrix ===");
  const summary = await runMatrix(admin, anon, password, fx);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.error("Failures:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("school-portal-security-matrix: FAIL", e.message || e);
  process.exit(1);
});
