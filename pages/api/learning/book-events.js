import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { processBookEventsRequest } from "../../../lib/learning-supabase/book-events.server.js";
import { readJsonBody } from "../../../lib/learning-supabase/learning-activity";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import { isLearningBookTrackingEnabledServer } from "../../../lib/learning/book-dwell-policy.js";
import { assertLearningSubjectSessionAllowed } from "../../../lib/learning/subject-permissions/session-asserts.server.js";
import { normalizePracticeGradeKey } from "../../../lib/learning-supabase/practice-grade-resolution.js";
import { trackServerAnalyticsEvent } from "../../../lib/analytics/track-event.server.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "64kb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  if (!isLearningBookTrackingEnabledServer()) {
    return res.status(503).json({ ok: false, error: "book_tracking_disabled" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const body = readJsonBody(req);
    const supabase = getLearningSupabaseServiceRoleClient();
    const events = Array.isArray(body?.events) ? body.events : [body];
    for (const event of events) {
      const subject = String(event?.subject || "").trim();
      const grade = normalizePracticeGradeKey(event?.grade);
      if (!subject || !grade) continue;
      const accessGate = await assertLearningSubjectSessionAllowed(supabase, {
        studentId: auth.studentId,
        studentRow: auth.student,
        subject,
        requestedGrade: grade,
      });
      if (!accessGate.ok) {
        return res.status(accessGate.status || 403).json({
          ok: false,
          error: accessGate.message,
          code: accessGate.code,
        });
      }
    }

    const result = await processBookEventsRequest(supabase, auth.studentId, body);

    if (!result.ok) {
      return res.status(result.status || 400).json(result);
    }
    events.forEach((event, idx) => {
      const type = String(event?.event || "");
      if (type === "book_reading_session_start") {
        void trackServerAnalyticsEvent(supabase, {
          eventName: "book_opened",
          actorType: "student",
          actorId: auth.studentId,
          studentId: auth.studentId,
          subject: event.subject,
          grade: event.grade,
          objectType: "book_reading_session",
          objectId: result.results?.[idx]?.bookReadingSessionId || result.bookReadingSessionId,
          idempotencyKey: event.clientSessionToken
            ? `book_opened:${auth.studentId}:${event.clientSessionToken}`
            : null,
          metadata: { entryPageId: event.entryPageId },
        });
      }
      if (type === "book_page_visit_start") {
        void trackServerAnalyticsEvent(supabase, {
          eventName: "book_section_opened",
          actorType: "student",
          actorId: auth.studentId,
          studentId: auth.studentId,
          subject: event.subject,
          topic: event.pageId,
          grade: event.grade,
          objectType: "book_page_visit",
          objectId: result.results?.[idx]?.bookPageVisitId || result.bookPageVisitId,
          idempotencyKey: event.clientVisitToken
            ? `book_section_opened:${auth.studentId}:${event.clientVisitToken}`
            : null,
          metadata: {
            pageId: event.pageId,
            batchId: event.batchId,
            sequenceIndex: Number(event.sequenceIndex),
          },
        });
      }
    });
    return res.status(200).json(result);
  } catch (error) {
    console.warn("[book-events] handler error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
