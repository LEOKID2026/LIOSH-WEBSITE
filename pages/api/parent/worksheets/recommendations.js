import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { isUuid } from "../../../../lib/teacher-server/teacher-request.server.js";
import { verifyParentOwnsStudent } from "../../../../lib/parent-server/parent-activity.server.js";
import {
  fetchWorksheetRecommendationsForStudent,
  WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE,
} from "../../../../lib/worksheets/worksheet-recommendation-engine.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const studentId = String(req.query?.studentId || "").trim();
  if (!isUuid(studentId)) {
    return res.status(400).json({ ok: false, error: "studentId must be a UUID" });
  }

  const owned = await verifyParentOwnsStudent(ctx.serviceRole, ctx.parentUserId, studentId);
  if (!owned.ok) {
    const status = owned.status || 403;
    return res.status(status).json({ ok: false, error: owned.code || "forbidden" });
  }

  const result = await fetchWorksheetRecommendationsForStudent(ctx.serviceRole, {
    id: owned.student.id,
    grade_level: owned.student.grade_level,
  });

  if (!result.ok) {
    const status = result.status || 500;
    return res.status(status).json({ ok: false, error: result.code });
  }

  return res.status(200).json({
    ok: true,
    hasEvidence: result.hasEvidence,
    emptyMessageHe: result.hasEvidence ? null : WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE,
    recommendations: result.recommendations,
  });
}
