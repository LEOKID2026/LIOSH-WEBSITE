import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { rejectIfPublicWorksheetsGenerateRateLimited } from "../../../../lib/security/public-api-rate-limit.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity.js";
import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  insertPublicWorksheetAnalyticsEvent,
  isValidPublicWorksheetVisitSessionId,
  schedulePublicWorksheetAnalyticsWork,
} from "../../../../lib/analytics/public-worksheet-analytics.server.js";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "../../../../lib/worksheets/worksheet-generate.server.js";
import { validatePublicDemoGenerationParams } from "../../../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import { worksheetMixedTopicsErrorHe } from "../../../../lib/worksheets/worksheet-mixed-topics.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfPublicWorksheetsGenerateRateLimited(req, res)) return undefined;

  const body = readJsonBody(req);
  const validated = validatePublicDemoGenerationParams({
    subjectId: body?.subjectId,
    gradeKey: body?.gradeKey,
    topicKey: body?.topicKey,
    levelKey: body?.levelKey,
    mathPracticeFormat: body?.mathPracticeFormat,
    preferMcq: body?.preferMcq,
    inkSave: body?.inkSave,
    titleHe: body?.titleHe,
    seed: body?.seed,
    mixedTopicKeys: body?.mixedTopicKeys,
  });

  if (!validated.ok) {
    const status =
      validated.error === "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO" ? 403 : 400;
    return res.status(status).json({ ok: false, error: validated.error });
  }

  const generated = await generateWorksheetForParent(validated.normalized);

  if (!generated.ok) {
    const status = generated.status || 500;
    const mixedMsg = worksheetMixedTopicsErrorHe(String(generated.code || ""));
    return res.status(status).json({
      ok: false,
      error: generated.code,
      message: mixedMsg || generated.message,
    });
  }

  const visitSessionId = String(body?.visitSessionId || body?.visit_session_id || "").trim();
  if (isValidPublicWorksheetVisitSessionId(visitSessionId)) {
    const supabase = getLearningSupabaseServiceRoleClient();
    schedulePublicWorksheetAnalyticsWork(
      req.context,
      insertPublicWorksheetAnalyticsEvent(supabase, {
        eventName: "public_worksheet_generated",
        visitSessionId,
      })
    );
  }

  return res.status(200).json({
    ok: true,
    worksheetPayload: publicWorksheetPayload(generated.worksheetPayload),
    generation: generated.generation,
  });
}
