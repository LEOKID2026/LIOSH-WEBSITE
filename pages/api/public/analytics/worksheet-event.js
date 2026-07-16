import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { rejectIfPublicWorksheetAnalyticsEventRateLimited } from "../../../../lib/security/public-api-rate-limit.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  insertPublicWorksheetAnalyticsEvent,
  isValidPublicWorksheetVisitSessionId,
  schedulePublicWorksheetAnalyticsWork,
} from "../../../../lib/analytics/public-worksheet-analytics.server.js";

const PAGE_VIEW_EVENT = "public_worksheet_page_viewed";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfPublicWorksheetAnalyticsEventRateLimited(req, res)) return undefined;

  const body = readJsonBody(req);
  const visitSessionId = String(body?.visitSessionId || body?.visit_session_id || "").trim();

  if (!isValidPublicWorksheetVisitSessionId(visitSessionId)) {
    return res.status(400).json({ ok: false, error: "invalid_visit_session" });
  }

  // Reject any client-supplied event name — this endpoint records page views only.
  if (body?.eventName != null || body?.event_name != null) {
    return res.status(400).json({ ok: false, error: "invalid_event" });
  }

  const supabase = getLearningSupabaseServiceRoleClient();
  schedulePublicWorksheetAnalyticsWork(
    req.context,
    insertPublicWorksheetAnalyticsEvent(supabase, {
      eventName: PAGE_VIEW_EVENT,
      visitSessionId,
    })
  );

  return res.status(200).json({ ok: true });
}
