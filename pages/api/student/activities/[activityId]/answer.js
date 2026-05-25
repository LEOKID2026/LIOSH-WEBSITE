import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import {
  readJsonBody,
  normalizeOptionalInteger,
} from "../../../../../lib/learning-supabase/learning-activity";
import { recordStudentActivityAnswer } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";

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

    const body = readJsonBody(req);
    const questionIndex = normalizeOptionalInteger(body.questionIndex, 0, 49);
    if (questionIndex == null) {
      return res.status(400).json({ ok: false, error: "questionIndex required" });
    }

    const selectedAnswer =
      body.selectedAnswer != null ? String(body.selectedAnswer).trim().slice(0, 1000) : "";

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await recordStudentActivityAnswer(supabase, auth.studentId, activityId, {
      questionIndex,
      selectedAnswer,
      timeSpentMs: normalizeOptionalInteger(body.timeSpentMs, 0, 36000000),
      hintsUsed: normalizeOptionalInteger(body.hintsUsed, 0, 1000) ?? 0,
      explanationViewed: body.explanationViewed === true,
    });

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.code,
        message: result.message,
      });
    }

    return res.status(200).json({
      ok: true,
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      answersCount: result.answersCount,
      correctCount: result.correctCount,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
