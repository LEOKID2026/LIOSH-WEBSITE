import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { assertActivitySubjectAllowed } from "../../../../lib/school-server/school-subjects.server.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  parseBooleanQuery,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import {
  createWorksheetActivity,
  listTeacherWorksheets,
  parseCreateWorksheetBody,
} from "../../../../lib/worksheet-activities/worksheet-teacher.server.js";
import { trackServerAnalyticsEvent } from "../../../../lib/analytics/track-event.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const unknown = unknownQueryParams(req.query, new Set(["classId", "status", "includeArchived"]));
      if (unknown.length) {
        return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
      }

      const classId = req.query?.classId != null ? String(req.query.classId).trim() : undefined;
      const status = req.query?.status != null ? String(req.query.status).trim() : undefined;
      const includeArchived = parseBooleanQuery(req.query?.includeArchived, false);

      const result = await listTeacherWorksheets(ctx.serviceRole, ctx.teacherId, {
        classId,
        status,
        includeArchived: includeArchived === true,
      });

      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({ data: { worksheets: result.worksheets } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = readJsonBody(req);
      const parsed = parseCreateWorksheetBody(body);
      if (!parsed.ok) {
        return sendTeacherApiError(res, parsed.status || 400, parsed.code, parsed.message || parsed.code);
      }

      const subjectGate = await assertActivitySubjectAllowed(
        ctx.serviceRole,
        ctx.teacherId,
        parsed.payload.subject,
        null
      );
      if (!subjectGate.ok) {
        return sendTeacherApiError(res, subjectGate.status, subjectGate.code, subjectGate.code);
      }

      const created = await createWorksheetActivity(ctx.serviceRole, ctx.teacherId, parsed.payload, {
        schoolId: parsed.scope === "class" ? subjectGate.membership?.schoolId ?? null : null,
      });
      if (!created.ok) {
        return sendTeacherApiError(res, created.status, created.code, created.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "worksheet_activity_created",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: {
          worksheetId: created.worksheetId,
          classId: parsed.scope === "class" ? parsed.payload.classId : null,
          assignmentScope: parsed.scope,
          studentIds: parsed.scope === "selected_students" ? parsed.payload.studentIds : undefined,
        },
      });

      void trackServerAnalyticsEvent(ctx.serviceRole, {
        eventName: "teacher_worksheet_created",
        actorType: "teacher",
        actorId: ctx.teacherId,
        subject: parsed.payload.subject,
        objectType: "worksheet_activity",
        objectId: created.worksheetId,
        idempotencyKey: `teacher_worksheet_created:${created.worksheetId}`,
        metadata: {
          assignmentScope: parsed.scope,
          questionCount: parsed.payload.questionCount,
        },
      });

      return res.status(201).json({ data: { worksheetId: created.worksheetId } });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (err) {
    safeApiLog("teacher/worksheet-activities", err);
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
