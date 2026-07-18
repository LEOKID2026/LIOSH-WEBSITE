import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import {
  createStudentHomeProfileTimer,
  loadStudentHomeSummaryPayload,
  trackStudentHomeOpenedEvent,
} from "../../../../lib/learning-supabase/student-home-profile-load.server.js";
import {
  createStudentApiTimingBucket,
  finishStudentApiTiming,
  timeStudentApiPhase,
} from "../../../../lib/dev/student-api-timing.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const timing = createStudentApiTimingBucket();
    const auth = await timeStudentApiPhase("resolveSession", () => getAuthenticatedStudentSession(req), timing);
    if (!auth) {
      clearStudentSessionCookie(res);
      finishStudentApiTiming(res, "/api/student/home-profile/summary", timing);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const timer = createStudentHomeProfileTimer("student-home-profile-summary");
    const payload = await timeStudentApiPhase(
      "loadSummary",
      () => loadStudentHomeSummaryPayload(supabase, auth, { timer }),
      timing,
    );

    await timeStudentApiPhase("trackOpened", async () => {
      trackStudentHomeOpenedEvent(supabase, {
        studentId: auth.studentId,
        studentSessionId: auth.studentSessionId,
        gradeLevel: auth.student?.grade_level ?? null,
      });
    }, timing);

    timer.finish({ studentId: auth.studentId, endpoint: "summary" });
    finishStudentApiTiming(res, "/api/student/home-profile/summary", timing);
    return res.status(200).json(payload);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    console.error("[student-home-profile/summary] unexpected error", msg.slice(0, 200));
    return res.status(500).json({ ok: false, error: "אירעה שגיאה זמנית. נסו שוב מאוחר יותר." });
  }
}
