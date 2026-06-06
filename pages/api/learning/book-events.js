import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { processBookEventsRequest } from "../../../lib/learning-supabase/book-events.server.js";
import { readJsonBody } from "../../../lib/learning-supabase/learning-activity";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";
import { isLearningBookTrackingEnabledServer } from "../../../lib/learning/book-dwell-policy.js";

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
    const result = await processBookEventsRequest(supabase, auth.studentId, body);

    if (!result.ok) {
      return res.status(result.status || 400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.warn("[book-events] handler error", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
