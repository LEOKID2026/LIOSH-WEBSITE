import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { consumeRateLimit, clientIpFromRequest } from "../../../../lib/security/in-memory-rate-limit.js";
import { isProductionRuntime } from "../../../../lib/security/production-guard.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import {
  createParentActivity,
  listParentActivitiesForParent,
  parseCreateParentActivityBody,
} from "../../../../lib/parent-server/parent-activity.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const studentId = String(req.query?.studentId || "").trim();
      if (!isUuid(studentId)) {
        return res.status(400).json({ ok: false, error: "studentId must be a UUID" });
      }

      const result = await listParentActivitiesForParent(
        ctx.serviceRole,
        ctx.parentUserId,
        studentId
      );

      if (!result.ok) {
        const status = result.status || 500;
        return res.status(status).json({ ok: false, error: result.code || "internal_error" });
      }

      return res.status(200).json({ ok: true, activities: result.activities });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      if (isProductionRuntime()) {
        const ip = clientIpFromRequest(req);
        const rl = consumeRateLimit({
          namespace: "parent_activity_create",
          keys: [`ip:${ip}`, `parent:${ctx.parentUserId}`],
          maxAttempts: 30,
          windowMs: 60_000,
        });
        if (!rl.allowed) {
          if (rl.retryAfterSec) res.setHeader("Retry-After", String(rl.retryAfterSec));
          return res.status(429).json({ ok: false, error: "rate_limited" });
        }
      }

      const body = readJsonBody(req);
      const parsed = parseCreateParentActivityBody(body);
      if (!parsed.ok) {
        const status = parsed.status || 400;
        return res.status(status).json({
          ok: false,
          error: parsed.message || parsed.code || "validation_failed",
        });
      }

      const created = await createParentActivity(
        ctx.serviceRole,
        ctx.parentUserId,
        parsed.payload.studentId,
        parsed
      );

      if (!created.ok) {
        const status = created.status || 500;
        return res.status(status).json({
          ok: false,
          error: created.message || created.code || "internal_error",
        });
      }

      return res.status(201).json({ ok: true, activityId: created.activityId });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    safeApiLog("parent/activities", err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
