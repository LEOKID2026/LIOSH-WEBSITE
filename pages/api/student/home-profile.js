import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import {
  buildLegacyStudentHomeProfilePayload,
  trackStudentHomeOpenedEvent,
} from "../../../lib/learning-supabase/student-home-profile-load.server.js";

function shouldLogStudentHomeDebug() {
  return process.env.NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === "true";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const payload = await buildLegacyStudentHomeProfilePayload(supabase, auth);

    if (shouldLogStudentHomeDebug()) {
      try {
        console.info("[LIOSH student-home-profile]", {
          studentId: auth.studentId,
          snapshotLevel: payload.accountSnapshot?.summaryPlayerLevel,
          snapshotStars: payload.accountSnapshot?.summaryStars,
          achievementGrantsOk: payload.achievementGrants?.ok,
        });
      } catch {
        /* ignore */
      }
    }

    trackStudentHomeOpenedEvent(supabase, {
      studentId: auth.studentId,
      studentSessionId: auth.studentSessionId,
      gradeLevel: auth.student?.grade_level ?? null,
    });

    return res.status(200).json(payload);
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    console.error("[student-home-profile] unexpected error", msg.slice(0, 200));
    return res.status(500).json({ ok: false, error: "אירעה שגיאה זמנית. נסו שוב מאוחר יותר." });
  }
}
