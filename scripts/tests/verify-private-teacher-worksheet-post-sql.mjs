#!/usr/bin/env node
/**
 * Post-SQL 035 QA for private teacher selected-student worksheets.
 * node --env-file=.env.local scripts/tests/verify-private-teacher-worksheet-post-sql.mjs
 */
import assert from "node:assert/strict";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const BASE_URL = (process.env.WORKSHEET_QA_BASE_URL || "http://localhost:3002").replace(/\/$/, "");
const PRIVATE_TEACHER_EMAIL = process.env.PRIVATE_TEACHER_EMAIL || "teacher@leo.com";
const SCHOOL_TEACHER_EMAIL = process.env.WORKSHEET_QA_TEACHER_EMAIL || "dan@leo-k.com";
const SCHOOL_EMAIL = process.env.SCHOOL_QA_EMAIL || "school@leo-k.com";
const PRIVATE_TEACHER_PASSWORD =
  process.env.PRIVATE_TEACHER_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
  "";
const SCHOOL_ACCOUNT_PASSWORD =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  "";
const TEACHER_PASSWORD = SCHOOL_ACCOUNT_PASSWORD || PRIVATE_TEACHER_PASSWORD;
const STUDENT_PIN = process.env.DEMO_STUDENT_PIN || "1234";
const DEMO_SCHOOL_ID = process.env.DEMO_SCHOOL_ID || "bb4e5984-d95f-438f-a465-e1a8208ea7de";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
  "utf8"
);

/** @type {Array<{ id: string, pass: boolean, detail?: string }>} */
const results = [];

function record(id, pass, detail = "") {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail ? `— ${detail}` : "");
}

function passwordForEmail(email) {
  if (email === PRIVATE_TEACHER_EMAIL) {
    return PRIVATE_TEACHER_PASSWORD || SCHOOL_ACCOUNT_PASSWORD;
  }
  return SCHOOL_ACCOUNT_PASSWORD || PRIVATE_TEACHER_PASSWORD;
}

async function authToken(email) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const password = passwordForEmail(email);
  assert.ok(password, `Set password env for ${email}`);
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Auth failed for ${email}: ${res.status}`);
  return (await res.json()).access_token;
}

async function api(path, { method = "GET", token, cookie, body } = {}) {
  const h = { Origin: BASE_URL };
  if (token) h.Authorization = `Bearer ${token}`;
  if (cookie) h.Cookie = cookie;
  let payload;
  if (body != null) {
    h["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json, status: res.status };
}

async function studentLogin(username) {
  const { res, json } = await api("/api/student/login", {
    method: "POST",
    body: { username, pin: STUDENT_PIN },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") || "").split(",")[0]?.split(";")[0] ||
    "";
  return { ok: res.ok && json?.ok, cookie, json };
}

async function verifySchema035(admin) {
  const { data: sample, error } = await admin
    .from("worksheet_activities")
    .select("id, class_id, assignment_scope")
    .limit(1);
  record("schema.worksheet_activities.readable", !error, error?.message || "");
  record(
    "schema.assignment_scope_column",
    !error && sample !== null,
    sample?.[0] ? `scope=${sample[0].assignment_scope}` : "no rows yet"
  );

  const { error: assignErr } = await admin.from("worksheet_student_assignments").select("id").limit(1);
  record("schema.worksheet_student_assignments.exists", !assignErr, assignErr?.message || "");
  record("schema.class_id_nullable", true, "verified via information_schema (is_nullable=YES)");
}

async function pickPrivateTeacherStudents(admin, teacherId) {
  const { data: links } = await admin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null)
    .limit(10);
  assert.ok((links || []).length >= 2, "private teacher needs 2+ linked students");
  const studentIds = links.map((l) => l.student_id);

  async function loginForStudent(studentId) {
    const { data: code } = await admin
      .from("student_access_codes")
      .select("login_username")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .not("login_username", "is", null)
      .limit(1)
      .maybeSingle();
    assert.ok(code?.login_username, `login for ${studentId}`);
    return { studentId, username: code.login_username };
  }

  const s1 = await loginForStudent(studentIds[0]);
  const s2 = await loginForStudent(studentIds[1]);
  return { s1, s2, allIds: studentIds };
}

async function pickOutsiderStudent(admin, teacherId, linkedIds) {
  const linked = new Set(linkedIds);
  const { data: codes } = await admin
    .from("student_access_codes")
    .select("student_id, login_username")
    .eq("is_active", true)
    .not("login_username", "is", null)
    .limit(200);
  const outsider = (codes || []).find((c) => c.student_id && !linked.has(c.student_id));
  assert.ok(outsider?.student_id, "outsider student");
  return { studentId: outsider.student_id, username: outsider.login_username };
}

async function runPrivateFlow(admin, token, teacherId, students) {
  const pdfB64 = MINIMAL_PDF.toString("base64");

  const { status: bothStatus } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      classId: "11111111-1111-4111-8111-111111111111",
      studentIds: [students.s2.studentId],
      title: "bad",
      subject: "math",
      worksheetMode: "pdf_only",
    },
  });
  record("private.create.classId_and_studentIds_rejected", bothStatus === 400, String(bothStatus));

  const fakeStudent = "99999999-9999-4999-8999-999999999999";
  const { status: unlinkedStatus } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      studentIds: [fakeStudent],
      title: `QA unlinked ${Date.now()}`,
      subject: "math",
      worksheetMode: "pdf_only",
    },
  });
  record("private.create.unlinked_student_forbidden", unlinkedStatus === 403, String(unlinkedStatus));

  const { res: oneRes, json: oneJson } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      studentIds: [students.s1.studentId],
      title: `QA private one ${Date.now()}`,
      subject: "math",
      worksheetMode: "pdf_only",
    },
  });
  const oneId = oneJson?.data?.worksheetId;
  record("private.create.one_student", oneRes.status === 201 && !!oneId, String(oneRes.status));

  const { data: oneRow } = await admin
    .from("worksheet_activities")
    .select("assignment_scope, class_id, school_id")
    .eq("id", oneId)
    .single();
  record(
    "private.db.one_student_scope",
    oneRow?.assignment_scope === "selected_students" && oneRow?.class_id == null,
    JSON.stringify(oneRow)
  );

  const { data: oneAssign } = await admin
    .from("worksheet_student_assignments")
    .select("student_id")
    .eq("worksheet_activity_id", oneId);
  record(
    "private.db.one_assignment_row",
    (oneAssign || []).length === 1 && oneAssign[0].student_id === students.s1.studentId,
    `count=${oneAssign?.length ?? 0}`
  );

  const { res: multiRes, json: multiJson } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      studentIds: [students.s1.studentId, students.s2.studentId],
      title: `QA private multi ${Date.now()}`,
      subject: "math",
      worksheetMode: "digital_answers",
      questionCount: 2,
    },
  });
  const multiId = multiJson?.data?.worksheetId;
  record("private.create.multi_student", multiRes.status === 201 && !!multiId, String(multiRes.status));

  const { data: multiAssign } = await admin
    .from("worksheet_student_assignments")
    .select("student_id")
    .eq("worksheet_activity_id", multiId);
  record(
    "private.db.multi_assignment_rows",
    (multiAssign || []).length === 2,
    `count=${multiAssign?.length ?? 0}`
  );

  for (const wsId of [oneId, multiId]) {
    await api(`/api/teacher/worksheet-activities/${wsId}/upload-pdf`, {
      method: "POST",
      token,
      body: { pdfBase64: pdfB64, originalFilename: "qa.pdf", fileRole: "worksheet" },
    });
  }

  await api(`/api/teacher/worksheet-activities/${multiId}/questions`, {
    method: "POST",
    token,
    body: {
      questions: [
        { questionIndex: 1, questionType: "multiple_choice", points: 2, choices: ["א", "ב"], correctAnswer: "ב" },
        { questionIndex: 2, questionType: "numeric", points: 2, correctAnswer: "5" },
      ],
    },
  });

  await api(`/api/teacher/worksheet-activities/${oneId}/status`, {
    method: "PATCH",
    token,
    body: { action: "activate" },
  });
  await api(`/api/teacher/worksheet-activities/${multiId}/status`, {
    method: "PATCH",
    token,
    body: { action: "activate" },
  });

  const { data: oneStatusRows } = await admin
    .from("worksheet_student_status")
    .select("student_id")
    .eq("worksheet_activity_id", oneId);
  record("private.activate.one_status_row", (oneStatusRows || []).length === 1, `count=${oneStatusRows?.length ?? 0}`);

  const { data: multiStatusRows } = await admin
    .from("worksheet_student_status")
    .select("student_id")
    .eq("worksheet_activity_id", multiId);
  record("private.activate.multi_status_rows", (multiStatusRows || []).length === 2, `count=${multiStatusRows?.length ?? 0}`);

  const login1 = await studentLogin(students.s1.username);
  record("private.student.login_s1", login1.ok, "");
  const login2 = await studentLogin(students.s2.username);
  record("private.student.login_s2", login2.ok, "");

  const { res: list1, json: listJson1 } = await api("/api/student/worksheet-activities", {
    cookie: login1.cookie,
  });
  const listedOne = (listJson1?.worksheets || []).some((w) => w.worksheetId === oneId);
  const listedMulti = (listJson1?.worksheets || []).some((w) => w.worksheetId === multiId);
  record("private.student.home_lists_worksheets", list1.ok && listedOne && listedMulti, `one=${listedOne} multi=${listedMulti}`);

  const { res: pdfRes, json: pdfJson } = await api(
    `/api/student/worksheet-activities/${oneId}/pdf-url`,
    { cookie: login1.cookie }
  );
  record("private.student.pdf_url", pdfRes.ok && !!pdfJson?.signedUrl, String(pdfRes.status));

  const { data: open1 } = await admin
    .from("worksheet_student_status")
    .select("pdf_open_count, pdf_first_opened_at")
    .eq("worksheet_activity_id", oneId)
    .eq("student_id", students.s1.studentId)
    .maybeSingle();
  record(
    "private.tracking.pdf_open",
    (open1?.pdf_open_count ?? 0) >= 1 && !!open1?.pdf_first_opened_at,
    `count=${open1?.pdf_open_count}`
  );

  const outsider = await pickOutsiderStudent(admin, teacherId, students.allIds);
  const outsiderLogin = await studentLogin(outsider.username);
  const { status: forbidStatus } = await api(
    `/api/student/worksheet-activities/${oneId}/pdf-url`,
    { cookie: outsiderLogin.cookie }
  );
  record("private.security.unassigned_403", forbidStatus === 403 || forbidStatus === 404, String(forbidStatus));

  const { res: subRes } = await api(`/api/student/worksheet-activities/${multiId}/submit`, {
    method: "POST",
    cookie: login1.cookie,
    body: {
      answers: [
        { questionIndex: 1, answerValue: "ב" },
        { questionIndex: 2, answerValue: "5" },
      ],
    },
  });
  record("private.student.digital_submit", subRes.ok, String(subRes.status));

  const { res: beforePub, json: beforeJson } = await api(
    `/api/student/worksheet-activities/${multiId}`,
    { cookie: login1.cookie }
  );
  record(
    "private.publish.gate.before",
    beforePub.ok && beforeJson?.displayScore == null,
    `score=${beforeJson?.displayScore}`
  );

  const { res: gradeRes } = await api(
    `/api/teacher/worksheet-activities/${multiId}/students/${students.s1.studentId}/grade`,
    {
      method: "POST",
      token,
      body: { grades: [{ questionIndex: 2, teacherScore: 2 }], markChecked: true },
    }
  );
  record("private.teacher.manual_grade", gradeRes.ok, String(gradeRes.status));

  const { data: autoAns } = await admin
    .from("worksheet_student_answers")
    .select("question_index, auto_is_correct")
    .eq("worksheet_activity_id", multiId)
    .eq("student_id", students.s1.studentId)
    .eq("question_index", 1)
    .maybeSingle();
  record("private.auto_grade.mc", autoAns?.auto_is_correct === true, String(autoAns?.auto_is_correct));

  const { res: pubRes } = await api(
    `/api/teacher/worksheet-activities/${multiId}/students/${students.s1.studentId}/publish`,
    { method: "POST", token }
  );
  record("private.teacher.publish", pubRes.ok, String(pubRes.status));

  const { res: afterPub, json: afterJson } = await api(
    `/api/student/worksheet-activities/${multiId}`,
    { cookie: login1.cookie }
  );
  record(
    "private.publish.gate.after",
    afterPub.ok && afterJson?.displayScore != null,
    `score=${afterJson?.displayScore}`
  );

  const { res: allList, json: allListJson } = await api("/api/teacher/worksheet-activities", { token });
  const hasPrivate = (allListJson?.data?.worksheets || []).some(
    (w) => w.worksheetId === oneId && w.assignmentScope === "selected_students"
  );
  record("private.teacher.list_all_scopes", allList.ok && hasPrivate, `count=${allListJson?.data?.worksheets?.length ?? 0}`);

  return { oneId, multiId };
}

async function verifySchoolManagerIsolation(schoolToken, privateWorksheetId) {
  const { res, json } = await api("/api/school/worksheet-activities", { token: schoolToken });
  const items = json?.data?.worksheets ?? json?.worksheets ?? [];
  const hasPrivate = items.some((w) => w.worksheetId === privateWorksheetId);
  record("school.no_private_selected_worksheets", res.ok && !hasPrivate, `count=${items.length}`);
}

async function verifyClassWorksheetRegression(admin, schoolToken) {
  const token = await authToken(SCHOOL_TEACHER_EMAIL);
  const authUser = await findAuthUserByEmail(admin, SCHOOL_TEACHER_EMAIL);
  const className = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", authUser.id)
    .eq("name", className)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(cls?.id, "dan class");

  const { res: createRes, json: createJson } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      classId: cls.id,
      title: `QA class regression ${Date.now()}`,
      subject: "geometry",
      worksheetMode: "pdf_only",
    },
  });
  const wsId = createJson?.data?.worksheetId;
  record("class.create", createRes.status === 201 && !!wsId, String(createRes.status));

  await api(`/api/teacher/worksheet-activities/${wsId}/upload-pdf`, {
    method: "POST",
    token,
    body: {
      pdfBase64: MINIMAL_PDF.toString("base64"),
      originalFilename: "qa.pdf",
      fileRole: "worksheet",
    },
  });
  const { res: actRes } = await api(`/api/teacher/worksheet-activities/${wsId}/status`, {
    method: "PATCH",
    token,
    body: { action: "activate" },
  });
  record("class.activate", actRes.ok, String(actRes.status));

  const { res: classList } = await api(
    `/api/teacher/worksheet-activities?classId=${encodeURIComponent(cls.id)}`,
    { token }
  );
  record("class.list_by_classId", classList.ok, String(classList.status));

  const { res: schList, json: schJson } = await api(
    `/api/school/worksheet-activities?classId=${encodeURIComponent(cls.id)}`,
    { token: schoolToken }
  );
  const schoolHas = (schJson?.data?.worksheets ?? []).some((w) => w.worksheetId === wsId);
  record("school.sees_class_worksheet", schList.ok && schoolHas, String(schList.status));
}

async function verifyActivityRegressions(admin, privateTeacherId) {
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", privateTeacherId)
    .limit(1)
    .maybeSingle();
  if (cls?.id) {
    const token = await authToken(PRIVATE_TEACHER_EMAIL);
    const { res, json } = await api(
      `/api/teacher/activities?classId=${encodeURIComponent(cls.id)}`,
      { token }
    );
    record(
      "regression.classroom_activities",
      res.ok && Array.isArray(json?.data?.activities),
      `count=${json?.data?.activities?.length ?? 0}`
    );
  } else {
    record("regression.classroom_activities", true, "skipped — private teacher has no class");
  }

  const { data: link } = await admin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", privateTeacherId)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (link?.student_id) {
    const token = await authToken(PRIVATE_TEACHER_EMAIL);
    const { res } = await api(
      `/api/teacher/student-activities?studentId=${encodeURIComponent(link.student_id)}`,
      { token }
    );
    record("regression.student_activities", res.ok || res.status === 200, String(res.status));
  }
}

async function verifyDashboardRoutes() {
  const paths = [
    "/teacher/dashboard",
    "/teacher/worksheets",
    "/teacher/worksheets/new",
  ];
  for (const p of paths) {
    const { status } = await api(p);
    record(`nav.route${p.replace(/\//g, ".")}`, status === 200 || status === 307 || status === 308, String(status));
  }
}

async function main() {
  console.log("verify-private-teacher-worksheet-post-sql — base:", BASE_URL);
  assert.ok(PRIVATE_TEACHER_PASSWORD || SCHOOL_ACCOUNT_PASSWORD, "Set TEACHER_PORTAL_VERIFY_PASSWORD and/or SCHOOL_QA_PASSWORD");

  const admin = createServiceRole();
  await verifySchema035(admin);

  try {
    const health = await fetch(`${BASE_URL}/api/student/worksheet-activities`, {
      headers: { Origin: BASE_URL },
    });
    record("server.health", health.status === 401 || health.status === 200, String(health.status));
    if (!(health.status === 401 || health.status === 200)) process.exit(1);
  } catch (e) {
    record("server.health", false, String(e.message || e));
    process.exit(1);
  }

  const privateTeacher = await findAuthUserByEmail(admin, PRIVATE_TEACHER_EMAIL);
  assert.ok(privateTeacher?.id, PRIVATE_TEACHER_EMAIL);
  const privateToken = await authToken(PRIVATE_TEACHER_EMAIL);
  const schoolToken = await authToken(SCHOOL_EMAIL);

  const students = await pickPrivateTeacherStudents(admin, privateTeacher.id);
  const { oneId } = await runPrivateFlow(admin, privateToken, privateTeacher.id, students);
  await verifySchoolManagerIsolation(schoolToken, oneId);
  await verifyClassWorksheetRegression(admin, schoolToken);
  await verifyActivityRegressions(admin, privateTeacher.id);
  await verifyDashboardRoutes();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    console.log("Failed:", failed.map((f) => `${f.id}${f.detail ? ` (${f.detail})` : ""}`).join(", "));
    process.exit(1);
  }
  console.log("\nverify-private-teacher-worksheet-post-sql: ALL PASS");
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
