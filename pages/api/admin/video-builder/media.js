import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  listMediaAssets,
  parseMediaUpload,
  saveMediaAsset,
} from "../../../../lib/admin-server/admin-video-builder.server.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const assets = await listMediaAssets();
      return res.status(200).json({ data: { assets } });
    }

    if (req.method === "POST") {
      const parsed = await parseMediaUpload(req);
      if (!parsed.ok) {
        return sendAdminApiError(res, parsed.status || 400, parsed.code, parsed.message);
      }

      const saved = await saveMediaAsset(parsed.buffer, parsed.contentType, parsed.originalFilename);
      if (!saved.ok) {
        return sendAdminApiError(res, 400, saved.code, saved.message);
      }
      return res.status(201).json({ data: { asset: saved.asset } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_video_builder_media_error", { route: "admin/video-builder/media" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
