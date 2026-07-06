import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import {
  setStudentSessionCookie,
  clearStudentSessionCookie,
} from "../../../../lib/learning-supabase/student-auth";
import { startGuestStudent } from "../../../../lib/guest/guest-student.server.js";
import { LIOSH_GUEST_RESUME_TOKEN_KEY } from "../../../../lib/guest/constants.js";
import {
  rejectIfGuestStartRateLimited,
  rejectIfGuestStartDeviceRateLimited,
} from "../../../../lib/guest/guest-start-rate-limit.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const supabase = getLearningSupabaseServiceRoleClient();
    const resumeToken = String(req.body?.resumeToken || "").trim() || null;

    if (rejectIfGuestStartRateLimited(req, res, resumeToken)) return;
    if (rejectIfGuestStartDeviceRateLimited(req, res, resumeToken)) return;

    const result = await startGuestStudent(supabase, { resumeToken });

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.message || result.code || "guest_start_failed",
        code: result.code,
      });
    }

    setStudentSessionCookie(res, result.sessionToken);

    return res.status(200).json({
      ok: true,
      student: result.student,
      leoNumber: result.leoNumber ?? result.student?.leo_number ?? null,
      resumeToken: result.resumeToken,
      resumeTokenStorageKey: LIOSH_GUEST_RESUME_TOKEN_KEY,
    });
  } catch (_e) {
    clearStudentSessionCookie(res);
    return res.status(500).json({ ok: false, error: "שגיאת שרת" });
  }
}
