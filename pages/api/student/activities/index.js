import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { listStudentActivities } from "../../../../lib/teacher-server/teacher-activities.server.js";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await listStudentActivities(supabase, auth.studentId);

    if (!result.ok) {
      const status = result.status || 500;
      if (result.code === "db_schema_not_ready") {
        return res.status(200).json({ ok: true, activities: [] });
      }
      return res.status(status).json({ ok: false, error: result.code });
    }

    return res.status(200).json({ ok: true, activities: result.activities });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
