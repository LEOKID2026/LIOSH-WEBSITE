import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { getStudentActivityLiveState } from "../../../../../lib/teacher-server/teacher-activities.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const activityId = req.query?.activityId;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await getStudentActivityLiveState(supabase, auth.studentId, activityId);

    if (!result.ok) {
      return res.status(result.status || 500).json({ ok: false, error: result.code });
    }

    return res.status(200).json({ ok: true, ...result });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
