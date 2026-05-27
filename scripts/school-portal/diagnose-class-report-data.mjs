#!/usr/bin/env node
/**
 * Diagnose class report data for Dan Cohen geometry כיתה א׳ 2.
 */
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { createServiceRole, findAuthUserByEmail } from "./demo-school-lib.mjs";

const SCHOOL_ID = process.argv[2] || "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  const admin = createServiceRole();
  const authUser = await findAuthUserByEmail(admin, "dan@leo-k.com");
  if (!authUser?.id) throw new Error("Dan Cohen auth user not found");

  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id, display_name")
    .eq("id", authUser.id)
    .maybeSingle();
  const dan = { id: authUser.id, display_name: profile?.display_name || "דן כהן", email: authUser.email };

  const { data: classes } = await admin
    .from("teacher_classes")
    .select("id, name, grade_level, subject_focus, teacher_id")
    .eq("teacher_id", dan.id)
    .eq("subject_focus", "geometry");

  const targetName = "כיתה א׳ 2";
  const target =
    (classes || []).find((c) => String(c.name || "") === targetName) ||
    (classes || []).find((c) => String(c.name || "").includes("2"));

  if (!target) throw new Error(`geometry class not found for ${dan.display_name}`);

  const classId = target.id;
  const { count: rosterCount } = await admin
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("removed_at", null);

  const { data: teacherStudents } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", dan.id)
    .is("removed_at", null);

  const { data: activities } = await admin
    .from("classroom_activities")
    .select("id, title, closed_at, created_at, status")
    .eq("class_id", classId)
    .neq("status", "archived");

  const activityIds = (activities || []).map((a) => a.id);

  let statusRows = [];
  let attemptCount = 0;
  if (activityIds.length) {
    const { data: statuses } = await admin
      .from("classroom_activity_student_status")
      .select("student_id, answers_count, correct_count, status, submitted_at")
      .in("activity_id", activityIds);
    statusRows = statuses || [];
    const { count } = await admin
      .from("classroom_activity_attempts")
      .select("id", { count: "exact", head: true })
      .in("activity_id", activityIds);
    attemptCount = count || 0;
  }

  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", classId)
    .is("removed_at", null);
  const studentIds = (roster || []).map((r) => r.student_id);

  let learningSessions = 0;
  let answers = 0;
  if (studentIds.length) {
    const { count: ls } = await admin
      .from("learning_sessions")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds);
    const { count: ans } = await admin
      .from("answers")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds);
    learningSessions = ls || 0;
    answers = ans || 0;
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  const report = await buildTeacherClassReportPayload({
    serviceRole: admin,
    teacherId: dan.id,
    classId,
    fromDate,
    toDate,
    skipAudit: true,
  });

  const submittedStudents = new Set(
    statusRows.filter((s) => s.status === "submitted" || s.status === "timed_out").map((s) => s.student_id)
  );
  const totalClassroomAnswers = statusRows.reduce((n, s) => n + (Number(s.answers_count) || 0), 0);
  const totalClassroomCorrect = statusRows.reduce((n, s) => n + (Number(s.correct_count) || 0), 0);

  console.log(
    JSON.stringify(
      {
        teacher: { id: dan.id, name: dan.display_name, email: dan.email },
        class: target,
        teacherStudentsCount: (teacherStudents || []).length,
        teacherClassStudentsCount: rosterCount,
        classroomActivitiesCount: activityIds.length,
        classroomActivityStudentStatusRows: statusRows.length,
        studentsWithSubmittedStatus: submittedStudents.size,
        classroomActivityAttemptsCount: attemptCount,
        totalClassroomAnswers,
        totalClassroomCorrect,
        classroomAccuracyPct:
          totalClassroomAnswers > 0
            ? Number(((totalClassroomCorrect / totalClassroomAnswers) * 100).toFixed(2))
            : 0,
        learningSessionsForRoster: learningSessions,
        answersForRoster: answers,
        reportCohortSummary: report.ok ? report.payload.cohortSummary : report,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
