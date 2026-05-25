import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { startStudentActivity } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  const activityId = req.query?.activityId;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await startStudentActivity(supabase, auth.studentId, activityId);

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.code,
        message: result.message,
      });
    }

    return res.status(200).json({ ok: true, ...result });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
