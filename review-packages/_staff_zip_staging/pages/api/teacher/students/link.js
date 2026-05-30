import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { isUuid, requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { rejectIfSchoolTeacher } from "../../../../lib/teacher-server/private-teacher-guard.server.js";
import {
  linkTeacherStudentWithConsent,
  parseTeacherLinkBody,
} from "../../../../lib/teacher-server/teacher-link.server.js";
import {
  isTeacherPortalLinkEnabled,
  rejectIfTeacherPortalDisabled,
  sendTeacherApiError,
} from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  if (rejectIfTeacherPortalDisabled(res)) return undefined;
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const ctx = await requireTeacherApiContext(res, req);
  if (ctx.stopped) return undefined;

  const schoolBlock = await rejectIfSchoolTeacher(res, ctx.serviceRole, ctx.teacherId);
  if (schoolBlock.blocked) return undefined;

  if (!isTeacherPortalLinkEnabled()) {
    return sendTeacherApiError(res, 503, "link_unavailable", "Student linking is not available yet");
  }

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_students_link",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 10,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const parsed = parseTeacherLinkBody(req.body);
    if (!parsed.ok) {
      if (parsed.code === "consent_required") {
        await writeTeacherAuditRow({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.teacherId,
          studentId: isUuid(req.body?.studentId) ? String(req.body.studentId).trim() : null,
          action: "link_consent_failed",
          actorRole: "teacher",
          actorId: ctx.teacherId,
          metadata: { error_code: "consent_required" },
        });
        return sendTeacherApiError(res, 403, "consent_required", "Consent token required");
      }
      return sendTeacherApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
    }

    const linked = await linkTeacherStudentWithConsent({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: parsed.studentId,
      consentToken: parsed.consentToken,
      relationship: parsed.relationship,
      notes: parsed.notes,
      studentLimit: ctx.limits.studentLimit,
      planCode: ctx.limits.planCode,
    });

    if (!linked.ok) {
      if (linked.code === "consent_invalid") {
        await writeTeacherAuditRow({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.teacherId,
          studentId: parsed.studentId,
          action: "link_consent_failed",
          actorRole: "teacher",
          actorId: ctx.teacherId,
          metadata: { student_id: parsed.studentId, error_code: "consent_invalid" },
        });
        return sendTeacherApiError(res, 403, "consent_invalid", "Consent token is invalid");
      }
      if (linked.code === "link_limit_reached") {
        await writeTeacherAuditRow({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.teacherId,
          studentId: parsed.studentId,
          action: "link_limit_reached",
          actorRole: "teacher",
          actorId: ctx.teacherId,
          metadata: {
            student_id: parsed.studentId,
            plan_code: linked.planCode,
            student_limit: linked.studentLimit,
          },
        });
        return sendTeacherApiError(
          res,
          409,
          "link_limit_reached",
          `Student link limit reached (${linked.studentLimit})`
        );
      }
      const status = linked.status || 500;
      return sendTeacherApiError(res, status, linked.code, linked.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: parsed.studentId,
      action: "link_created",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: { student_id: parsed.studentId, relationship: parsed.relationship },
    });

    return res.status(201).json({
      data: {
        linkId: linked.linkId,
        studentId: linked.studentId,
        relationship: linked.relationship,
        linkedAt: linked.linkedAt,
      },
    });
  } catch (_e) {
    safeApiLog("teacher_students_link_error", { route: "link" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
