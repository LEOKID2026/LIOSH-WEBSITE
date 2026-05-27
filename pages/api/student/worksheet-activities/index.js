import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { listStudentWorksheets } from "../../../../lib/worksheet-activities/worksheet-student.server.js";

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
    const result = await listStudentWorksheets(supabase, auth.studentId);

    if (!result.ok) {
      if (result.code === "db_schema_not_ready") {
        return res.status(200).json({ ok: true, worksheets: [] });
      }
      return res.status(result.status || 500).json({ ok: false, error: result.code });
    }

    return res.status(200).json({ ok: true, worksheets: result.worksheets });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
