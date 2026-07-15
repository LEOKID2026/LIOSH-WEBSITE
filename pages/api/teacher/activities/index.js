import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import {
  assertDiscussionActivitySubjectAllowed,
  assertActivitySubjectAllowed,
} from "../../../../lib/school-server/school-subjects.server.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { loadTeacherClassOwned } from "../../../../lib/teacher-server/teacher-classes.server.js";
import {
  createClassroomActivity,
  listTeacherActivities,
  parseCreateActivityBody,
} from "../../../../lib/teacher-server/teacher-activities.server.js";
import {
  parseBooleanQuery,
  rejectIfTeacherFeatureDisabled,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import {
  classGradeKeysMatch,
  resolveCanonicalGradeKey,
} from "../../../../lib/teacher-portal/teacher-class-grade.js";
import { trackServerAnalyticsEvent } from "../../../../lib/analytics/track-event.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;
    if (rejectIfTeacherFeatureDisabled(res, ctx.limits, "classroom_activities")) return undefined;

    if (req.method === "GET") {
      const unknown = unknownQueryParams(req.query, new Set(["classId", "classIds", "status", "includeArchived"]));
      if (unknown.length) {
        return sendTeacherApiError(res, 400, "validation_failed", "Unknown query parameters");
      }

      const classId = req.query?.classId != null ? String(req.query.classId).trim() : undefined;
      const rawClassIds = req.query?.classIds;
      /** @type {string[]} */
      let classIds = [];
      if (Array.isArray(rawClassIds)) {
        classIds = rawClassIds.map((id) => String(id).trim()).filter(Boolean);
      } else if (rawClassIds != null) {
        classIds = String(rawClassIds)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
      const status = req.query?.status != null ? String(req.query.status).trim() : undefined;
      const includeArchived = parseBooleanQuery(req.query?.includeArchived, false);

      const result = await listTeacherActivities(ctx.serviceRole, ctx.teacherId, {
        classId,
        classIds: classIds.length ? classIds : undefined,
        status,
        includeArchived: includeArchived === true,
      });

      if (!result.ok) {
        return sendTeacherApiError(res, result.status, result.code, result.code);
      }

      return res.status(200).json({ data: { activities: result.activities } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_activity_create",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 30,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "יותר מדי בקשות - המתן מעט ונסה שוב");
        }
      }

      const body = readJsonBody(req);
      const parsed = parseCreateActivityBody(body);
      if (!parsed.ok) {
        const status = parsed.status || 400;
        return sendTeacherApiError(res, status, parsed.code, parsed.message || parsed.code);
      }

      let subjectGate;
      const owned = await loadTeacherClassOwned(
        ctx.serviceRole,
        ctx.teacherId,
        parsed.payload.classId
      );
      if (!owned.ok) {
        return sendTeacherApiError(res, owned.status, owned.code, owned.code);
      }

      const bodyGradeKey = resolveCanonicalGradeKey(body.gradeLevel);
      const classGradeKey = resolveCanonicalGradeKey(owned.row.grade_level);
      if (!classGradeKeysMatch(body.gradeLevel, owned.row.grade_level)) {
        return sendTeacherApiError(
          res,
          403,
          "grade_mismatch",
          "רמת הכיתה חסרה או אינה תואמת לכיתה המשויכת"
        );
      }

      if (owned.row.subject_focus && parsed.payload.subject !== owned.row.subject_focus) {
        return sendTeacherApiError(
          res,
          403,
          "subject_mismatch",
          "המקצוע שנבחר אינו תואם לכיתה המשויכת"
        );
      }

      const classGrade = classGradeKey || null;
      if (parsed.payload.mode === "discussion") {
        subjectGate = await assertDiscussionActivitySubjectAllowed(
          ctx.serviceRole,
          ctx.teacherId,
          parsed.payload.subject,
          classGrade
        );
      } else {
        subjectGate = await assertActivitySubjectAllowed(
          ctx.serviceRole,
          ctx.teacherId,
          parsed.payload.subject,
          classGrade
        );
      }
      if (!subjectGate.ok) {
        return sendTeacherApiError(res, subjectGate.status, subjectGate.code, subjectGate.code);
      }

      const created = await createClassroomActivity(ctx.serviceRole, ctx.teacherId, parsed, {
        schoolId: subjectGate.membership?.schoolId ?? null,
        ownedRow: owned.row,
      });
      if (!created.ok) {
        return sendTeacherApiError(res, created.status, created.code, created.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "activity_created",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: {
          activityId: created.activityId,
          classId: parsed.payload.classId,
          mode: parsed.payload.mode,
          questionCount: parsed.payload.questionCount,
        },
      });

      void trackServerAnalyticsEvent(ctx.serviceRole, {
        eventName: "teacher_activity_created",
        actorType: "teacher",
        actorId: ctx.teacherId,
        subject: parsed.payload.subject,
        topic: parsed.payload.topic,
        grade: classGrade,
        objectType: "classroom_activity",
        objectId: created.activityId,
        idempotencyKey: `teacher_activity_created:${created.activityId}`,
        metadata: {
          mode: parsed.payload.mode,
          questionCount: parsed.payload.questionCount,
        },
      });

      return res.status(201).json({
        data: { activityId: created.activityId },
      });
    }

    return sendTeacherApiError(res, 405, "method_not_allowed", "שיטת בקשה לא נתמכת");
  } catch (err) {
    safeApiLog("teacher/activities", err);
    return sendTeacherApiError(res, 500, "internal_error", "שגיאת שרת - נסה שוב");
  }
}
