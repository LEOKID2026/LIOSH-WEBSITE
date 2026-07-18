import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { buildStudentGameAccessPayload } from "../../../lib/games/server/game-access.server.js";
import {
  createStudentApiTimingBucket,
  finishStudentApiTiming,
  timeStudentApiPhase,
} from "../../../lib/dev/student-api-timing.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const timing = createStudentApiTimingBucket();

  try {
    const auth = await timeStudentApiPhase("resolveSession", () => getAuthenticatedStudentSession(req), timing);
    if (!auth) {
      clearStudentSessionCookie(res);
      finishStudentApiTiming(res, "/api/student/game-access", timing);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const payload = await timeStudentApiPhase(
      "buildPayload",
      () => buildStudentGameAccessPayload(supabase, auth.studentId),
      timing,
    );

    finishStudentApiTiming(res, "/api/student/game-access", timing);
    return res.status(200).json({ ok: true, ...payload });
  } catch (_e) {
    finishStudentApiTiming(res, "/api/student/game-access", timing);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
