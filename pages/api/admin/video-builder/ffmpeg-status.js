import { safeApiLog } from "../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { checkFfmpegAvailable } from "../../../../lib/admin-server/admin-video-builder.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    const available = await checkFfmpegAvailable();
    return res.status(200).json({ data: { available } });
  } catch (_e) {
    safeApiLog("admin_video_builder_ffmpeg_status_error", { route: "admin/video-builder/ffmpeg-status" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
