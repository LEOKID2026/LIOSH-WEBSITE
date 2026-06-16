import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../../lib/learning-supabase/student-auth";
import { recordStudentPdfOpenAndGetUrl } from "../../../../../lib/worksheet-activities/worksheet-student.server.js";
import { trackServerAnalyticsEvent } from "../../../../../lib/analytics/track-event.server.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");

  const worksheetId = String(req.query?.worksheetId || "").trim();

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const fileRole = req.query?.fileRole != null ? String(req.query.fileRole).trim() : "worksheet";
    if (fileRole !== "worksheet") {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const result = await recordStudentPdfOpenAndGetUrl(
      supabase,
      auth.studentId,
      worksheetId,
      "worksheet"
    );

    if (!result.ok) {
      return res.status(result.status || 500).json({ ok: false, error: result.code });
    }

    void trackServerAnalyticsEvent(supabase, {
      eventName: "worksheet_opened",
      actorType: "student",
      actorId: auth.studentId,
      studentId: auth.studentId,
      sessionId: auth.studentSessionId,
      objectType: "worksheet_activity",
      objectId: worksheetId,
      idempotencyKey: `worksheet_opened:${auth.studentId}:${worksheetId}:${new Date().toISOString().slice(0, 13)}`,
      metadata: { fileRole: "worksheet" },
    });

    return res.status(200).json({
      ok: true,
      signedUrl: result.signedUrl,
      expiresIn: result.expiresIn,
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
