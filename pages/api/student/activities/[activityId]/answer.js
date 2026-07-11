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
import { assertStudentActivityAccessAllowed } from "../../../../../lib/learning/subject-permissions/activity-asserts.server.js";
import { normalizeOptionalString } from "../../../../../lib/learning-supabase/learning-activity";

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

    // Phase 3: accept raw + credited timing fields; fall back to legacy timeSpentMs if absent
    const rawTimeSpentMs =
      normalizeOptionalInteger(body.rawTimeSpentMs, 0, 36_000_000) ??
      normalizeOptionalInteger(body.timeSpentMs, 0, 36_000_000);
    const creditedTimeMs =
      normalizeOptionalInteger(body.creditedTimeMs, 0, 36_000_000) ?? rawTimeSpentMs;
    const timingStatus =
      typeof body.timingStatus === "string" ? body.timingStatus.slice(0, 40) : null;

    const supabase = getLearningSupabaseServiceRoleClient();
    const gradeHint = normalizeOptionalString(body.gradeLevel, 40);
    const accessGate = await assertStudentActivityAccessAllowed(supabase, {
      studentId: auth.studentId,
      studentRow: auth.student,
      activityId,
      requestedGrade: gradeHint,
    });
    if (!accessGate.ok) {
      return res.status(accessGate.status || 403).json({
        ok: false,
        error: accessGate.code,
        message: accessGate.message,
      });
    }

    const result = await recordStudentActivityAnswer(supabase, auth.studentId, activityId, {
      questionIndex,
      selectedAnswer,
      timeSpentMs: rawTimeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
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
