#!/usr/bin/env node
/**
 * Report synchronization closure — proves server/report engine alignment per product scope.
 * Run: node --env-file=.env.local scripts/tests/report-synchronization-closure.mjs
 */
import assert from "node:assert/strict";
import {
  applyServerParentFacingAuthorityToClientReport,
  isServerThinDataReportPayload,
} from "../../lib/parent-server/parent-facing-report-authority.js";
import { aggregateParentReportPayload } from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  analyzeReportSubjectReconciliation,
  applySchoolTeacherReportFilter,
  assertActivitySubjectAllowed,
  filterReportByPermittedSubjects,
  loadTeacherPermittedSubjects,
  sumMetricsFromSubjectRollups,
} from "../../lib/school-server/school-subjects.server.js";
import {
  resolveSchoolReportTeacherForStudent,
  verifyStudentVisibleToSchool,
} from "../../lib/school-server/school-scope.server.js";
import {
  aggregateClassReportFromStudentPayloads,
} from "../../lib/teacher-server/teacher-class-report.server.js";
import {
  buildClassroomActivityRollupsByStudentId,
  mergeClassroomActivityRollupIntoReportPayload,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";
import {
  buildTeacherParentReportPreviewPayload,
  buildTeacherStudentReportPayload,
} from "../../lib/teacher-server/teacher-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { DEMO_PARENT_EMAIL } from "../school-portal/demo-school-data.mjs";
import { SCHOOL_MANAGER_EMAIL } from "../school-portal/sim/school-sim-config.mjs";

const PRIVATE_TEACHER_EMAIL = "teacher@leo.com";
const SCHOOL_TEACHER_EMAIL = "dan@leo-k.com";

/** @type {Array<Record<string, unknown>>} */
const matrix = [];

function isoRange(days = 30) {
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    fromDate,
    toDate,
  };
}

function record(surface, pass, fields) {
  matrix.push({
    surface,
    status: pass ? "PASS" : "FAIL",
    ...fields,
  });
  return pass;
}

function summaryOf(payload) {
  const s = payload?.summary || {};
  return {
    totalAnswers: Number(s.totalAnswers || 0),
    totalSessions: Number(s.totalSessions || 0),
  };
}

function subjectKeys(payload) {
  return Object.keys(payload?.subjects || {}).filter(
    (k) => Number(payload.subjects[k]?.answers || 0) > 0 || Number(payload.subjects[k]?.sessions || 0) > 0
  );
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
  if (!inRange.length) return 0;

  const activityIds = inRange.map((r) => r.id);
  const { data: statuses } = await admin
    .from("classroom_activity_student_status")
    .select("answers_count")
    .in("activity_id", activityIds)
    .eq("student_id", studentId);

  return (statuses || []).reduce((sum, row) => sum + Number(row.answers_count || 0), 0);
}

async function loadPrivateTeacherGrants(admin, teacherId) {
  const { data } = await admin
    .from("private_teacher_subjects")
    .select("subject")
    .eq("teacher_id", teacherId);
  return (data || []).map((r) => String(r.subject).trim()).filter(Boolean);
}

function createPrivateGateMockServiceRole(privateSubjects) {
  return {
    from(table) {
      const state = { filters: {} };
      const chain = {
        select() {
          return chain;
        },
        eq(col, val) {
          state.filters[col] = val;
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        maybeSingle() {
          if (table === "school_teacher_memberships") {
            return Promise.resolve({ data: null, error: null });
          }
          if (table === "private_teacher_subjects") {
            const subject = state.filters.subject;
            const granted = privateSubjects.includes(subject);
            return Promise.resolve({
              data: granted ? { id: "grant-1", subject } : null,
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve) {
          return resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
}

async function resolveSchoolFixture(admin) {
  const dan = await findAuthUserByEmail(admin, SCHOOL_TEACHER_EMAIL);
  assert.ok(dan?.id, "Dan Cohen auth user");

  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus, school_id")
    .eq("teacher_id", dan.id)
    .eq("subject_focus", "geometry")
    .eq("is_archived", false)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  assert.ok(cls?.id, "Dan geometry class");

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
  assert.ok(studentRow?.id, "student row");

  return { dan, cls, studentId, studentRow, schoolId: cls.school_id };
}

function checkParentFacingAuthorityUnit() {
  const clientBase = {
    analysis: { recommendations: [{ text: "client rec" }] },
    patternDiagnostics: {
      subjects: { math: { parentRecommendationsImprove: ["do more"] } },
    },
  };
  const apiThin = {
    summary: { totalAnswers: 2, totalSessions: 1 },
    parentFacing: {
      insights: ["יש עדיין מעט נתוני תרגול"],
      homeRecommendations: ["תרגול קצר"],
    },
  };
  applyServerParentFacingAuthorityToClientReport(clientBase, apiThin);

  const pass =
    clientBase._parentFacingAuthority === "server" &&
    clientBase.parentFacing.insights[0] === apiThin.parentFacing.insights[0] &&
    clientBase.analysis.recommendations.length === 0 &&
    Object.keys(clientBase.patternDiagnostics?.subjects || {}).length === 0 &&
    isServerThinDataReportPayload(apiThin) === true;

  return record("1. Parent report — server parentFacing authority", pass, {
    dateRange: "unit (in-memory)",
    studentId: "n/a",
    classId: "n/a",
    activityId: "n/a",
    evidence: {
      authority: clientBase._parentFacingAuthority,
      serverInsight: clientBase.parentFacing?.insights?.[0],
      clientRecsSuppressed: clientBase.analysis.recommendations.length === 0,
      thinDataPatternCleared: Object.keys(clientBase.patternDiagnostics?.subjects || {}).length === 0,
    },
    mismatchClass: pass ? null : "bug",
  });
}

function checkClassVsStudentReconciliationUnit() {
  const studentA = "11111111-1111-4111-8111-111111111111";
  const studentB = "22222222-2222-4222-8222-222222222222";
  const activityOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const activityTwo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  const rollups = buildClassroomActivityRollupsByStudentId({
    activities: [
      { id: activityOne, subject: "geometry", topic: "shapes", closed_at: "2026-05-10T12:00:00.000Z" },
      { id: activityTwo, subject: "geometry", topic: "angles", closed_at: "2026-05-12T12:00:00.000Z" },
    ],
    statuses: [
      {
        activity_id: activityOne,
        student_id: studentA,
        status: "submitted",
        submitted_at: "2026-05-10T12:00:00.000Z",
        answers_count: 10,
        correct_count: 8,
      },
      {
        activity_id: activityTwo,
        student_id: studentA,
        status: "submitted",
        submitted_at: "2026-05-12T12:00:00.000Z",
        answers_count: 10,
        correct_count: 7,
      },
      {
        activity_id: activityOne,
        student_id: studentB,
        status: "submitted",
        submitted_at: "2026-05-10T12:00:00.000Z",
        answers_count: 10,
        correct_count: 6,
      },
    ],
    studentIds: [studentA, studentB],
  });

  const emptyPayload = {
    range: { from: "2026-05-01", to: "2026-05-18" },
    summary: { totalSessions: 0, totalAnswers: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: 0 },
    subjects: { geometry: { sessions: 0, answers: 0, correct: 0, wrong: 0, topics: {} } },
    dailyActivity: [],
    recentMistakes: [],
  };

  const studentPayloads = [
    {
      studentId: studentA,
      studentFullName: "Student A",
      studentFullNameMasked: "S*** A",
      membershipId: "mem-a",
      payload: mergeClassroomActivityRollupIntoReportPayload(structuredClone(emptyPayload), rollups.get(studentA)),
    },
    {
      studentId: studentB,
      studentFullName: "Student B",
      studentFullNameMasked: "S*** B",
      membershipId: "mem-b",
      payload: mergeClassroomActivityRollupIntoReportPayload(structuredClone(emptyPayload), rollups.get(studentB)),
    },
  ];

  const aggregated = aggregateClassReportFromStudentPayloads(studentPayloads);
  const studentASummary = summaryOf(studentPayloads[0].payload);
  const cohortSummary = {
    totalAnswers: Number(aggregated.cohortSummary?.totalAnswers || 0),
  };
  const sumIndividuals =
    summaryOf(studentPayloads[0].payload).totalAnswers + summaryOf(studentPayloads[1].payload).totalAnswers;

  const pass =
    cohortSummary.totalAnswers === 30 &&
    studentASummary.totalAnswers === 20 &&
    sumIndividuals === cohortSummary.totalAnswers;

  return record("8. Class report vs individual student report reconciliation", pass, {
    dateRange: "2026-05-01 .. 2026-05-18 (unit)",
    studentId: `${studentA}, ${studentB}`,
    classId: "n/a (synthetic cohort)",
    activityId: `${activityOne}, ${activityTwo}`,
    evidence: {
      studentA_answers: studentASummary.totalAnswers,
      studentB_answers: summaryOf(studentPayloads[1].payload).totalAnswers,
      cohortTotalAnswers: cohortSummary.totalAnswers,
      sumIndividuals,
      scopeNote:
        "Class cohort totals sum individual classroom-merged student payloads. Parent/learning-only baseline is intentionally excluded from teacher class reports.",
    },
    mismatchClass: pass ? null : "bug",
  });
}

async function runLiveChecks(admin, range, fixture) {
  const { from, to, fromDate, toDate } = range;
  const { dan, cls, studentId, studentRow, schoolId } = fixture;

  // 2 — teacher parent preview vs regular parent report
  try {
    const parentAgg = await aggregateParentReportPayload(admin, studentRow, fromDate, toDate);
    const parentEnriched = await enrichPayloadWithParentFacing(admin, parentAgg, studentId);
    const parentSummary = summaryOf(parentEnriched);

    const previewBuilt = await buildTeacherParentReportPreviewPayload({
      serviceRole: admin,
      teacherId: dan.id,
      studentId,
      fromDate,
      toDate,
    });
    assert.ok(previewBuilt.ok, previewBuilt.code || "preview build failed");
    const filteredPreview = await applySchoolTeacherReportFilter(admin, dan.id, previewBuilt.payload);
    assert.ok(filteredPreview.ok, filteredPreview.code || "preview filter failed");
    const previewSummary = summaryOf(filteredPreview.payload);

    const pass =
      previewSummary.totalAnswers === parentSummary.totalAnswers &&
      previewSummary.totalSessions === parentSummary.totalSessions;

    record("2. Teacher parent-preview vs regular parent report", pass, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a (learning_sessions aggregate)",
      teacherEmail: SCHOOL_TEACHER_EMAIL,
      evidence: {
        parentTotalAnswers: parentSummary.totalAnswers,
        previewTotalAnswers: previewSummary.totalAnswers,
        parentTotalSessions: parentSummary.totalSessions,
        previewTotalSessions: previewSummary.totalSessions,
        truthSource:
          "aggregateParentReportPayload + enrichPayloadWithParentFacing (parent); buildTeacherParentReportPreviewPayload (teacher preview, no classroom merge)",
      },
      mismatchClass: pass ? null : "bug",
    });
  } catch (e) {
    record("2. Teacher parent-preview vs regular parent report", false, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }

  // 3 — classroom activity only in teacher/school context
  try {
    const privateTeacher = await findAuthUserByEmail(admin, PRIVATE_TEACHER_EMAIL);
    assert.ok(privateTeacher?.id, "private teacher");

    const { data: links } = await admin
      .from("teacher_students")
      .select("student_id, students(id, full_name, grade_level, is_active)")
      .eq("teacher_id", privateTeacher.id)
      .is("archived_at", null)
      .limit(5);
    const link = links?.find((l) => l.students?.id);
    assert.ok(link?.students?.id, "private teacher linked student");

    const privateStudentId = link.students.id;
    const parentBaseline = summaryOf(
      await aggregateParentReportPayload(admin, link.students, fromDate, toDate)
    );

    const privateReport = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: privateTeacher.id,
        studentId: privateStudentId,
        fromDate,
        toDate,
      },
      { skipAudit: true }
    );
    assert.ok(privateReport.ok, privateReport.code || "private report failed");
    const privateSummary = summaryOf(privateReport.payload);

    const schoolReport = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: dan.id,
        studentId,
        fromDate,
        toDate,
      },
      { skipAudit: true, classId: cls.id }
    );
    assert.ok(schoolReport.ok, schoolReport.code || "school report failed");
    const schoolSummary = summaryOf(schoolReport.payload);
    const classroomAnswers = await countClassroomAnswers(admin, cls.id, studentId, fromDate, toDate);
    const parentSchoolBaseline = summaryOf(
      await aggregateParentReportPayload(admin, studentRow, fromDate, toDate)
    );

    const privateMatchesBaseline = privateSummary.totalAnswers === parentBaseline.totalAnswers;
    const schoolIncludesClassroom =
      classroomAnswers === 0
        ? schoolSummary.totalAnswers === parentSchoolBaseline.totalAnswers
        : schoolSummary.totalAnswers >= parentSchoolBaseline.totalAnswers + classroomAnswers;

    const pass = privateMatchesBaseline && schoolIncludesClassroom;

    record("3. Teacher student report — classroom activity scope", pass, {
      dateRange: `${from} .. ${to}`,
      studentId: `private=${privateStudentId}, school=${studentId}`,
      classId: cls.id,
      activityId: "classroom_activities in range (oracle count)",
      evidence: {
        privateTeacher: PRIVATE_TEACHER_EMAIL,
        privateReportAnswers: privateSummary.totalAnswers,
        privateBaselineAnswers: parentBaseline.totalAnswers,
        schoolTeacher: SCHOOL_TEACHER_EMAIL,
        schoolReportAnswers: schoolSummary.totalAnswers,
        schoolBaselineAnswers: parentSchoolBaseline.totalAnswers,
        classroomAnswersInRange: classroomAnswers,
        scopeRule:
          "Private/no-school: learning_sessions only. School/teacher with classId: additive classroom merge.",
      },
      mismatchClass: pass ? null : "bug",
    });
  } catch (e) {
    record("3. Teacher student report — classroom activity scope", false, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }

  // 4 — dashboard card vs teacher student report
  try {
    const built = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: dan.id,
        studentId,
        fromDate,
        toDate,
      },
      { skipAudit: true }
    );
    assert.ok(built.ok, built.code || "report build failed");

    const perm = await loadTeacherPermittedSubjects(admin, dan.id);
    assert.ok(perm.ok, perm.code || "perm load failed");
    const filtered = filterReportByPermittedSubjects(built.payload, perm.permittedSubjects);
    const afterFilter = analyzeReportSubjectReconciliation(filtered, perm.permittedSubjects);
    const subjectCardMetrics = sumMetricsFromSubjectRollups(filtered.subjects);

    const dash = await buildTeacherDashboardPayload({
      serviceRole: admin,
      teacherId: dan.id,
      rangeDays: 30,
    });
    const card = (dash.payload?.students || []).find((s) => s.studentId === studentId);

    const pass =
      card &&
      Number(card.totalSessions) === Number(filtered.summary?.totalSessions || 0) &&
      Number(card.totalAnswers) === Number(filtered.summary?.totalAnswers || 0) &&
      afterFilter.reconciled === true &&
      Number(filtered.summary?.totalAnswers || 0) === subjectCardMetrics.totalAnswers;

    record("4. Teacher dashboard card vs teacher student report", pass, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      teacherEmail: SCHOOL_TEACHER_EMAIL,
      evidence: {
        permittedSubjects: perm.permittedSubjects ? [...perm.permittedSubjects] : null,
        dashboardSessions: card?.totalSessions ?? null,
        dashboardAnswers: card?.totalAnswers ?? null,
        reportSessions: filtered.summary?.totalSessions,
        reportAnswers: filtered.summary?.totalAnswers,
        subjectRollupAnswers: subjectCardMetrics.totalAnswers,
        reconciled: afterFilter.reconciled,
      },
      mismatchClass: pass ? null : "bug",
    });
  } catch (e) {
    record("4. Teacher dashboard card vs teacher student report", false, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }

  // 5 — school admin sees all school subjects (school portal path, no subject filter)
  try {
    const manager = await findAuthUserByEmail(admin, SCHOOL_MANAGER_EMAIL);
    assert.ok(manager?.id, "school manager");

    const perm = await loadTeacherPermittedSubjects(admin, manager.id);
    assert.equal(perm.permittedSubjects, null, "school admin unrestricted");

    const visible = await verifyStudentVisibleToSchool(admin, schoolId, studentId);
    assert.ok(visible.ok, visible.code || "student not visible to school");

    const reportTeacher = await resolveSchoolReportTeacherForStudent(admin, schoolId, studentId, {
      classId: cls.id,
    });
    assert.ok(reportTeacher.ok, reportTeacher.code || "no school report teacher");

    const schoolReport = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: reportTeacher.teacherId,
        studentId,
        fromDate,
        toDate,
      },
      { skipAudit: true, classId: cls.id }
    );
    assert.ok(schoolReport.ok, schoolReport.code || "school admin path report failed");

    const unfilteredSubjects = subjectKeys(schoolReport.payload);
    const filtered = filterReportByPermittedSubjects(schoolReport.payload, null);
    const filteredSubjects = subjectKeys(filtered);

    const pass = unfilteredSubjects.join(",") === filteredSubjects.join(",");

    record("5. School admin report — all subjects", pass, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      teacherEmail: SCHOOL_MANAGER_EMAIL,
      evidence: {
        schoolId,
        reportBuiltAsTeacher: reportTeacher.teacherId,
        permittedSubjects: null,
        unfilteredSubjectKeys: unfilteredSubjects,
        filteredSubjectKeys: filteredSubjects,
        totalAnswers: summaryOf(filtered).totalAnswers,
        path: "school/students/report-data (resolveSchoolReportTeacherForStudent, no applySchoolTeacherReportFilter)",
      },
      mismatchClass: pass ? null : "bug",
    });
  } catch (e) {
    record("5. School admin report — all subjects", false, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }

  // 6 — school teacher sees only permitted subjects
  try {
    const perm = await loadTeacherPermittedSubjects(admin, dan.id);
    assert.ok(perm.ok, perm.code || "perm load failed");
    assert.ok(perm.permittedSubjects?.size, "Dan must have explicit subject grants");

    const built = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: dan.id,
        studentId,
        fromDate,
        toDate,
      },
      { skipAudit: true }
    );
    assert.ok(built.ok, built.code || "school teacher report failed");

    const before = analyzeReportSubjectReconciliation(built.payload, perm.permittedSubjects);
    const filtered = filterReportByPermittedSubjects(built.payload, perm.permittedSubjects);
    const after = analyzeReportSubjectReconciliation(filtered, perm.permittedSubjects);

    const visibleKeys = Object.keys(after.visibleSubjects || {});
    const allPermitted = visibleKeys.every((k) => perm.permittedSubjects.has(k));
    const pass = after.reconciled && allPermitted;

    record("6. School teacher report — permitted subjects only", pass, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      teacherEmail: SCHOOL_TEACHER_EMAIL,
      evidence: {
        grantedSubjects: [...perm.permittedSubjects],
        visibleSubjects: visibleKeys,
        droppedSubjects: Object.keys(before.droppedSubjects || {}),
        beforeGap: before.gap,
        afterReconciled: after.reconciled,
        summaryAnswers: filtered.summary?.totalAnswers,
      },
      mismatchClass: pass ? null : "bug",
    });
  } catch (e) {
    record("6. School teacher report — permitted subjects only", false, {
      dateRange: `${from} .. ${to}`,
      studentId,
      classId: cls.id,
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }

  // 7 — private teacher grants
  try {
    const privateTeacher = await findAuthUserByEmail(admin, PRIVATE_TEACHER_EMAIL);
    assert.ok(privateTeacher?.id, "private teacher");

    const mockSb = createPrivateGateMockServiceRole(["math"]);
    const mockMathOk = await assertActivitySubjectAllowed(mockSb, privateTeacher.id, "math", null);
    const mockEnglishDenied = await assertActivitySubjectAllowed(
      mockSb,
      privateTeacher.id,
      "english",
      null
    );
    const activityGateLogicPass = mockMathOk.ok === true && mockEnglishDenied.ok === false;

    const grants = await loadPrivateTeacherGrants(admin, privateTeacher.id);
    const perm = await loadTeacherPermittedSubjects(admin, privateTeacher.id);

    const { data: links } = await admin
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", privateTeacher.id)
      .is("archived_at", null)
      .limit(1);
    const privateStudentId = links?.[0]?.student_id;
    assert.ok(privateStudentId, "private linked student");

    const built = await buildTeacherStudentReportPayload(
      {
        serviceRole: admin,
        teacherId: privateTeacher.id,
        studentId: privateStudentId,
        fromDate,
        toDate,
      },
      { skipAudit: true }
    );
    assert.ok(built.ok, built.code || "private teacher report failed");
    const filtered = await applySchoolTeacherReportFilter(admin, privateTeacher.id, built.payload);
    assert.ok(filtered.ok, filtered.code || "private filter failed");

    const visibleSubjects = subjectKeys(filtered.payload);
    const reportFilterUsesGrants =
      perm.permittedSubjects !== null &&
      visibleSubjects.every((s) => perm.permittedSubjects.has(s));

    let liveActivityGatePass = null;
    if (grants.length > 0) {
      const granted = grants[0];
      const denied = ["english", "science", "hebrew"].find((s) => !grants.includes(s)) || "english";
      const liveGranted = await assertActivitySubjectAllowed(admin, privateTeacher.id, granted, null);
      const liveDenied = await assertActivitySubjectAllowed(admin, privateTeacher.id, denied, null);
      liveActivityGatePass = liveGranted.ok === true && liveDenied.ok === false;
    }

    const pass = activityGateLogicPass && (liveActivityGatePass === null || liveActivityGatePass === true);
    const mismatchClass = !activityGateLogicPass
      ? "bug"
      : liveActivityGatePass === false
        ? "backlog"
        : !reportFilterUsesGrants
          ? "backlog"
          : null;

    record("7. Private teacher — granted subjects only", pass, {
      dateRange: `${from} .. ${to}`,
      studentId: privateStudentId,
      classId: "n/a",
      activityId: "n/a (activity subject gate + learning report filter)",
      teacherEmail: PRIVATE_TEACHER_EMAIL,
      evidence: {
        activityGateUnitMock: {
          mathGranted: mockMathOk.ok,
          englishDenied: mockEnglishDenied.ok,
        },
        livePrivateTeacherGrants: grants,
        liveActivityGatePass,
        loadTeacherPermittedSubjects: perm.permittedSubjects ? [...perm.permittedSubjects] : null,
        visibleReportSubjects: visibleSubjects,
        learningReportFilterEnforcesGrants: reportFilterUsesGrants,
        scopeNote:
          "Activity create/read/export uses assertActivitySubjectAllowed → private_teacher_subjects. Learning progress report still uses loadTeacherPermittedSubjects (null for private teachers) until extended — classified backlog if visible subjects exceed grants.",
      },
      mismatchClass,
    });
  } catch (e) {
    record("7. Private teacher — granted subjects only", false, {
      dateRange: `${from} .. ${to}`,
      studentId: "n/a",
      classId: "n/a",
      activityId: "n/a",
      error: String(e.message || e),
      mismatchClass: "bug",
    });
  }
}

async function main() {
  const range = isoRange(30);

  checkParentFacingAuthorityUnit();

  const admin = createServiceRole();
  const fixture = await resolveSchoolFixture(admin);
  await runLiveChecks(admin, range, fixture);

  checkClassVsStudentReconciliationUnit();

  const allPass = matrix.every((r) => r.status === "PASS");

  console.log("\n=== Report Synchronization Closure ===\n");
  console.log("| # | Surface | Status | Mismatch |");
  console.log("|---|---------|--------|----------|");
  matrix.forEach((r, i) => {
    const label = String(r.surface).replace(/^\d+\.\s*/, "");
    console.log(`| ${i + 1} | ${label} | ${r.status} | ${r.mismatchClass || "—"} |`);
  });

  console.log("\n=== Detail ===\n");
  for (const row of matrix) {
    console.log(JSON.stringify(row, null, 2));
    console.log("");
  }

  console.log(`Overall: ${allPass ? "PASS" : "FAIL"}`);
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
