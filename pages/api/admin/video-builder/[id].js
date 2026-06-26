import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  deleteVideoProject,
  getVideoProject,
  parseVideoProjectBody,
  setVideoProjectArchived,
  updateVideoProject,
} from "../../../../lib/admin-server/admin-video-builder.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return sendAdminApiError(res, 400, "missing_id", "missing_id");
    }

    if (req.method === "GET") {
      const result = await getVideoProject(id);
      if (!result.ok) {
        return sendAdminApiError(res, 404, result.code, result.message);
      }
      return res.status(200).json({ data: { project: result.project } });
    }

    if (req.method === "PUT") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = parseVideoProjectBody(req.body);
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, parsed.message);
      }

      const updated = await updateVideoProject(id, parsed.payload);
      if (!updated.ok) {
        return sendAdminApiError(res, 404, updated.code, updated.message);
      }
      return res.status(200).json({ data: { project: updated.project } });
    }

    if (req.method === "PATCH") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      if (typeof req.body?.archived !== "boolean") {
        return sendAdminApiError(res, 400, "validation_failed", "נדרש שדה archived (boolean)");
      }

      const updated = await setVideoProjectArchived(id, req.body.archived);
      if (!updated.ok) {
        return sendAdminApiError(res, 404, updated.code, updated.message);
      }
      return res.status(200).json({ data: { project: updated.project } });
    }

    if (req.method === "DELETE") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const deleted = await deleteVideoProject(id);
      if (!deleted.ok) {
        return sendAdminApiError(res, 404, deleted.code, deleted.message);
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_video_builder_id_error", { route: "admin/video-builder/[id]" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
