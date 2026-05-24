import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { resolveAuthenticatedParentUserId } from "../../../../lib/parent-server/policy-acceptance.server.js";
import {
  getParentConsentServiceRole,
  parseParentConsentIssueBody,
  revokeTeacherStudentConsentTokens,
} from "../../../../lib/parent-server/teacher-consent.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const auth = await resolveAuthenticatedParentUserId(req.headers.authorization || "");
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = parseParentConsentIssueBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: "validation_failed" });
    }

    const serviceRole = getParentConsentServiceRole();
    const revoked = await revokeTeacherStudentConsentTokens(serviceRole, {
      parentUserId: auth.parentUserId,
      teacherId: parsed.teacherId,
      studentId: parsed.studentId,
    });

    if (!revoked.ok) {
      return res.status(revoked.status || 500).json({
        ok: false,
        error: revoked.code || "internal_error",
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        teacherId: parsed.teacherId,
        studentId: parsed.studentId,
        revokedCount: revoked.revokedCount,
      },
    });
  } catch (_e) {
    safeApiLog("parent_teacher_consent_revoke_error", { route: "revoke" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
