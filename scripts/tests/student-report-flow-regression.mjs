#!/usr/bin/env node
/**
 * Regression: student report flows remain isolated and additive.
 * 1. Parent — aggregateParentReportPayload only (no classId, no classroom merge)
 * 2. Private teacher — teacher_students link, no classId, learning_sessions path unchanged
 * 3. School-managed — classId passed, classroom activity merged when data exists
 * 4. Cross-scope guard — foreign classId must not inflate answers
 */
import assert from "node:assert/strict";
import { aggregateParentReportPayload } from "../../lib/parent-server/report-data-aggregate.server.js";
import {
  buildTeacherStudentReportPayload,
  buildTeacherParentReportPreviewPayload,
} from "../../lib/teacher-server/teacher-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { DEMO_PARENT_EMAIL, physicalClassName } from "../school-portal/demo-school-data.mjs";

const PRIVATE_TEACHER_EMAIL = "teacher@leo.com";

function summaryOf(payload) {
  const s = payload?.summary || {};
  return {
    totalAnswers: Number(s.totalAnswers || 0),
    totalSessions: Number(s.totalSessions || 0),
    accuracyPct: s.accuracyPct ?? null,
    studentName: String(payload?.student?.full_name || "").trim(),
  };
}

async function countLearningSessionAnswers(admin, studentId, fromDate, toDate) {
  const fromIso = fromDate.toISOString().slice(0, 10);
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIso = toExclusive.toISOString().slice(0, 10);

  const { data: sessions } = await admin
    .from("learning_sessions")
    .select("id")
    .eq("student_id", studentId)
    .gte("started_at", `${fromIso}T00:00:00.000Z`)
    .lt("started_at", `${toIso}T00:00:00.000Z`);

  const sessionIds = (sessions || []).map((r) => r.id);
  if (!sessionIds.length) return { sessions: 0, answers: 0 };

  const { count } = await admin
    .from("answers")
    .select("id", { count: "exact", head: true })
    .in("learning_session_id", sessionIds);

  return { sessions: sessionIds.length, answers: count ?? 0 };
}

async function countClassroomAnswers(admin, classId, studentId, fromDate, toDate) {
  const fromIso = fromDate.toISOString().slice(0, 10);
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const toIsoExclusive = toExclusive.toISOString().slice(0, 10);

  const { data: activities } = await admin
    .from("classroom_activities")
    .select("id, closed_at, activated_at, created_at, status")
    .eq("class_id", classId)
    .neq("status", "archived");

  const inRange = (activities || []).filter((row) => {
    const ts = row.closed_at || row.activated_at || row.created_at;
    if (!ts) return false;
    const day = String(ts).slice(0, 10);
    return day >= fromIso && day < toIsoExclusive;
  });
  if (!inRange.length) return { activities: 0, answers: 0 };

  const activityIds = inRange.map((r) => r.id);
  const { data: statuses } = await admin
    .from("classroom_activity_student_status")
    .select("answers_count")
    .in("activity_id", activityIds)
    .eq("student_id", studentId);

  const answers = (statuses || []).reduce((sum, row) => sum + Number(row.answers_count || 0), 0);
  return { activities: inRange.length, answers };
}

async function verifyParentFlow(admin, fromDate, toDate) {
  const parent = await findAuthUserByEmail(admin, DEMO_PARENT_EMAIL);
  assert.ok(parent?.id, `parent auth user ${DEMO_PARENT_EMAIL}`);

  const { data: children } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active, parent_id")
    .eq("parent_id", parent.id)
    .eq("is_active", true)
    .limit(5);
  assert.ok(children?.length, "parent must have at least one active child");

  let picked = null;
  let analytics = null;
  for (const child of children) {
    const agg = await aggregateParentReportPayload(admin, child, fromDate, toDate);
    const summary = summaryOf({ summary: agg.summary, student: child });
    if (summary.studentName) {
      picked = child;
      analytics = agg;
      break;
    }
  }
  assert.ok(picked?.id, "parent child with name");
  const summary = summaryOf({ summary: analytics.summary, student: picked });

  const ls = await countLearningSessionAnswers(admin, picked.id, fromDate, toDate);
  assert.equal(
    summary.totalAnswers,
    ls.answers,
    "parent report answers must match learning_sessions/answers only"
  );
  assert.ok(summary.studentName, "parent report must include student name");

  return {
    flow: "parent",
    pass: true,
    evidence: {
      parentEmail: DEMO_PARENT_EMAIL,
      studentId: picked.id,
      studentName: summary.studentName,
      totalAnswers: summary.totalAnswers,
      totalSessions: summary.totalSessions,
      learningSessionAnswers: ls.answers,
      classIdRequired: false,
      classroomMerge: false,
      dataSource: "learning_sessions/answers",
    },
  };
}

async function verifyPrivateTeacherFlow(admin, fromDate, toDate) {
  const teacher = await findAuthUserByEmail(admin, PRIVATE_TEACHER_EMAIL);
  assert.ok(teacher?.id, `private teacher ${PRIVATE_TEACHER_EMAIL}`);

  const { data: links } = await admin
    .from("teacher_students")
    .select("student_id, students(id, full_name, grade_level, is_active)")
    .eq("teacher_id", teacher.id)
    .is("archived_at", null)
    .limit(20);
  assert.ok(links?.length, "private teacher must have teacher_students links");

  let studentId = null;
  let studentRow = null;
  for (const link of links) {
    const row = link.students;
    if (row?.id && String(row.full_name || "").trim()) {
      studentId = row.id;
      studentRow = row;
      break;
    }
  }
  assert.ok(studentId, "linked student with name");

  const baseAgg = await aggregateParentReportPayload(admin, studentRow, fromDate, toDate);
  const baseSummary = summaryOf({ summary: baseAgg.summary, student: studentRow });

  const report = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: teacher.id,
      studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true }
  );
  assert.ok(report.ok, report.code || "private teacher report failed");
  const reportSummary = summaryOf(report.payload);

  assert.equal(
    reportSummary.totalAnswers,
    baseSummary.totalAnswers,
    "private teacher without classId must equal aggregateParentReportPayload"
  );
  assert.equal(
    reportSummary.totalSessions,
    baseSummary.totalSessions,
    "private teacher sessions must not include classroom merge without classId"
  );
  assert.ok(reportSummary.studentName, "private teacher report must include student name");

  const ls = await countLearningSessionAnswers(admin, studentId, fromDate, toDate);

  return {
    flow: "private_teacher",
    pass: true,
    evidence: {
      teacherEmail: PRIVATE_TEACHER_EMAIL,
      linkType: "teacher_students",
      studentId,
      studentName: reportSummary.studentName,
      totalAnswers: reportSummary.totalAnswers,
      totalSessions: reportSummary.totalSessions,
      learningSessionAnswers: ls.answers,
      classIdRequired: false,
      classroomMerge: false,
      matchesBaseAggregate: true,
      dataSource: "learning_sessions/answers",
    },
  };
}

async function verifySchoolManagedFlow(admin, fromDate, toDate) {
  const teacher = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(teacher?.id, "Dan Cohen auth user");

  const targetName = physicalClassName(1, 2);
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus")
    .eq("teacher_id", teacher.id)
    .eq("name", targetName)
    .eq("subject_focus", "geometry")
    .maybeSingle();
  assert.ok(cls?.id, `geometry class ${targetName}`);

  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null)
    .limit(1);
  const studentId = roster?.[0]?.student_id;
  assert.ok(studentId, "roster student");

  const { data: studentRow } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", studentId)
    .maybeSingle();

  const baseAgg = await aggregateParentReportPayload(admin, studentRow, fromDate, toDate);
  const baseAnswers = Number(baseAgg.summary?.totalAnswers || 0);

  const report = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: teacher.id,
      studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true, classId: cls.id }
  );
  assert.ok(report.ok, report.code || "school student report failed");

  const reportSummary = summaryOf(report.payload);
  const ls = await countLearningSessionAnswers(admin, studentId, fromDate, toDate);
  const classroom = await countClassroomAnswers(admin, cls.id, studentId, fromDate, toDate);
  const learningAnswers = ls.answers;
  const classroomAnswers = classroom.answers;
  const sourceActivityInRange = learningAnswers > 0 || classroomAnswers > 0;

  assert.ok(reportSummary.studentName, "school report must include student name");

  if (sourceActivityInRange) {
    assert.ok(
      reportSummary.totalAnswers > 0,
      "school report must be non-zero when source activity exists in range"
    );
    assert.ok(
      reportSummary.totalAnswers >= baseAnswers,
      "school report must be at least parent baseline learning answers"
    );
    assert.ok(
      reportSummary.totalAnswers >= learningAnswers,
      "school report must include learning-session answers when present"
    );
    if (classroomAnswers > 0) {
      assert.ok(
        reportSummary.totalAnswers >= classroomAnswers,
        "school report must include classroom activity answers when present"
      );
      assert.ok(
        reportSummary.totalAnswers >= baseAnswers + classroomAnswers,
        "school report with classId must merge classroom answers additively"
      );
    } else {
      assert.equal(
        reportSummary.totalAnswers,
        baseAnswers,
        "school report without classroom data in range must match parent baseline"
      );
    }
  } else {
    assert.equal(
      reportSummary.totalAnswers,
      0,
      "school report must be zero when no learning or classroom activity in range"
    );
    assert.equal(
      baseAnswers,
      0,
      "fixture sanity: parent baseline also zero in empty range"
    );
    assert.equal(
      learningAnswers,
      0,
      "fixture sanity: learning-session oracle also zero in empty range"
    );
    assert.equal(
      classroomAnswers,
      0,
      "fixture sanity: classroom oracle also zero in empty range"
    );
  }

  return {
    flow: "school_managed",
    pass: true,
    evidence: {
      teacherEmail: "dan@leo-k.com",
      classId: cls.id,
      className: cls.name,
      studentId,
      studentName: reportSummary.studentName,
      baseLearningAnswers: baseAnswers,
      learningSessionAnswers: learningAnswers,
      classroomAnswers,
      sourceActivityInRange,
      zeroDataFixture: !sourceActivityInRange,
      reportTotalAnswers: reportSummary.totalAnswers,
      reportTotalSessions: reportSummary.totalSessions,
      classIdRequired: true,
      classroomMerge: classroomAnswers > 0,
      dataSource: "learning_sessions/answers + classroom_activity_*",
    },
  };
}

async function verifyCrossScopeGuard(admin, fromDate, toDate, schoolEvidence) {
  const privateTeacher = await findAuthUserByEmail(admin, PRIVATE_TEACHER_EMAIL);
  assert.ok(privateTeacher?.id, "private teacher for cross-scope test");

  const { data: foreignClass } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", privateTeacher.id)
    .eq("is_archived", false)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  assert.ok(foreignClass?.id, "private teacher class for foreign classId test");

  const studentId = schoolEvidence.studentId;
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");

  const report = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: dan.id,
      studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true, classId: foreignClass.id }
  );
  assert.ok(report.ok, report.code || "cross-scope report build failed");

  const { data: studentRow } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", studentId)
    .maybeSingle();
  const baseAgg = await aggregateParentReportPayload(admin, studentRow, fromDate, toDate);
  const baseAnswers = Number(baseAgg.summary?.totalAnswers || 0);
  const reportAnswers = Number(report.payload.summary?.totalAnswers || 0);

  assert.equal(
    reportAnswers,
    baseAnswers,
    "foreign classId must not merge another teacher's classroom data"
  );

  return {
    flow: "cross_scope_guard",
    pass: true,
    evidence: {
      danTeacherId: dan.id,
      foreignClassId: foreignClass.id,
      foreignClassOwner: PRIVATE_TEACHER_EMAIL,
      studentId,
      baseAnswers,
      reportAnswers,
      leakPrevented: reportAnswers === baseAnswers,
    },
  };
}

async function verifyTeacherParentPreviewParity(admin, fromDate, toDate, schoolEvidence) {
  const teacher = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(teacher?.id, "Dan Cohen auth user for parent preview parity");

  const { data: studentRow } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", schoolEvidence.studentId)
    .maybeSingle();
  assert.ok(studentRow?.id, "student row for parent preview parity");

  const parentAgg = await aggregateParentReportPayload(admin, studentRow, fromDate, toDate);
  const parentSummary = summaryOf({ summary: parentAgg.summary, student: studentRow });

  const preview = await buildTeacherParentReportPreviewPayload({
    serviceRole: admin,
    teacherId: teacher.id,
    studentId: schoolEvidence.studentId,
    fromDate,
    toDate,
  });
  assert.ok(preview.ok, preview.code || "teacher parent preview failed");
  const previewSummary = summaryOf(preview.payload);

  assert.equal(
    previewSummary.totalAnswers,
    parentSummary.totalAnswers,
    "teacher parent preview must match regular parent report totalAnswers"
  );
  assert.equal(
    previewSummary.totalSessions,
    parentSummary.totalSessions,
    "teacher parent preview must match regular parent report totalSessions"
  );

  const teacherReport = await buildTeacherStudentReportPayload(
    {
      serviceRole: admin,
      teacherId: teacher.id,
      studentId: schoolEvidence.studentId,
      fromDate,
      toDate,
    },
    { skipAudit: true, classId: schoolEvidence.classId }
  );
  assert.ok(teacherReport.ok, teacherReport.code || "teacher student report failed");
  const teacherSummary = summaryOf(teacherReport.payload);
  const classroom = await countClassroomAnswers(
    admin,
    schoolEvidence.classId,
    schoolEvidence.studentId,
    fromDate,
    toDate
  );

  if (classroom.answers > 0) {
    assert.ok(
      teacherSummary.totalAnswers >= previewSummary.totalAnswers,
      "teacher student report must include classroom activity when present"
    );
    assert.ok(
      teacherSummary.totalAnswers >= classroom.answers,
      "teacher student report must reflect classroom answers"
    );
  }

  return {
    flow: "teacher_parent_preview_parity",
    pass: true,
    evidence: {
      studentId: schoolEvidence.studentId,
      parentTotalAnswers: parentSummary.totalAnswers,
      previewTotalAnswers: previewSummary.totalAnswers,
      teacherTotalAnswers: teacherSummary.totalAnswers,
      classroomAnswers: classroom.answers,
      previewMatchesParent: previewSummary.totalAnswers === parentSummary.totalAnswers,
      teacherIncludesClassroom:
        classroom.answers > 0 ? teacherSummary.totalAnswers >= classroom.answers : null,
    },
  };
}

async function main() {
  const admin = createServiceRole();
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);

  const results = [];
  results.push(await verifyParentFlow(admin, fromDate, toDate));
  results.push(await verifyPrivateTeacherFlow(admin, fromDate, toDate));
  const school = await verifySchoolManagedFlow(admin, fromDate, toDate);
  results.push(school);
  results.push(await verifyTeacherParentPreviewParity(admin, fromDate, toDate, school.evidence));
  results.push(await verifyCrossScopeGuard(admin, fromDate, toDate, school.evidence));

  const allPass = results.every((r) => r.pass);
  console.log(JSON.stringify({ allPass, results }, null, 2));
  if (!allPass) process.exit(1);
  console.log("\nstudent-report-flow-regression: PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
