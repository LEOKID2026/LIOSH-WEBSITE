import { safeApiLog } from "../../../../../lib/security/safe-log.js";
import { isUuid } from "../../../../../lib/teacher-server/teacher-request.server.js";
import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  isAdminManualCoinCreditEnabled,
  adminManualCoinCreditDisabledResponse,
} from "../../../../../lib/admin-server/admin-manual-coin-credit.flags.js";
import { buildStudentSupportTimeline } from "../../../../../lib/admin-server/admin-student-support-activity.server.js";

function guardManualCoinCreditApi(res) {
  if (!isAdminManualCoinCreditEnabled()) {
    res.status(404).json(adminManualCoinCreditDisabledResponse());
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!guardManualCoinCreditApi(res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = req.query?.studentId;
  if (!isUuid(String(studentId))) {
    return sendAdminApiError(res, 400, "validation_failed", "studentId must be a UUID");
  }

  try {
    const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));

    const events = await buildStudentSupportTimeline(ctx.serviceRole, String(studentId), {
      limit,
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      data: {
        studentId: String(studentId),
        events: events.map((ev) => ({
          atIso: ev.atIso,
          atLabelHe: ev.atLabelHe,
          kind: ev.kind,
          lineHe: ev.lineHe,
          detailLineHe: ev.detailLineHe,
          displayLineHe: ev.displayLineHe,
        })),
      },
    });
  } catch (_e) {
    safeApiLog("admin_student_recent_events_error", {
      route: "admin/students/[studentId]/recent-events",
    });
    return sendAdminApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
