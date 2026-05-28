import { loadClassMembers } from "../teacher-server/teacher-classes.server.js";
import { maskStudentFullName } from "../teacher-server/teacher-students.server.js";
import { resolveWorksheetAssignmentScope } from "./worksheet-assignments.server.js";
import { mapWorksheetActivityRow, mapWorksheetStudentStatusRow, worksheetDbError } from "./worksheet-shared.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} worksheetId
 */
async function loadSelectedStudentMembers(serviceRole, worksheetId) {
  const { data, error } = await serviceRole
    .from("worksheet_student_assignments")
    .select("student_id, students!inner(full_name)")
    .eq("worksheet_activity_id", worksheetId);

  if (error) return worksheetDbError(error);

  const members = (data || []).map((row) => ({
    studentId: row.student_id,
    studentFullName: row.students?.full_name || "",
    studentFullNameMasked: maskStudentFullName(row.students?.full_name),
  }));

  return { ok: true, members };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Record<string, unknown>} activityRow
 * @param {{ maskNames?: boolean }} [opts]
 */
export async function buildWorksheetActivityReport(serviceRole, activityRow, opts = {}) {
  const worksheet = mapWorksheetActivityRow(activityRow);
  const assignmentScope = resolveWorksheetAssignmentScope(activityRow);

  const members =
    assignmentScope === "selected_students"
      ? await loadSelectedStudentMembers(serviceRole, worksheet.worksheetId)
      : await loadClassMembers(serviceRole, String(activityRow.class_id));

  if (!members.ok) return members;

  const { data: statuses, error } = await serviceRole
    .from("worksheet_student_status")
    .select("*")
    .eq("worksheet_activity_id", worksheet.worksheetId);

  if (error) return worksheetDbError(error);

  const statusByStudent = new Map((statuses || []).map((s) => [s.student_id, s]));

  let pdfOpenedCount = 0;
  let markedCompleteCount = 0;
  let digitalSubmittedCount = 0;
  let pendingReviewCount = 0;
  let checkedCount = 0;
  let publishedCount = 0;
  /** @type {number[]} */
  const publishedScores = [];

  /** @type {Array<Record<string, unknown>>} */
  const studentsNeedingAttention = [];

  const studentRows = (members.members || []).map((m) => {
    const st = statusByStudent.get(m.studentId);
    const row = st ? mapWorksheetStudentStatusRow(st) : {
      studentId: m.studentId,
      pdfFirstOpenedAt: null,
      pdfLastOpenedAt: null,
      pdfOpenCount: 0,
      markedCompletedAt: null,
      digitalSubmittedAt: null,
      gradingStatus: "not_submitted",
      autoScorePct: null,
      finalScorePct: null,
      teacherCheckedAt: null,
      teacherPublishedAt: null,
    };

    if (row.pdfOpenCount > 0) pdfOpenedCount += 1;
    if (row.markedCompletedAt) markedCompleteCount += 1;
    if (row.digitalSubmittedAt) digitalSubmittedCount += 1;
    if (row.gradingStatus === "pending_review" || row.gradingStatus === "partially_checked") {
      pendingReviewCount += 1;
    }
    if (row.gradingStatus === "checked") checkedCount += 1;
    if (row.gradingStatus === "published") {
      publishedCount += 1;
      if (row.finalScorePct != null) publishedScores.push(row.finalScorePct);
    }

    if (!row.pdfOpenCount) {
      studentsNeedingAttention.push({ studentId: m.studentId, reason: "did_not_open" });
    } else if (
      worksheet.worksheetMode !== "pdf_only" &&
      row.gradingStatus === "not_submitted"
    ) {
      studentsNeedingAttention.push({ studentId: m.studentId, reason: "did_not_submit" });
    } else if (row.gradingStatus === "pending_review" || row.gradingStatus === "partially_checked") {
      studentsNeedingAttention.push({ studentId: m.studentId, reason: "pending_review" });
    }

    return {
      studentId: m.studentId,
      studentName: opts.maskNames ? m.studentFullNameMasked : m.studentFullName,
      ...row,
    };
  });

  const totalStudents = studentRows.length;
  const classAveragePct =
    publishedScores.length > 0
      ? Math.round(
          (publishedScores.reduce((a, b) => a + b, 0) / publishedScores.length) * 100
        ) / 100
      : null;

  return {
    ok: true,
    report: {
      ...worksheet,
      totalStudents,
      pdfOpenedCount,
      markedCompleteCount,
      digitalSubmittedCount,
      pendingReviewCount,
      checkedCount,
      publishedCount,
      classAveragePct,
      studentsNeedingAttention,
      studentRows,
    },
  };
}

/**
 * School manager summary (aggregate only).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Record<string, unknown>} activityRow
 */
export async function buildSchoolWorksheetSummary(serviceRole, activityRow) {
  const report = await buildWorksheetActivityReport(serviceRole, activityRow, { maskNames: true });
  if (!report.ok) return report;

  const r = report.report;
  const total = r.totalStudents || 0;
  const pct = (n) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  return {
    ok: true,
    summary: {
      worksheetId: r.worksheetId,
      title: r.title,
      subject: r.subject,
      status: r.status,
      worksheetMode: r.worksheetMode,
      totalStudents: total,
      pdfOpenedPct: pct(r.pdfOpenedCount),
      submittedPct: pct(
        r.worksheetMode === "pdf_only" ? r.markedCompleteCount : r.digitalSubmittedCount
      ),
      checkedPct: pct(r.checkedCount + r.publishedCount),
      publishedPct: pct(r.publishedCount),
    },
  };
}
