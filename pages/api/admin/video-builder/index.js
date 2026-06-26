import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  createEmptyProjectPayload,
  createVideoProject,
  listVideoProjects,
  parseVideoProjectBody,
} from "../../../../lib/admin-server/admin-video-builder.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const includeArchived =
        req.query?.includeArchived === "1" || req.query?.includeArchived === "true";
      const projects = await listVideoProjects({ includeArchived });
      return res.status(200).json({ data: { projects } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const parsed = parseVideoProjectBody(req.body?.name ? req.body : createEmptyProjectPayload());
      if (!parsed.ok) {
        return sendAdminApiError(res, 400, parsed.code, parsed.message);
      }

      const created = await createVideoProject(parsed.payload);
      if (!created.ok) {
        return sendAdminApiError(res, 500, "create_failed", "יצירת סרטון נכשלה");
      }
      return res.status(201).json({ data: { project: created.project } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("admin_video_builder_index_error", { route: "admin/video-builder" });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
