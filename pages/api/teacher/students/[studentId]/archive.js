import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../../lib/teacher-server/teacher-audit.server.js";
import { requireTeacherApiContext } from "../../../../../lib/teacher-server/teacher-request.server.js";
import { unlinkTeacherStudent } from "../../../../../lib/teacher-server/teacher-link.server.js";
import { sendTeacherApiError } from "../../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const studentId = req.query?.studentId;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (isProductionRuntime()) {
      const ip = clientIpFromRequest(req);
      const rl = consumeRateLimit({
        namespace: "teacher_student_archive",
        keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
        maxAttempts: 15,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
        return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
      }
    }

    const { data: linkRow, error: linkErr } = await ctx.serviceRole
      .from("teacher_students")
      .select("id")
      .eq("teacher_id", ctx.teacherId)
      .eq("student_id", studentId)
      .is("archived_at", null)
      .maybeSingle();

    if (linkErr) {
      return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
    }
    if (!linkRow?.id) {
      return sendTeacherApiError(res, 404, "student_not_linked", "Student not linked");
    }

    const unlinked = await unlinkTeacherStudent({
      serviceRole: ctx.serviceRole,
      teacherId: ctx.teacherId,
      linkId: linkRow.id,
      reason: "teacher_archived",
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
        source: "teacher_archive_endpoint",
      },
    });

    return res.status(200).json({
      data: {
        studentId: unlinked.studentId,
        linkId: unlinked.linkId,
        archivedAt: unlinked.archivedAt,
      },
    });
  } catch (_e) {
    safeApiLog("teacher_student_archive_error", { route: "students/[studentId]/archive" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
