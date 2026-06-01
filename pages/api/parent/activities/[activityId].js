import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import { getParentActivityDetailForParent } from "../../../../lib/parent-server/parent-activity.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const activityId = String(req.query?.activityId || "").trim();
    if (!isUuid(activityId)) {
      return res.status(400).json({ ok: false, error: "activityId must be a UUID" });
    }

    const result = await getParentActivityDetailForParent(
      ctx.serviceRole,
      ctx.parentUserId,
      activityId
    );

    if (!result.ok) {
      const status = result.status || 500;
      return res.status(status).json({
        ok: false,
        error: result.code || "internal_error",
        message: result.message,
      });
    }

    return res.status(200).json({
      ok: true,
      activity: result.activity,
      attempts: result.attempts,
      questions: result.questions,
    });
  } catch (err) {
    safeApiLog("parent/activities/[activityId]", err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
