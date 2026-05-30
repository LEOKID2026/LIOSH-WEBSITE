import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import {
  createTeacherClass,
  listTeacherClasses,
  parseCreateClassBody,
} from "../../../../lib/teacher-server/teacher-classes.server.js";
import {
  parseBooleanQuery,
  requireTeacherApiContext,
  unknownQueryParams,
} from "../../../../lib/teacher-server/teacher-request.server.js";
import { sendTeacherApiError } from "../../../../lib/teacher-server/teacher-session.server.js";
import { rejectIfSchoolTeacher } from "../../../../lib/teacher-server/private-teacher-guard.server.js";

async function handleGet(req, res, ctx) {
  const unknown = unknownQueryParams(req.query, new Set(["includeArchived"]));
  if (unknown.length) {
    return sendTeacherApiError(res, 400, "unknown_query_param", "Unknown query parameter");
  }

  const includeArchived = parseBooleanQuery(req.query?.includeArchived, false);
  if (includeArchived === null) {
    return sendTeacherApiError(res, 400, "validation_failed", "Invalid includeArchived");
  }

  if (isProductionRuntime()) {
    const ip = clientIpFromRequest(req);
    const rl = consumeRateLimit({
      namespace: "teacher_classes_list",
      keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
      maxAttempts: 60,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
      return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
    }
  }

  const listed = await listTeacherClasses(ctx.serviceRole, ctx.teacherId, {
    includeArchived,
    classLimit: ctx.limits.classLimit,
    planCode: ctx.limits.planCode,
  });

  if (!listed.ok) {
    return sendTeacherApiError(
      res,
      listed.status,
      listed.code,
      listed.code === "db_schema_not_ready"
        ? "teacher_portal schema not yet applied"
        : "Unexpected server error"
    );
  }

  return res.status(200).json({ data: { classes: listed.classes, limits: listed.limits } });
}

async function handlePost(req, res, ctx) {
  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  const schoolBlock = await rejectIfSchoolTeacher(res, ctx.serviceRole, ctx.teacherId);
  if (schoolBlock.blocked) return undefined;

  if (isProductionRuntime()) {
    const ip = clientIpFromRequest(req);
    const rl = consumeRateLimit({
      namespace: "teacher_classes_create",
      keys: [`ip:${ip}`, `teacher:${ctx.teacherId}`],
      maxAttempts: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
      return sendTeacherApiError(res, 429, "rate_limited", "Too many requests");
    }
  }

  const parsed = parseCreateClassBody(req.body);
  if (!parsed.ok) {
    return sendTeacherApiError(res, 400, parsed.code, `Invalid ${parsed.field}`);
  }

  const created = await createTeacherClass(ctx.serviceRole, ctx.teacherId, {
    name: parsed.name,
    gradeLevel: parsed.gradeLevel,
    subjectFocus: parsed.subjectFocus,
    classLimit: ctx.limits.classLimit,
  });

  if (!created.ok) {
    const msg =
      created.code === "class_limit_reached"
        ? `Class limit reached (${created.classLimit})`
        : created.code === "class_limit_zero"
          ? "Classes are disabled for this plan"
          : created.code === "db_schema_not_ready"
            ? "teacher_portal schema not yet applied"
            : "Unexpected server error";
    return sendTeacherApiError(res, created.status, created.code, msg);
  }

  await writeTeacherAuditRow({
    serviceRole: ctx.serviceRole,
    teacherId: ctx.teacherId,
    action: "class_created",
    actorRole: "teacher",
    actorId: ctx.teacherId,
    metadata: { class_id: created.classId },
  });

  return res.status(201).json({
    data: { classId: created.classId, createdAt: created.createdAt },
  });
}

export default async function handler(req, res) {
  try {
    const ctx = await requireTeacherApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      return handleGet(req, res, ctx);
    }
    if (req.method === "POST") {
      return handlePost(req, res, ctx);
    }

    res.setHeader("Allow", "GET, POST");
    return sendTeacherApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("teacher_classes_index_error", { route: "classes" });
    return sendTeacherApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
