import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { loadGuestLearningAccessRows } from "../../../../lib/guest/guest-access-policy.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    try {
      const rows = await loadGuestLearningAccessRows(ctx.serviceRole);
      const topics = (rows || []).map((row) => ({
        id: row.id,
        subject: row.subject,
        topic: row.topic,
        guestPlayable: row.guest_playable === true,
        sortPriority: row.sort_priority ?? 0,
      }));
      return res.status(200).json({ ok: true, topics });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  if (req.method === "PUT") {
    try {
      const topics = Array.isArray(req.body?.topics) ? req.body.topics : [];
      for (const item of topics) {
        const subject = String(item?.subject || "").trim();
        const topic = String(item?.topic || "").trim();
        if (!subject || !topic) continue;
        await ctx.serviceRole.from("guest_learning_access").upsert(
          {
            subject,
            topic,
            guest_playable: item.guestPlayable === true || item.guest_playable === true,
            sort_priority: Number(item.sortPriority ?? item.sort_priority ?? 0) || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "subject,topic" }
        );
      }
      return res.status(200).json({ ok: true });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
