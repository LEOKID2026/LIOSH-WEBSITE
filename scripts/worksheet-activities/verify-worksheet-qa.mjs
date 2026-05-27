#!/usr/bin/env node
/**
 * Post-migration 029 worksheet QA (read-only DB checks + HTTP API flow).
 * node --env-file=.env.local scripts/worksheet-activities/verify-worksheet-qa.mjs
 */
import assert from "node:assert/strict";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";
import { gradeWorksheetAnswer } from "../../lib/worksheet-activities/worksheet-grading.server.js";
import { WORKSHEET_BUCKET } from "../../lib/worksheet-activities/worksheet-shared.server.js";

const BASE_URL = (process.env.WORKSHEET_QA_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const TEACHER_EMAIL = process.env.WORKSHEET_QA_TEACHER_EMAIL || "dan@leo-k.com";
const SCHOOL_EMAIL = process.env.SCHOOL_QA_EMAIL || "school@leo-k.com";
const TEACHER_PASSWORD =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  "";
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

async function teacherToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  assert.ok(url && anon && TEACHER_PASSWORD, "Supabase + teacher password required");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Teacher auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

async function api(path, { method = "GET", token, cookie, body, headers = {} } = {}) {
  const h = { Origin: BASE_URL, ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (cookie) h.Cookie = cookie;
  let payload;
  if (body != null) {
    if (typeof body === "string" || body instanceof Buffer) payload = body;
    else {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: h, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function studentLogin(username) {
  const { res, json } = await api("/api/student/login", {
    method: "POST",
    body: { username, pin: STUDENT_PIN },
    headers: { "Content-Type": "application/json" },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") || "").split(",")[0]?.split(";")[0] ||
    "";
  return { ok: res.ok && json?.ok, cookie, json };
}

async function verifySchema(admin) {
  const tables = [
    "worksheet_activities",
    "worksheet_files",
    "worksheet_questions",
    "worksheet_student_status",
    "worksheet_student_answers",
  ];
  for (const t of tables) {
    const { error } = await admin.from(t).select("id").limit(1);
    record(`schema.${t}`, !error, error?.message || "");
  }

  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  const bucket = (buckets || []).find((b) => b.id === WORKSHEET_BUCKET || b.name === WORKSHEET_BUCKET);
  record(
    "storage.bucket.exists",
    !bErr && !!bucket,
    bucket ? `public=${bucket.public}` : bErr?.message || "missing"
  );
  record(
    "storage.bucket.private",
    bucket?.public === false,
    bucket ? `file_size_limit=${bucket.file_size_limit}` : ""
  );
  record(
    "storage.bucket.mime",
    Array.isArray(bucket?.allowed_mime_types) && bucket.allowed_mime_types.includes("application/pdf"),
    String(bucket?.allowed_mime_types || "")
  );
}

function verifyGradingUnit() {
  const mc = gradeWorksheetAnswer("b", "b", "multiple_choice");
  record("grading.mc", mc.autoIsCorrect === true);

  const tf = gradeWorksheetAnswer("false", "true", "true_false");
  record("grading.tf_wrong", tf.autoIsCorrect === false);

  const num = gradeWorksheetAnswer("42", "42", "numeric");
  record("grading.numeric", num.autoIsCorrect === true);

  const ft = gradeWorksheetAnswer("anything", "x", "free_text");
  record("grading.free_text_no_auto", ft.autoIsCorrect === null);
}

async function getDanClass(admin) {
  const authUser = await findAuthUserByEmail(admin, TEACHER_EMAIL);
  assert.ok(authUser?.id, "teacher auth user");
  const className = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, school_id")
    .eq("teacher_id", authUser.id)
    .eq("name", className)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(cls?.id, `class ${className}`);
  return { teacherId: authUser.id, classId: cls.id, schoolId: cls.school_id };
}

async function pickStudentInClass(admin, classId) {
  const { data: member } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", classId)
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();
  assert.ok(member?.student_id, "class member");
  const { data: code } = await admin
    .from("student_access_codes")
    .select("login_username")
    .eq("student_id", member.student_id)
    .eq("is_active", true)
    .not("login_username", "is", null)
    .limit(1)
    .maybeSingle();
  assert.ok(code?.login_username, "student login_username");
  return { studentId: member.student_id, username: code.login_username };
}

async function pickStudentOutsideClass(admin, classId) {
  const { data: inClass } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", classId)
    .is("removed_at", null);
  const inSet = new Set((inClass || []).map((r) => r.student_id));
  const { data: other } = await admin
    .from("teacher_class_students")
    .select("student_id, class_id")
    .is("removed_at", null)
    .limit(500);
  const outsider = (other || []).find((r) => r.student_id && !inSet.has(r.student_id));
  assert.ok(outsider?.student_id, "outsider student");
  const { data: code } = await admin
    .from("student_access_codes")
    .select("login_username")
    .eq("student_id", outsider.student_id)
    .eq("is_active", true)
    .not("login_username", "is", null)
    .limit(1)
    .maybeSingle();
  assert.ok(code?.login_username, "outsider login");
  return { studentId: outsider.student_id, username: code.login_username };
}

async function verifySchoolIsolation(schoolToken) {
  const { res, json } = await api("/api/school/activities", { token: schoolToken });
  const items = json?.data?.activities ?? json?.activities ?? [];
  const hasWorksheet = JSON.stringify(items).includes("worksheet");
  record(
    "regression.school_activities_no_worksheets",
    res.ok && Array.isArray(items) && !hasWorksheet,
    `count=${items.length}`
  );
}

async function verifyRegression(token, classId, admin) {
  const { res, json } = await api(
    `/api/teacher/activities?classId=${encodeURIComponent(classId)}`,
    { token }
  );
  record(
    "regression.classroom_activities.list",
    res.ok && Array.isArray(json?.data?.activities) && json.data.activities.length > 0,
    `count=${json?.data?.activities?.length ?? 0}`
  );

  const first = json?.data?.activities?.[0];
  if (first?.activityId) {
    const { res: r2 } = await api(
      `/api/teacher/activities/${encodeURIComponent(first.activityId)}/report`,
      { token }
    );
    record("regression.classroom_activity.report", r2.ok, String(r2.status));
  }

  const { count: wsInCa } = await admin
    .from("classroom_activities")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  const { count: wsCount } = await admin
    .from("worksheet_activities")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  record(
    "regression.tables_separate",
    (wsInCa ?? 0) > 0 && (wsCount ?? 0) >= 0,
    `classroom=${wsInCa} worksheet=${wsCount}`
  );
}

async function verifyHttpFlow(admin, token, classId, schoolId) {
  const inClass = await pickStudentInClass(admin, classId);
  const outsider = await pickStudentOutsideClass(admin, classId);

  const createBody = {
    classId,
    title: `QA Worksheet ${Date.now()}`,
    subject: "geometry",
    instructions: "הוראות בדיקה",
    worksheetMode: "digital_answers",
    questionCount: 3,
    physicalDueAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const { res: cRes, json: cJson } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: createBody,
  });
  const worksheetId = cJson?.data?.worksheetId;
  record("teacher.create", cRes.status === 201 && !!worksheetId, String(cRes.status));

  const pdfB64 = MINIMAL_PDF.toString("base64");
  const { res: upRes } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/upload-pdf`,
    {
      method: "POST",
      token,
      body: { pdfBase64: pdfB64, originalFilename: "qa-worksheet.pdf", fileRole: "worksheet" },
    }
  );
  record("teacher.upload_pdf", upRes.status === 201, String(upRes.status));

  const { res: badUp } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/upload-pdf`,
    {
      method: "POST",
      token,
      body: { pdfBase64: Buffer.from("NOTPDF").toString("base64"), originalFilename: "bad.pdf" },
    }
  );
  record("security.reject_non_pdf", badUp.status === 400, String(badUp.status));

  await api(`/api/teacher/worksheet-activities/${worksheetId}/upload-pdf`, {
    method: "POST",
    token,
    body: {
      pdfBase64: pdfB64,
      originalFilename: "qa-key.pdf",
      fileRole: "answer_key",
    },
  });

  const questions = [
    {
      questionIndex: 1,
      questionType: "multiple_choice",
      points: 2,
      choices: ["א", "ב", "ג"],
      correctAnswer: "ב",
    },
    { questionIndex: 2, questionType: "numeric", points: 2, correctAnswer: "7" },
    { questionIndex: 3, questionType: "free_text", points: 4, correctAnswer: null },
  ];
  const { res: qRes } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/questions`,
    { method: "POST", token, body: { questions } }
  );
  record("teacher.questions", qRes.ok, String(qRes.status));

  const { res: actRes } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/status`,
    { method: "PATCH", token, body: { action: "activate" } }
  );
  record("teacher.activate", actRes.ok, String(actRes.status));

  const login = await studentLogin(inClass.username);
  record("student.login", login.ok, login.json?.error || "");
  const studentCookie = login.cookie;

  const { res: listRes, json: listJson } = await api("/api/student/worksheet-activities", {
    cookie: studentCookie,
  });
  const listed = (listJson?.worksheets || []).some((w) => w.worksheetId === worksheetId);
  record("student.list", listRes.ok && listed, `count=${listJson?.worksheets?.length ?? 0}`);

  const { res: pdfRes, json: pdfJson } = await api(
    `/api/student/worksheet-activities/${worksheetId}/pdf-url`,
    { cookie: studentCookie }
  );
  record(
    "student.pdf_url",
    pdfRes.ok && !!pdfJson?.signedUrl,
    pdfJson?.signedUrl ? "signed" : String(pdfRes.status)
  );

  const { data: st1 } = await admin
    .from("worksheet_student_status")
    .select("pdf_open_count, pdf_first_opened_at")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", inClass.studentId)
    .maybeSingle();
  record(
    "tracking.pdf_open",
    (st1?.pdf_open_count ?? 0) >= 1 && !!st1?.pdf_first_opened_at,
    `count=${st1?.pdf_open_count}`
  );

  const outsiderLogin = await studentLogin(outsider.username);
  const { res: forbidRes } = await api(
    `/api/student/worksheet-activities/${worksheetId}/pdf-url`,
    { cookie: outsiderLogin.cookie }
  );
  record("security.wrong_student_pdf", forbidRes.status === 403 || forbidRes.status === 404, String(forbidRes.status));

  const { res: keyRes } = await api(
    `/api/student/worksheet-activities/${worksheetId}/pdf-url?fileRole=answer_key`,
    { cookie: studentCookie }
  );
  record("security.student_no_answer_key", keyRes.status === 403 || keyRes.status === 404, String(keyRes.status));

  const { res: subRes, json: subJson } = await api(
    `/api/student/worksheet-activities/${worksheetId}/submit`,
    {
      method: "POST",
      cookie: studentCookie,
      body: {
        answers: [
          { questionIndex: 1, answerValue: "ב" },
          { questionIndex: 2, answerValue: "7" },
          { questionIndex: 3, answerValue: "הסבר קצר" },
        ],
      },
    }
  );
  record("student.submit", subRes.ok && subJson?.submitted, String(subRes.status));

  const { res: resubmitRes } = await api(
    `/api/student/worksheet-activities/${worksheetId}/submit`,
    {
      method: "POST",
      cookie: studentCookie,
      body: { answers: [{ questionIndex: 1, answerValue: "ב" }] },
    }
  );
  record("student.resubmit_blocked", resubmitRes.status === 409, String(resubmitRes.status));

  const { res: pdf2 } = await api(
    `/api/student/worksheet-activities/${worksheetId}/pdf-url`,
    { cookie: studentCookie }
  );
  record("tracking.second_open", pdf2.ok, String(pdf2.status));
  const { data: st2 } = await admin
    .from("worksheet_student_status")
    .select("pdf_open_count, pdf_last_opened_at")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", inClass.studentId)
    .maybeSingle();
  record(
    "tracking.open_count_incremented",
    (st2?.pdf_open_count ?? 0) >= 2 && !!st2?.pdf_last_opened_at,
    `count=${st2?.pdf_open_count}`
  );

  const { res: beforeRes, json: beforeJson } = await api(
    `/api/student/worksheet-activities/${worksheetId}`,
    { cookie: studentCookie }
  );
  const beforeStatus = beforeJson?.studentStatus?.gradingStatus;
  record(
    "publish.gate.before",
    beforeRes.ok &&
      beforeJson?.displayScore == null &&
      beforeJson?.waitingForTeacher === true &&
      beforeStatus !== "published",
    `status=${beforeStatus} score=${beforeJson?.displayScore}`
  );

  const { res: gradeRes } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/students/${inClass.studentId}/grade`,
    {
      method: "POST",
      token,
      body: {
        grades: [{ questionIndex: 3, teacherScore: 3, teacherComment: "יפה" }],
        markChecked: true,
      },
    }
  );
  record("teacher.grade", gradeRes.ok, String(gradeRes.status));

  const { res: pubRes } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}/students/${inClass.studentId}/publish`,
    { method: "POST", token }
  );
  record("teacher.publish", pubRes.ok, String(pubRes.status));

  const { res: afterPub, json: afterJson } = await api(
    `/api/student/worksheet-activities/${worksheetId}`,
    { cookie: studentCookie }
  );
  record(
    "publish.gate.after",
    afterPub.ok && afterJson?.displayScore != null,
    `score=${afterJson?.displayScore}`
  );

  const michalToken = await teacherTokenForEmail("michal@leo-k.com");
  const { res: wrongTeacher } = await api(
    `/api/teacher/worksheet-activities/${worksheetId}`,
    { token: michalToken }
  );
  record("security.wrong_teacher", wrongTeacher.status === 404, String(wrongTeacher.status));

  const schoolToken = await teacherTokenForEmail(SCHOOL_EMAIL);
  const { res: schList } = await api(
    `/api/school/worksheet-activities?classId=${encodeURIComponent(classId)}`,
    { token: schoolToken }
  );
  record("school.list", schList.ok, String(schList.status));

  const { res: schRep, json: schJson } = await api(
    `/api/school/worksheet-activities/${worksheetId}/report`,
    { token: schoolToken }
  );
  const summary = schJson?.data?.summary;
  record(
    "school.summary_aggregate_only",
    schRep.ok &&
      summary &&
      typeof summary.totalStudents === "number" &&
      !summary.studentRows,
    summary ? `publishedPct=${summary.publishedPct}` : ""
  );

  // PDF-only flow quick check
  const { res: pdfOnlyRes, json: pdfOnlyJson } = await api("/api/teacher/worksheet-activities", {
    method: "POST",
    token,
    body: {
      classId,
      title: `QA PDF-only ${Date.now()}`,
      subject: "geometry",
      worksheetMode: "pdf_only",
    },
  });
  const pdfOnlyId = pdfOnlyJson?.data?.worksheetId;
  if (pdfOnlyId) {
    await api(`/api/teacher/worksheet-activities/${pdfOnlyId}/upload-pdf`, {
      method: "POST",
      token,
      body: { pdfBase64: pdfB64, originalFilename: "qa.pdf", fileRole: "worksheet" },
    });
    await api(`/api/teacher/worksheet-activities/${pdfOnlyId}/status`, {
      method: "PATCH",
      token,
      body: { action: "activate" },
    });
    const { res: mcRes } = await api(
      `/api/student/worksheet-activities/${pdfOnlyId}/mark-complete`,
      { method: "POST", cookie: studentCookie }
    );
    record("pdf_only.mark_complete", mcRes.ok, String(mcRes.status));
    const { data: mcSt } = await admin
      .from("worksheet_student_status")
      .select("marked_completed_at, grading_status")
      .eq("worksheet_activity_id", pdfOnlyId)
      .eq("student_id", inClass.studentId)
      .maybeSingle();
    record(
      "pdf_only.status_submitted",
      !!mcSt?.marked_completed_at && mcSt?.grading_status === "submitted",
      mcSt?.grading_status || ""
    );
  }

  return { worksheetId, classId };
}

async function teacherTokenForEmail(email) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const password = TEACHER_PASSWORD;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Auth failed for ${email}`);
  return (await res.json()).access_token;
}

async function healthCheck() {
  try {
    const res = await fetch(`${BASE_URL}/api/student/worksheet-activities`, {
      method: "GET",
      headers: { Origin: BASE_URL },
    });
    const healthy = res.status === 401 || res.status === 200;
    record("server.health", healthy, String(res.status));
    return healthy;
  } catch (e) {
    record("server.health", false, String(e.message || e));
    return false;
  }
}

async function main() {
  console.log("Worksheet QA — base URL:", BASE_URL);
  assert.ok(TEACHER_PASSWORD, "Set DEMO_TEACHER_PASSWORD or TEACHER_PORTAL_VERIFY_PASSWORD");

  const admin = createServiceRole();
  await verifySchema(admin);
  verifyGradingUnit();

  const healthy = await healthCheck();
  if (!healthy) {
    console.error("\nStart dev server: npm run dev (port 3001) then re-run.");
    process.exit(1);
  }

  const token = await teacherToken();
  const schoolToken = await teacherTokenForEmail(SCHOOL_EMAIL);
  await verifySchoolIsolation(schoolToken);
  const { classId } = await getDanClass(admin);
  await verifyRegression(token, classId, admin);
  await verifyHttpFlow(admin, token, classId, DEMO_SCHOOL_ID);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    console.log("Failed:", failed.map((f) => f.id).join(", "));
    process.exit(1);
  }
  console.log("\nverify-worksheet-qa: ALL PASS");
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
