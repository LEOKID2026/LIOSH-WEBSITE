import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { buildStudentGameAccessPayload } from "../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
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
    const payload = await buildStudentGameAccessPayload(supabase, auth.studentId);

    return res.status(200).json({ ok: true, ...payload });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
