import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  exportVideoProjectMp4,
  getVideoProject,
} from "../../../../../lib/admin-server/admin-video-builder.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return sendAdminApiError(res, 400, "missing_id", "missing_id");
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
    }

    const projectResult = await getVideoProject(id);
    if (!projectResult.ok) {
      return sendAdminApiError(res, 404, projectResult.code, projectResult.message);
    }

    const exported = await exportVideoProjectMp4(projectResult.project);
    if (!exported.ok) {
      const status = exported.code === "ffmpeg_unavailable" ? 503 : 500;
      return sendAdminApiError(res, status, exported.code, exported.message);
    }

    return res.status(200).json({
      data: {
        outputMp4Path: exported.outputMp4Path,
        outputUrl: exported.outputUrl,
      },
    });
  } catch (_e) {
    safeApiLog("admin_video_builder_export_error", { route: "admin/video-builder/[id]/export" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
