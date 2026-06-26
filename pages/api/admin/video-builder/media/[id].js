import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import { deleteMediaAsset } from "../../../../../lib/admin-server/admin-video-builder.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const assetId = String(req.query.id || "").trim();
    if (!assetId) {
      return sendAdminApiError(res, 400, "missing_id", "מזהה קובץ חסר");
    }

    if (req.method === "DELETE") {
      const result = await deleteMediaAsset(assetId);
      if (!result.ok) {
        return sendAdminApiError(res, result.code === "not_found" ? 404 : 400, result.code, result.message);
      }
      return res.status(200).json({ data: { deleted: true, id: assetId } });
    }

    res.setHeader("Allow", "DELETE");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_video_builder_media_delete_error", { route: "admin/video-builder/media/[id]" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
