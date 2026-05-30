import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";
import {
  addAssignmentsToWorksheet,
  parseStudentIdsArray,
  removeAssignmentFromWorksheet,
  resolveWorksheetAssignmentScope,
} from "../../../../../lib/worksheet-activities/worksheet-assignments.server.js";
import { loadTeacherWorksheetOwned } from "../../../../../lib/worksheet-activities/worksheet-teacher.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const owned = await loadTeacherWorksheetOwned(ctx.serviceRole, ctx.teacherId, worksheetId);
    if (!owned.ok) {
      return sendTeacherApiError(res, owned.status, owned.code, owned.code);
    }

    const assignmentScope = resolveWorksheetAssignmentScope(owned.row);
    if (assignmentScope !== "selected_students") {
      return sendTeacherApiError(res, 400, "validation_failed", "assignments only for selected_students scope");
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = readJsonBody(req);
      const studentIds = parseStudentIdsArray(body?.studentIds ?? body?.student_ids);
      if (!studentIds) {
        return sendTeacherApiError(res, 400, "validation_failed", "studentIds required");
      }

      const result = await addAssignmentsToWorksheet(
        ctx.serviceRole,
        ctx.teacherId,
        worksheetId,
        studentIds
      );
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "worksheet_assignments_added",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { worksheetId, added: result.added, studentIds },
      });

      return res.status(200).json({ data: { worksheetId, added: result.added } });
    }

    if (req.method === "DELETE") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = readJsonBody(req);
      const studentId = String(body?.studentId || body?.student_id || "").trim();
      if (!studentId) {
        return sendTeacherApiError(res, 400, "validation_failed", "studentId required");
      }

      const result = await removeAssignmentFromWorksheet(ctx.serviceRole, worksheetId, studentId);
      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "worksheet_assignment_removed",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { worksheetId, studentId },
      });

      return res.status(200).json({ data: { worksheetId, studentId, removed: true } });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/worksheet-activities/assignments", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
