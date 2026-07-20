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
  getTypeHandler,
  resolveWorksheetType,
} from "../../../../lib/worksheets/worksheet-type-registry.js";
import { validatePublicDemoGenerationParams } from "../../../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import { validatePublicWritingDemoGenerationParams } from "../../../../lib/writing/writing-public-demo-allowlist.server.js";
import { worksheetMixedTopicsErrorHe } from "../../../../lib/worksheets/worksheet-mixed-topics.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;
  if (rejectIfPublicWorksheetsGenerateRateLimited(req, res)) return undefined;

  const body = readJsonBody(req);
  const worksheetType = resolveWorksheetType(body);
  const typeHandler = getTypeHandler(worksheetType);

  if (worksheetType === "coloring") {
    const generated = typeHandler.generate({
      cardKey: body?.cardKey,
    });

    if (!generated.ok) {
      return res.status(generated.status || 500).json({
        ok: false,
        error: generated.code,
        message: generated.message,
      });
    }

    return res.status(200).json({
      ok: true,
      worksheetPayload: typeHandler.publicPayload(generated.worksheetPayload),
      generation: generated.generation,
    });
  }

  if (worksheetType === "writing") {
    const validated = validatePublicWritingDemoGenerationParams({
      ...body,
      presetId: body?.presetId || body?.demoPresetId,
      demoPresetId: body?.demoPresetId || body?.presetId,
    });
    if (!validated.ok) {
      const status =
        validated.error === "TASK_TYPE_NOT_ALLOWED_IN_PUBLIC_DEMO" ||
        validated.error === "PUBLIC_DEMO_CONTENT_NOT_ALLOWED" ||
        validated.error === "NUMBER_MODE_NOT_ALLOWED_IN_PUBLIC_DEMO" ||
        validated.error === "PUBLIC_DEMO_QUANTITY_NOT_ALLOWED"
          ? 403
          : 400;
      return res.status(status).json({ ok: false, error: validated.error });
    }

    const generated = await typeHandler.generate({
      ...validated.normalized,
      source: "public-demo",
      presetId: validated.presetId,
      demoPresetId: validated.presetId,
    });

    if (!generated.ok) {
      return res.status(generated.status || 500).json({
        ok: false,
        error: generated.code,
        message: generated.message,
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
      worksheetPayload: typeHandler.publicPayload(generated.worksheetPayload),
      generation: generated.generation,
    });
  }

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

  const generated = await typeHandler.generate(validated.normalized);

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
    worksheetPayload: typeHandler.publicPayload(generated.worksheetPayload),
    generation: generated.generation,
  });
}
