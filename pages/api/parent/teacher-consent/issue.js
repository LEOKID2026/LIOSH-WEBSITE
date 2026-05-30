import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import {
  getParentConsentServiceRole,
  issueTeacherStudentConsentToken,
  parseParentConsentIssueBody,
} from "../../../../lib/parent-server/teacher-consent.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const parsed = parseParentConsentIssueBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: "validation_failed" });
    }

    const serviceRole = getParentConsentServiceRole();
    const issued = await issueTeacherStudentConsentToken(serviceRole, {
      parentUserId: ctx.parentUserId,
      teacherId: parsed.teacherId,
      studentId: parsed.studentId,
    });

    if (!issued.ok) {
      const status = issued.status || 500;
      return res.status(status).json({
        ok: false,
        error: issued.code || "internal_error",
      });
    }

    return res.status(201).json({
      ok: true,
      data: {
        consentTokenId: issued.consentTokenId,
        consentToken: issued.consentTokenPlaintext,
        teacherId: issued.teacherId,
        studentId: issued.studentId,
        expiresAt: issued.expiresAt,
        shownOnceWarning:
          "Consent token is shown once only. Deliver to the teacher through a secure channel.",
      },
    });
  } catch (_e) {
    safeApiLog("parent_teacher_consent_issue_error", { route: "issue" });
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
