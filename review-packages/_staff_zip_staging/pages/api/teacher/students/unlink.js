import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import {
  parseTeacherUnlinkBody,
  unlinkTeacherStudent,
} from "../../../../lib/teacher-server/teacher-link.server.js";
import {
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

  try {
    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_students_unlink",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 10,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const parsed = parseTeacherUnlinkBody(req.body);
    if (!parsed.ok) {
      return sendTeacherApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
    }

    const unlinked = await unlinkTeacherStudent({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      linkId: parsed.linkId,
      reason: parsed.reason,
    });

    if (!unlinked.ok) {
      return sendTeacherApiError(res, unlinked.status, unlinked.code, unlinked.code);
    }

    await writeTeacherAuditRow({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      studentId: unlinked.studentId,
      action: "link_archived",
      actorRole: "teacher",
      actorId: ctx.teacherId,
      metadata: {
        student_id: unlinked.studentId,
        archived_class_memberships: unlinked.archivedClassMemberships,
        guardian_access_revoked: unlinked.guardianAccessRevoked,
      },
    });

    return res.status(200).json({
      data: {
        linkId: unlinked.linkId,
        archivedAt: unlinked.archivedAt,
        archivedClassMemberships: unlinked.archivedClassMemberships,
        guardianAccessRevoked: unlinked.guardianAccessRevoked,
      },
    });
  } catch (_e) {
    safeApiLog("teacher_students_unlink_error", { route: "unlink" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
