import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { readJsonBody } from "../../../../../lib/learning-supabase/learning-activity.js";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";
import { submitStudentWorksheetAnswers } from "../../../../../lib/worksheet-activities/worksheet-student.server.js";

export default async function handler(req, res) {
  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return undefined;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const body = readJsonBody(req);
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await submitStudentWorksheetAnswers(
      supabase,
      auth.studentId,
      worksheetId,
      answers
    );

    if (!result.ok) {
      return res.status(result.status || 500).json({ ok: false, error: result.code });
    }

    return res.status(200).json({
      ok: true,
      submitted: true,
      gradingStatus: result.gradingStatus,
      hasManualQuestions: result.hasManualQuestions,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
