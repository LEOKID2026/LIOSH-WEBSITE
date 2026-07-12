import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import {
  readJsonBody,
  normalizeOptionalInteger,
} from "../../../../../lib/learning-supabase/learning-activity";
import { guardCookieMutationOrigin } from "../../../../../lib/security/api-guards.js";
import { loadActivityForStudent } from "../../../../../lib/teacher-server/teacher-activities.server.js";
import { recordParentActivityLearningVisit } from "../../../../../lib/learning-supabase/parent-activity-learning-visits.server.js";

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
    const loaded = await loadActivityForStudent(supabase, auth.studentId, activityId);
    if (!loaded.ok) {
      return res.status(loaded.status || 500).json({
        ok: false,
        error: loaded.code,
      });
    }
    if (loaded.scope !== "parent") {
      return res.status(400).json({ ok: false, error: "not_parent_activity" });
    }

    const body = readJsonBody(req);
    const questionIndex = normalizeOptionalInteger(body.questionIndex, 0, 49);
    if (questionIndex == null) {
      return res.status(400).json({ ok: false, error: "questionIndex required" });
    }

    const result = await recordParentActivityLearningVisit(
      supabase,
      auth.studentId,
      activityId,
      {
        questionIndex,
        clientVisitToken: body.clientVisitToken,
        rawDwellMs: normalizeOptionalInteger(body.rawDwellMs, 0, 36_000_000),
        creditedDwellMs: normalizeOptionalInteger(body.creditedDwellMs, 0, 600_000),
        startedAtClient: normalizeOptionalInteger(body.startedAtClient, 0, Date.now() + 60_000),
        visitKind: typeof body.visitKind === "string" ? body.visitKind : "learning",
      }
    );

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.code,
      });
    }

    return res.status(200).json({
      ok: true,
      duplicate: result.duplicate === true,
      skipped: result.skipped === true,
      creditedDwellMs: result.creditedDwellMs ?? null,
      visitId: result.visitId ?? null,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
