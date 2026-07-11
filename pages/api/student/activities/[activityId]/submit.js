import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { submitStudentActivity } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";
import { assertStudentActivityAccessAllowed } from "../../../../../lib/learning/subject-permissions/activity-asserts.server.js";

export default async function handler(req, res) {
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
    const accessGate = await assertStudentActivityAccessAllowed(supabase, {
      studentId: auth.studentId,
      studentRow: auth.student,
      activityId,
    });
    if (!accessGate.ok) {
      return res.status(accessGate.status || 403).json({
        ok: false,
        error: accessGate.code,
        message: accessGate.message,
      });
    }

    const result = await submitStudentActivity(supabase, auth.studentId, activityId);

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.code,
        message: result.message,
      });
    }

    return res.status(200).json({
      ok: true,
      scorePct: result.scorePct,
      answersCount: result.answersCount,
      correctCount: result.correctCount,
      questionCount: result.questionCount,
      revealAnswers: result.revealAnswers,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
