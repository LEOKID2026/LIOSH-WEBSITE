import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { rejectIfSchoolTeacher } from "../../../../lib/teacher-server/private-teacher-guard.server.js";
import { createTeacherManagedStudent } from "../../../../lib/teacher-server/teacher-student-manage.server.js";
import {
  loadTeacherLimitsRow,
  resolveTeacherPlanLimits,
  sendTeacherApiError,
} from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    const schoolBlock = await rejectIfSchoolTeacher(res, ctx.serviceRole, ctx.teacherId);
    if (schoolBlock.blocked) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_create",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 15,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const limitsRow = await loadTeacherLimitsRow(ctx.serviceRole, ctx.teacherId);
    if (!limitsRow.ok || !limitsRow.limits) {
      return sendTeacherApiError(res, limitsRow.status || 404, limitsRow.code || "teacher_profile_missing", "Teacher limits not found");
    }

    const resolvedLimits = await resolveTeacherPlanLimits(ctx.serviceRole, limitsRow.limits);
    if (!resolvedLimits.ok) {
      return sendTeacherApiError(res, resolvedLimits.status, resolvedLimits.code, resolvedLimits.code);
    }

    const accessSecret = process.env.LEARNING_STUDENT_ACCESS_SECRET;
    if (!accessSecret) {
      return sendTeacherApiError(res, 503, "config_missing", "Server configuration incomplete");
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const created = await createTeacherManagedStudent({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      fullName: body.fullName,
      gradeLevel: body.gradeLevel,
      classId: body.classId,
      studentLimit: resolvedLimits.limits.studentLimit,
      maxStudentsPerClass: resolvedLimits.limits.maxStudentsPerClass,
      accessSecret,
      defaultPin: body.pin || "1234",
    });

    if (!created.ok) {
      return sendTeacherApiError(res, created.status, created.code, created.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: created.studentId,
      action: "student_created_by_teacher",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: {
        student_id: created.studentId,
        class_id: body.classId || null,
      },
    });

    return res.status(201).json({
      data: {
        studentId: created.studentId,
        fullName: created.fullName,
        gradeLevel: created.gradeLevel,
        loginUsername: created.loginUsername,
        membershipId: created.membershipId,
      },
    });
  } catch (_e) {
    safeApiLog("teacher_student_create_error", { route: "students/create" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
