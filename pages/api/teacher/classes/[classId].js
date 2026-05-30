import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import {
  loadClassMembers,
  loadTeacherClassOwned,
  parsePatchClassBody,
} from "../../../../lib/teacher-server/teacher-classes.server.js";
import { requireTeacherApiContext } from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";

export default async function handler(req, res) {
  const classId = req.query?.classId;

  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_class_get",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 60,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
        }
      }

      const owned = await loadTeacherClassOwned(ctx.serviceRole, ctx.teacherId, classId);
      if (!owned.ok) {
        return sendTeacherApiError(res, owned.status, owned.code, owned.code);
      }

      const members = await loadClassMembers(ctx.serviceRole, classId);
      if (!members.ok) {
        return sendTeacherApiError(
          res,
          members.status,
          members.code,
          members.code === "db_schema_not_ready"
            ? "teacher_portal schema not yet applied"
            : "Unexpected server error"
        );
      }

      const row = owned.row;
      return res.status(200).json({
        data: {
          class: {
            classId: row.id,
            name: row.name,
            gradeLevel: row.grade_level,
            subjectFocus: row.subject_focus,
            isArchived: Boolean(row.is_archived || row.archived_at),
            createdAt: row.created_at,
          },
          members: members.members,
        },
      });
    }

    if (req.method === "PATCH") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "teacher_class_patch",
          keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
          maxAttempts: 20,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
        }
      }

      const owned = await loadTeacherClassOwned(ctx.serviceRole, ctx.teacherId, classId);
      if (!owned.ok) {
        return sendTeacherApiError(res, owned.status, owned.code, owned.code);
      }
      if (owned.row.is_archived || owned.row.archived_at) {
        return sendTeacherApiError(res, 409, "class_archived", "Class is archived");
      }

      const parsed = parsePatchClassBody(req.body);
      if (!parsed.ok) {
        return sendTeacherApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
      }

      const { data, error } = await ctx.serviceRole
        .from("teacher_classes")
        .update(parsed.patch)
        .eq("id", classId)
        .eq("teacher_id", ctx.teacherId)
        .select("id, updated_at")
        .single();

      if (error) {
        return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.teacherId,
        action: "class_updated",
        actorRole: "teacher",
        actorId: ctx.teacherId,
        metadata: { class_id: classId, fields_changed: parsed.fieldsChanged },
      });

      return res.status(200).json({
        data: { classId: data.id, updatedAt: data.updated_at },
      });
    }

    res.setHeader("Allow", "GET, PATCH");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("teacher_class_detail_error", { route: "classes/[classId]" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
